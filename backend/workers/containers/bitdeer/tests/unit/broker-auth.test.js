'use strict'

const fs = require('fs')
const net = require('net')
const path = require('path')
const { test } = require('brittle')
const { Aedes } = require('aedes')
const mqtt = require('mqtt')
const Bitdeer = require('../../lib/bitdeer')
const { secureBroker, validateCredentials } = require('../../lib/broker-auth')

const CID = 'D40-1'
const OTHER = 'D40-2'

async function startBroker (t, { credentials } = {}) {
  const aedes = await Aedes.createBroker()
  secureBroker(aedes, {
    containerIds: new Set([CID, OTHER]),
    credentials,
    telemetryTopics: Bitdeer.TELEMETRY_TOPICS,
    commandTopics: Bitdeer.COMMAND_TOPICS
  })
  const server = net.createServer(aedes.handle)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  t.teardown(async () => {
    await new Promise((resolve) => aedes.close(resolve))
    await new Promise((resolve) => server.close(resolve))
  })
  return { aedes, port: server.address().port }
}

function connect (t, port, opts = {}) {
  return new Promise((resolve, reject) => {
    const client = mqtt.connect(`mqtt://127.0.0.1:${port}`, { reconnectPeriod: 0, ...opts })
    t.teardown(() => client.end(true))
    client.once('connect', () => resolve(client))
    client.once('error', reject)
  })
}

// Resolves with the SUBACK code; mqtt.js reports a refusal (128) as an error.
function subscribe (client, topic) {
  return new Promise((resolve, reject) => {
    client.subscribe(topic, (err, granted) => {
      if (err && err.packet && err.packet.granted) return resolve(err.packet.granted[0])
      err ? reject(err) : resolve(granted[0].qos)
    })
  })
}

// Resolves with the topics the broker delivered to `aedes.subscribe` within the wait.
function delivered (aedes, topics, ms = 150) {
  const seen = []
  for (const topic of topics) {
    aedes.subscribe(topic, (packet, cb) => { seen.push(packet.topic); cb() }, () => {})
  }
  return () => new Promise((resolve) => setTimeout(() => resolve(seen), ms))
}

test('COMMAND_TOPICS covers every topic _sendOperationMessage publishes', (t) => {
  const src = fs.readFileSync(path.join(__dirname, '../../lib/bitdeer.js'), 'utf8')
  const used = [...new Set([...src.matchAll(/_sendOperationMessage\('([A-Za-z]+)'/g)].map((m) => m[1]))]
  t.ok(used.length > 0, 'found operation topics')
  t.alike(used.filter((topic) => !Bitdeer.COMMAND_TOPICS.includes(topic)), [], 'no unlisted command topic')
})

test('malformed payload is dropped without throwing', async (t) => {
  const { aedes, port } = await startBroker(t)
  const container = new Bitdeer({ server: aedes, containerId: CID, type: 'm56', conf: {} })
  const client = await connect(t, port)

  await new Promise((resolve) => client.publish(`${CID}RunningInfo`, 'not-json{', resolve))
  await new Promise((resolve) => setTimeout(resolve, 100))
  t.is(container.lastMessageCache.runningInfo, undefined, 'nothing cached')
  t.is(container._lastSeen ?? null, null, 'garbage does not mark the container online')

  await new Promise((resolve) => client.publish(`${CID}RunningInfo`, JSON.stringify({ RunningState: '1' }), resolve))
  await new Promise((resolve) => setTimeout(resolve, 100))
  t.ok(container.isThingOnline(), 'a later valid message is still processed')
})

test('anonymous client: own telemetry and commands only', async (t) => {
  const { aedes, port } = await startBroker(t)
  const collect = delivered(aedes, [`${CID}RunningInfo`, `${OTHER}RunningInfo`, `${CID}PDUOperate`])
  const client = await connect(t, port)

  t.is(await subscribe(client, '#'), 128, 'wildcard subscribe refused')
  t.is(await subscribe(client, '$SYS/#'), 128, '$SYS subscribe refused')
  t.is(await subscribe(client, `${CID}PDUOperate`), 0, 'own command topic granted')
  t.is(await subscribe(client, `${OTHER}PDUOperate`), 128, 'other container command topic refused')
  t.is(await subscribe(client, 'UNKNOWNPDUOperate'), 128, 'unregistered container refused')

  client.publish(`${CID}RunningInfo`, '{}')
  const seen = await collect()
  t.alike(seen, [`${CID}RunningInfo`], 'own telemetry delivered')
})

test('anonymous client is disconnected for publishing a command topic', async (t) => {
  const { aedes, port } = await startBroker(t)
  const collect = delivered(aedes, [`${CID}PDUOperate`])
  const client = await connect(t, port)
  const closed = new Promise((resolve) => client.once('close', resolve))

  client.publish(`${CID}PDUOperate`, '{"PDU":"on"}')
  await closed
  t.alike(await collect(), [], 'command never reached subscribers')
})

test('unknown topics under own prefix are accepted and ignored', async (t) => {
  const { aedes, port } = await startBroker(t)
  const collect = delivered(aedes, [`${CID}RunningInfo`])
  const client = await connect(t, port)
  let closed = false
  client.once('close', () => { closed = true })

  client.publish('heartbeat', '{}')
  client.publish(`${CID}Heartbeat`, '{}', { retain: true })
  client.publish(`${CID}RunningInfo`, '{}')
  t.alike(await collect(), [`${CID}RunningInfo`], 'telemetry still delivered after unknown topics')
  t.absent(closed, 'client stays connected')

  client.publish(`${CID}Version`, '{}')
  await new Promise((resolve) => setTimeout(resolve, 100))
  t.absent(closed, 'still connected once bound')
})

test('bound client is disconnected for an unknown topic under another container', async (t) => {
  const { port } = await startBroker(t)
  const client = await connect(t, port)
  const closed = new Promise((resolve) => client.once('close', resolve))
  t.is(await subscribe(client, `${CID}PDUOperate`), 0, 'bound to first container')

  client.publish(`${OTHER}Heartbeat`, '{}')
  await closed
  t.pass('disconnected')
})

test('anonymous client cannot switch to another container', async (t) => {
  const { aedes, port } = await startBroker(t)
  const collect = delivered(aedes, [`${OTHER}RunningInfo`])
  const client = await connect(t, port)
  t.is(await subscribe(client, `${CID}PDUOperate`), 0, 'bound to first container')

  client.publish(`${OTHER}RunningInfo`, '{}')
  t.alike(await collect(), [], 'spoofed telemetry for another container dropped')
})

test('credentials: login required and bound to its container', async (t) => {
  const credentials = { [CID]: { username: 'd40-1', password: 's3cret' } }
  const { aedes, port } = await startBroker(t, { credentials })

  await t.exception(connect(t, port), /Bad username or password|Not authorized/i, 'anonymous refused')
  await t.exception(connect(t, port, { username: 'd40-1', password: 'wrong' }), /Bad username or password/i, 'wrong password refused')

  const collect = delivered(aedes, [`${CID}RunningInfo`])
  const client = await connect(t, port, { username: 'd40-1', password: 's3cret' })
  t.is(await subscribe(client, `${OTHER}PDUOperate`), 128, 'cannot subscribe as another container')
  t.is(await subscribe(client, `${CID}PDUOperate`), 0, 'own command topic granted')
  client.publish(`${CID}RunningInfo`, '{}')
  t.alike(await collect(), [`${CID}RunningInfo`], 'own telemetry delivered')
})

test('validateCredentials rejects malformed maps', (t) => {
  t.execution(() => validateCredentials(undefined), 'undefined is allowed')
  t.execution(() => validateCredentials({ a: { username: 'u', password: 'p' } }), 'valid map')
  for (const bad of [null, [], 'x', { a: null }, { a: { username: 'u' } }, { a: { username: '', password: 'p' } },
    { a: { username: 'u', password: 'p' }, b: { username: 'u', password: 'q' } }]) {
    t.exception(() => validateCredentials(bad), /ERR_MQTT_CREDENTIALS_INVALID/, JSON.stringify(bad))
  }
})
