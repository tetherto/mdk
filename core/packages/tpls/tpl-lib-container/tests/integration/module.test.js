'use strict'

const path = require('path')
const { test } = require('brittle')
const Container = require('../../lib/container')
const ContainerManager = require('../../lib/container.manager')
const { RUNNING_STATUS } = require('../../lib/utils/constants')
const libAlerts = require('../../lib/templates/alerts')
const libStats = require('../../lib/templates/stats')

test('package exports Container and ContainerManager', (t) => {
  t.ok(typeof Container === 'function', 'Container is a constructor')
  t.ok(typeof ContainerManager === 'function', 'ContainerManager is a constructor')
})

test('Container and ContainerManager type alignment', (t) => {
  const ctx = { rack: 'test-rack' }
  const manager = new ContainerManager({}, ctx)
  const container = new Container()
  t.is(manager.getThingType(), 'container', 'manager reports container type')
  t.is(container._type, 'container', 'container instance has type container')
})

test('Container validateWriteAction works with manager getThingType', (t) => {
  const container = new Container()
  const result = container.validateWriteAction('switchContainer', true)
  t.is(result, 1, 'validateWriteAction returns 1')
})

test('constants and templates load', (t) => {
  t.ok(RUNNING_STATUS.RUNNING === 'running', 'RUNNING_STATUS available')
  t.ok(libAlerts.specs.container_default !== undefined, 'alerts container_default available')
  t.ok(libStats.specs.container_default !== undefined, 'stats container_default available')
})

test('ContainerManager init with mocked facs completes', async (t) => {
  const emptyAsyncIterable = { [Symbol.asyncIterator]: async function * () {} }
  const pkgRoot = path.join(__dirname, '../..')
  const ctx = {
    rack: 'integration-rack',
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
      mdkThgWriteCalls_0: { whitelistActions: () => {} }
    }
  }
  const manager = new ContainerManager({}, ctx)
  await manager.init()
  t.ok(manager._initialized, 'manager initialized')
  t.is(manager.rackId, 'container-integration-rack', 'rackId set')
  t.ok(Array.isArray(manager.scheduleAddlStatTfs) && manager.scheduleAddlStatTfs.length === 3, 'scheduleAddlStatTfs set')
})
