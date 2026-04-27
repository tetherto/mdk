'use strict'

const test = require('brittle')
const ThingManager = require('../../../tpl-lib-thing/lib/thing.manager')
const SensorManager = require('../../lib/sensor.manager')

test('SensorManager reports sensor thing type', (t) => {
  const mgr = new SensorManager({}, { rack: 'rack-a' })
  t.is(mgr.getThingType(), 'sensor')
  t.is(mgr._getThingBaseType(), 'sensor')
})

test('SensorManager init assigns scheduleAddlStatTfs after super.init', async (t) => {
  const origInit = ThingManager.prototype.init
  ThingManager.prototype.init = async function () {
    this._initialized = true
  }
  try {
    const mgr = new SensorManager({}, { rack: 'rack-b' })
    await mgr.init()
    t.alike(mgr.scheduleAddlStatTfs, [['rtd', '*/10 * * * * *']])
  } finally {
    ThingManager.prototype.init = origInit
  }
})
