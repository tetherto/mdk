'use strict'

const test = require('brittle')
const PowerMeterManager = require('../../lib/powermeter.manager')

test('PowerMeterManager exposes correct thing type/base type/tags', (t) => {
  const mgr = new PowerMeterManager({}, { rack: 'r1' })

  t.is(mgr.getThingType(), 'powermeter')
  t.is(mgr._getThingBaseType(), 'powermeter')
  t.alike(mgr.getSpecTags(), ['powermeter'])
})
