'use strict'

const { test } = require('brittle')
const Bitdeer = require('../../lib/bitdeer')

function createMockServer () {
  const subscriptions = {}
  return {
    subscribe (topic, handler) {
      subscriptions[topic] = handler
    },
    publish (opts) {
      // no-op for tests
    },
    _subscriptions: subscriptions,
    _deliver (topic, payload) {
      const handler = subscriptions[topic]
      if (handler) handler({ topic, payload: Buffer.from(JSON.stringify(payload)) }, () => {})
    }
  }
}

test('Bitdeer constructor requires server', (t) => {
  let threw = false
  try {
    const c = new Bitdeer({ containerId: 'C1', type: 'm56' })
    if (c) t.fail('expected constructor to throw')
  } catch (err) {
    threw = true
    t.ok(err.message.includes('undefined') || err.message.includes('subscribe'), 'throws when server missing')
  }
  t.ok(threw, 'constructor threw')
})

test('Bitdeer constructor subscribes to topics', (t) => {
  const server = createMockServer()
  const c = new Bitdeer({ server, containerId: 'C1', type: 'm56' })
  t.ok(c._queue, 'has task queue')
  t.ok(c.lastMessageCache, 'has lastMessageCache')
  const topics = Object.keys(server._subscriptions)
  t.ok(topics.length > 0, 'subscribed to at least one topic')
  t.ok(topics.some(t => t.includes('RunningInfo')), 'has RunningInfo topic')
})

test('Bitdeer getters return from lastMessageCache', async (t) => {
  const server = createMockServer()
  const c = new Bitdeer({ server, containerId: 'C1', type: 'm56' })
  c.lastMessageCache.deviceInformation = { foo: 'bar' }
  c.lastMessageCache.PDUSocketInformation = []
  c.lastMessageCache.containerPowerInformation = {}
  c.lastMessageCache.temperatureInformation = {}
  c.lastMessageCache.UPSInformation = {}
  c.lastMessageCache.tactics = {}
  c.lastMessageCache.alarmTemperatures = {}
  c.lastMessageCache.setTemperatures = {}
  c.lastMessageCache.tankStatus = {}
  c.lastMessageCache.exhaustFanStatus = {}

  t.alike(await c.getDeviceInformation(), { foo: 'bar' }, 'getDeviceInformation')
  t.alike(await c.getPDUSocketInformation(), [], 'getPDUSocketInformation')
})

test('Bitdeer _getStatus returns error when isErrored', (t) => {
  const server = createMockServer()
  const c = new Bitdeer({ server, containerId: 'C1', type: 'm56' })
  t.is(c._getStatus(true), 'error', 'isErrored -> error')
})

test('Bitdeer _getStatus returns running when running and not errored', (t) => {
  const server = createMockServer()
  const c = new Bitdeer({ server, containerId: 'C1', type: 'm56' })
  c.lastMessageCache.runningState = true
  t.is(c._getStatus(false), 'running', 'runningState -> running')
})

test('Bitdeer _getStatus returns stopped when not running', (t) => {
  const server = createMockServer()
  const c = new Bitdeer({ server, containerId: 'C1', type: 'm56' })
  c.lastMessageCache.runningState = false
  t.is(c._getStatus(false), 'stopped', 'not running -> stopped')
})

test('Bitdeer setPumpState sends message and returns success', async (t) => {
  let published = null
  const server = createMockServer()
  server.publish = (opts) => { published = opts }
  const c = new Bitdeer({ server, containerId: 'C1', type: 'm56', conf: { delay: 0 } })
  const result = await c.setPumpState('oil', 0, true)
  t.alike(result, { success: true }, 'returns success')
  t.ok(published, 'publish was called')
  t.ok(published.topic.includes('PumpOperate'), 'PumpOperate topic')
  const payload = JSON.parse(published.payload)
  t.is(payload.Operate, '1', 'Operate 1 for true')
})

test('Bitdeer setPumpState Operate 0 for false', async (t) => {
  let published = null
  const server = createMockServer()
  server.publish = (opts) => { published = opts }
  const c = new Bitdeer({ server, containerId: 'C1', type: 'm56', conf: { delay: 0 } })
  await c.setPumpState('water', 1, false)
  const payload = JSON.parse(published.payload)
  t.is(payload.Operate, '0', 'Operate 0 for false')
})

test('Bitdeer switchSocket calls publish for each op', async (t) => {
  const published = []
  const server = createMockServer()
  server.publish = (opts) => { published.push(opts) }
  const c = new Bitdeer({
    server,
    containerId: 'C1',
    type: 'm56',
    conf: { delay: 0 }
  })
  c.lastMessageCache.PDUSocketInformation = []
  const result = await c.switchSocket([['1-1', '1', true]])
  t.alike(result, { success: true }, 'returns success')
  t.ok(published.length >= 1, 'at least one publish')
  t.ok(published.some(p => p.topic.includes('PDUOperate')), 'PDUOperate topic')
})

test('Bitdeer resetAlarm sends RunningOperate AlarmReset', async (t) => {
  let published = null
  const server = createMockServer()
  server.publish = (opts) => { published = opts }
  const c = new Bitdeer({ server, containerId: 'C1', type: 'm56', conf: { delay: 0 } })
  await c.resetAlarm()
  const payload = JSON.parse(published.payload)
  t.is(payload.Operate, 'AlarmReset', 'AlarmReset')
})

test('Bitdeer switchContainer sends AutoRun/AutoStop', async (t) => {
  let published = null
  const server = createMockServer()
  server.publish = (opts) => { published = opts }
  const c = new Bitdeer({ server, containerId: 'C1', type: 'm56', conf: { delay: 0 } })
  await c.switchContainer(true)
  t.is(JSON.parse(published.payload).Operate, 'AutoRun', 'AutoRun')
  await c.switchContainer(false)
  t.is(JSON.parse(published.payload).Operate, 'AutoStop', 'AutoStop')
})

test('Bitdeer extends Container with _type container', (t) => {
  const server = createMockServer()
  const c = new Bitdeer({ server, containerId: 'C1', type: 'm56' })
  t.is(c._type, 'container', '_type is container')
})
