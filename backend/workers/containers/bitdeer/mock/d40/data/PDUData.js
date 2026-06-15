'use strict'

const lUtils = require('./../../utils')

module.exports = function (ctx, state) {
  const timestamp = lUtils.dateFormat0(new Date())
  return Buffer.from(JSON.stringify({
    PDUData: state.PDU,
    TimeStamp: timestamp,
    SerialPortStatus: '1'
  }))
}
