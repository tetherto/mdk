'use strict'

module.exports = function (state, packet, cb) {
  try {
    const cmd = JSON.parse(packet.payload.toString())
    switch (cmd.Operate) {
      case 'AlarmReset':
        state.AlarmState = '0'
        break
      case 'AutoRun':
        state.RunningState = '1'
        break
      case 'AutoStop':
        state.RunningState = '0'
        break
    }
  } catch (e) {
  }
  cb()
}
