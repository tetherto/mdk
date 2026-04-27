'use strict'

module.exports = function (state, packet, cb) {
  try {
    const cmd = JSON.parse(packet.payload.toString())
    const coolerIndex = parseInt(cmd.CoolerIndex)
    const fansIndex = parseInt(cmd.FansIndex)
    const fansStatus = cmd.Operate

    // validate
    if (fansStatus !== '0' && fansStatus !== '1') throw new Error('ERR_INVALID_FANS_STATUS')

    const cooler = state.DeviceInfo.DryCooler[coolerIndex]
    if (fansIndex === -1) {
      const len = cooler.FansStatus.length
      cooler.FansStatus = new Array(len).fill(fansStatus)
    } else {
      cooler.FansStatus[fansIndex] = fansStatus
    }
  } catch (e) {
  }
  cb()
}
