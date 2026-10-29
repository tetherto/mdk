'use strict'

// withActor(token): the same Kernel actions, each carrying the operator's
// access token as `envelope.actor` beside the client's own `auth`. Hermetic,
// via the { transport } and { tokenSource } injection seams.

const test = require('brittle')
const { createRawMdkClient, createMdkClient } = require('../../index')
const { ACTIONS } = require('../../../kernel/lib/protocol/actions')

function captureTransport (reply = () => ({ ok: true })) {
  const t = { requests: [] }
  t.connect = async () => {}
  t.close = async () => {}
  t.request = async (envelope) => {
    t.requests.push(envelope)
    return reply(envelope)
  }
  return t
}

function tokenSource () {
  let n = 0
  return { resets: 0, async getToken () { return `app-token-${n}` }, reset () { this.resets++; n++ } }
}

test('withActor - sends the operator token beside the app token', async (t) => {
  const transport = captureTransport()
  const client = createRawMdkClient({ transport, tokenSource: tokenSource() })
  await client.connect()

  await client.withActor('user-token').sendCommand('d1', 'reboot', { delay: 1 })
  const env = transport.requests[0]
  t.is(env.action, ACTIONS.COMMAND_REQUEST)
  t.is(env.auth, 'app-token-0')
  t.is(env.actor, 'user-token')
  t.alike(env.payload, { command: 'reboot', params: { delay: 1 } }, 'no self-asserted requester')

  await client.sendCommand('d1', 'reboot')
  t.absent('actor' in transport.requests[1], 'the app client itself acts as the app')
})

test('withActor - the same Kernel actions, nothing else, and no way to read the token back', async (t) => {
  const client = createRawMdkClient({ transport: captureTransport(), tokenSource: tokenSource() })
  const view = client.withActor('user-token')
  for (const name of ['listWorkers', 'pullTelemetry', 'sendCommand', 'getCommandStatus', 'pushAction', 'voteAction', 'cancelActionsBatch']) {
    t.is(typeof view[name], 'function', name)
  }
  for (const name of ['connect', 'close', 'withActor', 'sendWorkerCommand']) t.absent(view[name], `no ${name}`)
  t.absent(JSON.stringify(Object.values(view).map(String)).includes('user-token'))
  t.ok(Object.isFrozen(view))
  t.exception(() => client.withActor(''), /ERR_MDK_CLIENT_ACTOR_REQUIRED/)
})

test('withActor - an expired app token is renewed; a refused operator token is thrown, not retried', async (t) => {
  const source = tokenSource()
  const transport = captureTransport((env) => env.auth === 'app-token-0'
    ? { error: 'ERR_KERNEL_TOKEN_INVALID: ERR_IDENTITY_TOKEN_EXPIRED' }
    : { error: 'ERR_KERNEL_ACTOR_INVALID: ERR_IDENTITY_TOKEN_REVOKED' })
  const client = createRawMdkClient({ transport, tokenSource: source })
  await t.exception(client.withActor('user-token').listWorkers(), /ERR_KERNEL_ACTOR_INVALID/)
  t.is(source.resets, 1)
  t.alike(transport.requests.map((e) => [e.auth, e.actor]), [['app-token-0', 'user-token'], ['app-token-1', 'user-token']])
})

test('withActor - on the auto-connecting client it is synchronous and connects on first use', async (t) => {
  const transport = captureTransport()
  const mdkClient = createMdkClient({}, { transport, tokenSource: tokenSource() })
  const view = mdkClient.withActor('user-token')
  await view.pullState('d2')
  t.is(transport.requests[0].actor, 'user-token')
  t.is(transport.requests[0].deviceId, 'd2')
  await t.exception(view.connect(), /ERR_MDK_CLIENT_NO_SUCH_METHOD/)
  t.exception(() => mdkClient.withActor(null), /ERR_MDK_CLIENT_ACTOR_REQUIRED/)
})
