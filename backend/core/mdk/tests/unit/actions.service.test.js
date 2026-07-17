'use strict'

const test = require('brittle')
const ActionsService = require('../../lib/services/actions.service')

const DEVICES = [
  { id: 'dev-1', tags: ['t-miner', 'container-c1'], info: { container: 'c1' } },
  { id: 'dev-2', tags: ['t-miner', 'container-c2'], info: { container: 'c2' } }
]

function createService (opts = {}) {
  const svc = new ActionsService({
    listDevices: () => DEVICES,
    validateWriteAction: opts.validateWriteAction
  })
  svc.whitelistActions([['setPowerMode', 1], ['reboot', 2]])
  return svc
}

test('non-whitelisted action returns no calls', async (t) => {
  const svc = createService()
  const res = await svc.getWriteCalls({ query: {}, action: 'factoryReset', params: [] })
  t.alike(res, { calls: [], reqVotes: 1 })
})

test('whitelisted action returns matching devices with reqVotes', async (t) => {
  const svc = createService()
  const res = await svc.getWriteCalls({ query: {}, action: 'reboot', params: [] })
  t.is(res.reqVotes, 2)
  t.alike(res.calls.map((c) => c.id).sort(), ['dev-1', 'dev-2'])
  t.alike(res.calls[0].tags, DEVICES.find((d) => d.id === res.calls[0].id).tags)
})

test('query filters the targeted devices (mingo)', async (t) => {
  const svc = createService()
  const res = await svc.getWriteCalls({
    query: { 'info.container': 'c1' },
    action: 'setPowerMode',
    params: ['low']
  })
  t.alike(res.calls.map((c) => c.id), ['dev-1'])
})

test('rackActionId short-circuits to a single worker-level call', async (t) => {
  const svc = createService()
  const res = await svc.getWriteCalls({ query: {}, action: 'reboot', params: [], rackActionId: 'rack-1' })
  t.alike(res.calls, [{ id: 'rack-1', tags: [] }])
})

test('validateWriteAction failure propagates', async (t) => {
  const svc = createService({
    validateWriteAction: async (dev, action, params) => {
      if (params[0] === 'bogus') throw new Error('ERR_SET_POWER_MODE_INVALID')
      return 1
    }
  })

  await t.exception(
    svc.getWriteCalls({ query: {}, action: 'setPowerMode', params: ['bogus'] }),
    /ERR_SET_POWER_MODE_INVALID/
  )

  const ok = await svc.getWriteCalls({ query: {}, action: 'setPowerMode', params: ['low'] })
  t.is(ok.calls.length, 2)
})

test('delistActions removes an action from the whitelist', async (t) => {
  const svc = createService()
  svc.delistActions(['reboot'])
  const res = await svc.getWriteCalls({ query: {}, action: 'reboot', params: [] })
  t.alike(res, { calls: [], reqVotes: 1 })
})
