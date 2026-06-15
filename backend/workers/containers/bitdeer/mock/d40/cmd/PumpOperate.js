'use strict'

module.exports = function (state, packet, cb) {
  try {
    const cmd = JSON.parse(packet.payload.toString())
    const pumpType = cmd.Type
    const pumpIndex = parseInt(cmd.Index)
    const pumpStatus = cmd.Operate
    if (pumpType === 'OilPump') {
      if (pumpIndex === 1) {
        state.DeviceInfo.OilPump1 = pumpStatus
      } else if (pumpIndex === 2) {
        state.DeviceInfo.OilPump2 = pumpStatus
      }
    } else if (pumpType === 'WaterPump') {
      if (pumpIndex === 1) {
        state.DeviceInfo.WaterPump1 = pumpStatus
      } else if (pumpIndex === 2) {
        state.DeviceInfo.WaterPump2 = pumpStatus
      }
    }
  } catch (e) {
  }
  cb()
}
