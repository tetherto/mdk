'use strict'

const test = require('brittle')
const fs = require('fs')
const path = require('path')
const os = require('os')
const ThingManager = require('../../lib/thing.manager.js')

function createTempDir () {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'thing.manager.test-'))
}

function createTestConfig (rootDir) {
  const configDir = path.join(rootDir, 'config')
  fs.mkdirSync(configDir, { recursive: true })

  const baseThing = {
    collectSnapsItvMs: 60000,
    rotateLogsItvMs: 120000,
    refreshLogsCacheItvMs: 60000,
    thingQueryConcurrency: 25,
    storeSnapItvMs: 300000,
    collectSnapTimeoutMs: 120000,
    logRotateMaxLength: 1000,
    logKeepCount: 3
  }
  fs.writeFileSync(path.join(configDir, 'base.thing.json'), JSON.stringify(baseThing))
  fs.writeFileSync(path.join(configDir, 'common.json'), JSON.stringify({}))
}

class TestThingManager extends ThingManager {
  async collectThingSnap () {
    return { success: true, stats: { status: 'ok' }, config: {} }
  }

  setupThingHook0 (thg) {
    thg.ctrl = {
      getRealtimeData: () => ({ success: true, stats: {}, config: {} }),
      ping: () => 'pong'
    }
  }

  _getThingBaseType () {
    return 'thing'
  }
}

test('ThingManager integration: all methods with relevant data', async (t) => {
  const tmpDir = createTempDir()
  const storeDir = path.join(tmpDir, 'store')
  const configRoot = path.join(tmpDir, 'app')
  fs.mkdirSync(storeDir, { recursive: true })
  fs.mkdirSync(configRoot, { recursive: true })
  createTestConfig(configRoot)

  const conf = {}
  const ctx = {
    rack: 'test-rack',
    storeDir,
    root: configRoot
  }

  const tm = new TestThingManager(conf, ctx)

  t.teardown(() => {
    tm.stop(() => {})
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    } catch (_) {}
  })

  await tm.init()

  const thingId = 'thing-' + Date.now()

  let result = await tm.registerThing({
    id: thingId,
    info: { name: 'Test Thing', pos: 'A1' },
    opts: {},
    user: 'testuser',
    comment: 'Initial registration'
  })
  t.is(result, 1, 'registerThing returns 1')

  let list = tm.listThings({ limit: 10 })
  t.ok(Array.isArray(list), 'listThings returns array')
  t.ok(list.length >= 1, 'has at least one thing')
  let thg = list.find(x => x.id === thingId)
  t.ok(thg, 'registered thing in list')
  t.alike(thg.info?.name, 'Test Thing', 'thing info preserved')

  result = await tm.updateThing({
    id: thingId,
    info: { container: 'main' },
    user: 'testuser',
    comment: 'Updated container'
  })
  t.is(result, 1, 'updateThing returns 1')

  list = tm.listThings({ limit: 10, status: true })
  t.ok(Array.isArray(list), 'listThings with status returns array')
  thg = list.find(x => x.id === thingId)
  t.ok(thg?.last !== undefined, 'last snapshot included')

  let settings = await tm.getSettings()
  t.ok(typeof settings === 'object', 'getSettings returns object')
  const updated = await tm.saveSettingsEntries({ foo: 'bar', num: 42 })
  t.is(updated.foo, 'bar', 'saveSettingsEntries merges entries')
  t.is(updated.num, 42, 'numeric value preserved')
  settings = await tm.getSettings()
  t.is(settings.foo, 'bar', 'getSettings returns persisted data')

  result = await tm.saveThingComment({
    thingId,
    comment: 'A new comment',
    user: 'testuser'
  })
  t.is(result, 1, 'saveThingComment returns 1')

  list = tm.listThings({ limit: 10 })
  thg = list.find(x => x.id === thingId)
  t.ok(Array.isArray(thg?.comments), 'thing has comments')
  t.ok(thg.comments.some(c => c.comment === 'A new comment'), 'comment present')

  const comment = thg.comments.find(c => c.comment === 'A new comment')
  t.ok(comment, 'comment exists')
  result = await tm.editThingComment({
    thingId,
    id: comment.id,
    comment: 'Edited comment',
    user: 'testuser'
  })
  t.is(result, 1, 'editThingComment returns 1')

  const queryResult = await tm.queryThing({ id: thingId, method: 'ping', params: [] })
  t.is(queryResult, 'pong', 'queryThing returns ctrl result')

  const applyResult = await tm.applyThings({
    method: 'ping',
    params: [],
    query: { id: { $in: [thingId] } }
  })
  t.ok(typeof applyResult === 'number', 'applyThings returns number')
  t.ok(applyResult >= 1, 'at least one thing processed')

  await tm.collectSnaps()
  list = tm.listThings({ limit: 10, status: true })
  thg = list.find(x => x.id === thingId)
  t.ok(thg?.last?.snap, 'snap collected')
  t.ok(thg.last.snap.success, 'snap success')

  const logs = await tm.tailLog({ key: 'thing-5m', tag: thingId, limit: 10 })
  t.ok(Array.isArray(logs), 'tailLog returns array')

  const histLogs = await tm.getHistoricalLogs({ logType: 'info', limit: 10 })
  t.ok(Array.isArray(histLogs), 'getHistoricalLogs info returns array')

  const thgForData = tm.mem.things[thingId]
  if (thgForData) {
    await tm.saveThingData(thgForData)
    t.pass('saveThingData completes')
  }

  try {
    const alertLogs = await tm.getHistoricalLogs({ logType: 'alerts', limit: 10 })
    t.ok(Array.isArray(alertLogs), 'getHistoricalLogs alerts returns array')
  } catch (e) {
    t.ok(e.message === 'ERR_LOG_NOTFOUND' || e.message.includes('ERR'), 'getHistoricalLogs alerts handles error')
  }

  const rotateResult = await tm.rotateLogs()
  t.ok(Array.isArray(rotateResult), 'rotateLogs returns array')

  const refreshResult = await tm.refreshLogsCache()
  t.ok(refreshResult === undefined || Array.isArray(refreshResult), 'refreshLogsCache completes')

  list = tm.listThings({ limit: 10 })
  thg = list.find(x => x.id === thingId)
  const editedComment = thg.comments.find(c => c.comment === 'Edited comment')
  t.ok(editedComment, 'edited comment exists')
  result = await tm.deleteThingComment({
    thingId,
    id: editedComment.id,
    user: 'testuser'
  })
  t.is(result, 1, 'deleteThingComment returns 1')

  result = await tm.forgetThings({ query: { id: { $in: [thingId] } } })
  t.is(result, 1, 'forgetThings returns 1')

  list = tm.listThings({ limit: 10 })
  thg = list.find(x => x.id === thingId)
  t.absent(thg, 'thing removed after forget')
})
