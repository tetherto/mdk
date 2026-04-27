'use strict'

const path = require('path')
const { test } = require('brittle')
const ContainerManager = require('../../lib/container.manager')

const pkgRoot = path.join(__dirname, '../..')

test('ContainerManager getThingType returns "container"', (t) => {
  const ctx = { rack: 'test-rack' }
  const mgr = new ContainerManager({}, ctx)
  t.is(mgr.getThingType(), 'container', 'getThingType is container')
})

test('ContainerManager _getThingBaseType returns "container"', (t) => {
  const ctx = { rack: 'test-rack' }
  const mgr = new ContainerManager({}, ctx)
  t.is(mgr._getThingBaseType(), 'container', '_getThingBaseType is container')
})

test('ContainerManager constructor requires ctx.rack', (t) => {
  t.exception(() => new ContainerManager({}, {}), /ERR_PROC_RACK_UNDEFINED/)
})

test('ContainerManager init sets scheduleAddlStatTfs and whitelisted actions', async (t) => {
  let whitelistCalled = false
  const emptyAsyncIterable = {
    [Symbol.asyncIterator]: async function * () {}
  }
  const ctx = {
    rack: 'test-rack',
    storeDir: null,
    root: pkgRoot,
    facs: {
      store_s1: {
        getBee: async () => ({
          ready: async () => {},
          sub: () => ({ createReadStream: () => emptyAsyncIterable })
        })
      },
      interval_0: { add: () => {} },
      scheduler_0: { add: () => {} },
      miningosThgWriteCalls_0: {
        whitelistActions: (actions) => {
          whitelistCalled = true
          t.ok(Array.isArray(actions), 'whitelistActions called with array')
          t.is(actions.length, 3, 'three whitelisted actions')
        }
      }
    }
  }
  const mgr = new ContainerManager({}, ctx)
  t.ok(mgr.scheduleAddlStatTfs === undefined, 'not set before init')
  await mgr.init()
  t.ok(whitelistCalled, 'whitelistActions was called')
  t.ok(Array.isArray(mgr.scheduleAddlStatTfs), 'scheduleAddlStatTfs is array')
  t.alike(mgr.scheduleAddlStatTfs[0], ['1m', '0 */1 * * * *'], 'first entry 1m cron')
  t.alike(mgr.scheduleAddlStatTfs[1], ['20s', '*/20 * * * * *'], '20s cron')
  t.alike(mgr.scheduleAddlStatTfs[2], ['rtd', '*/30 * * * * *'], 'rtd cron')
})
