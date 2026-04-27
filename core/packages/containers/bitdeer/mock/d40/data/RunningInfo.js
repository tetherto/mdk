'use strict'

const lUtils = require('./../../utils')

module.exports = function (ctx, state) {
  const timestamp = lUtils.dateFormat0(new Date())
  const payload = Buffer.from(JSON.stringify({
    TimeStamp: timestamp,
    RunningState: state.RunningState,
    AlarmState: state.AlarmState,
    AlarmInfo: state.AlarmInfo,
    DeviceInfo: state.DeviceInfo
  }))
  return payload
}
