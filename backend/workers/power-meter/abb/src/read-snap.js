'use strict'

const sweep = require('@tetherto/mdk-worker/sweep-memo')()
const device = require('./device')

// A frame the meter answered with but that cannot be decoded is a read
// failure; anything else (connect refused, timeout) means the meter is gone.
const READ_FAILURE = /ERR_DATA_|ERR_ADDRESS|ERR_MODBUS_RESPONSE|ERR_READ_VALUES/

// One Modbus read serves every channel of a poll sweep; a meter that cannot
// be read is an error here, not a value, which is what the runtime's health
// channel keys on.
module.exports = (params) => sweep(params, 'snap', async () => {
  try {
    return await device.readSnap()
  } catch (err) {
    const detail = String((err && err.message) || err)
    if (READ_FAILURE.test(detail)) throw new Error(`ERR_METER_READ_FAILED: ${detail}`)
    throw new Error(`ERR_METER_UNREACHABLE: ${detail}`)
  }
})
