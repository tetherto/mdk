'use strict'

const { PDU_SOCKET_POWER_ON, PDU_SOCKET_CURRENT_ON, PDU_SOCKET_POWER_OFF, PDU_SOCKET_CURRENT_OFF } = require('../../../lib/utils/constants')

function updateSocketPowerAndCurrent (pdu, socketIndex, operate) {
  const isOff = operate === '0'
  const powerValue = isOff ? PDU_SOCKET_POWER_OFF : PDU_SOCKET_POWER_ON
  const currentValue = isOff ? PDU_SOCKET_CURRENT_OFF : PDU_SOCKET_CURRENT_ON

  if (socketIndex === -1) {
    const len = pdu.SocketStatus.length
    pdu.SocketStatus = new Array(len).fill(operate)
    pdu.PowerData = new Array(len).fill(powerValue)
    pdu.CurrentData = new Array(len).fill(currentValue)
  } else {
    pdu.SocketStatus[socketIndex] = operate
    pdu.PowerData[socketIndex] = powerValue
    pdu.CurrentData[socketIndex] = currentValue
  }
}

module.exports = function (state, packet, cb) {
  try {
    const cmd = JSON.parse(packet.payload.toString())
    const socketIndex = parseInt(cmd.SocketIndex)
    const pduIndex = parseInt(cmd.PDUIndex)
    if (pduIndex === -1) {
      state.PDU.forEach(pdu => {
        updateSocketPowerAndCurrent(pdu, socketIndex, cmd.Operate)
      })
    } else {
      const pdu = state.PDU[pduIndex]
      updateSocketPowerAndCurrent(pdu, socketIndex, cmd.Operate)
    }

    // get total power and current
    let totalPower = 0.0
    let totalCurrent = 0.0

    // if any dry cooler fan is on, set total power to 5.0 and total current to 10.0
    if (state.DeviceInfo.DryCooler.some(cooler => cooler.FansStatus.some(fan => fan === '1'))) {
      totalPower = 5.0
      totalCurrent = 10.0
    }

    state.PDU.forEach(pdu => {
      pdu.PowerData.forEach(power => {
        totalPower += parseFloat(power)
      })
      pdu.CurrentData.forEach(current => {
        totalCurrent += parseFloat(current)
      })
    })

    state.PowerData.TotalPower = totalPower.toFixed(1)
    state.PowerData.TotalCurrent = totalCurrent.toFixed(1)
    state.PowerData.PowerA = (totalPower / 3).toFixed(1)
    state.PowerData.PowerB = (totalPower / 3).toFixed(1)
    state.PowerData.PowerC = (totalPower / 3).toFixed(1)
    state.PowerData.CurrentA = (totalCurrent / 3).toFixed(1)
    state.PowerData.CurrentB = (totalCurrent / 3).toFixed(1)
    state.PowerData.CurrentC = (totalCurrent / 3).toFixed(1)
  } catch (e) {
  }
  cb()
}
