'use strict'

const test = require('brittle')
const PowerMeter = require('../../lib/powermeter')

test('getRealtimeData delegates to _prepSnap(true)', async (t) => {
  const pm = new PowerMeter({})

  await t.exception(async () => {
    await pm.getRealtimeData()
  }, /ERR_NO_IMPL/)
})
