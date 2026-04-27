'use strict'

const test = require('brittle')

const ThingManager = require('../../../tpl-lib-thing/lib/thing.manager')

test('PowerMeterManager.init sets scheduleAddlStatTfs after super.init', async (t) => {
  const origInit = ThingManager.prototype.init
  t.teardown(() => {
    ThingManager.prototype.init = origInit
  })

  let superInitCalled = false
  ThingManager.prototype.init = async function () {
    superInitCalled = true
  }

  const PowerMeterManager = require('../../lib/powermeter.manager')
  const mgr = new PowerMeterManager({}, { rack: 'r1' })

  await mgr.init()

  t.is(superInitCalled, true)
  t.alike(mgr.scheduleAddlStatTfs, [['rtd', '*/5 * * * * *']])
})
