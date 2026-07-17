'use strict'

const connected = []
const disconnected = []

module.exports = {
  contract: require('./mdk-contract.json'),
  dir: __dirname,

  connect: async (config, { deviceId }) => {
    const device = {
      deviceId,
      hashrate: config.hashrate,
      power: config.power,
      powerLimit: config.powerLimit || 3500,
      uptime: 1000
    }
    connected.push(deviceId)
    return device
  },

  disconnect: async (device, { deviceId }) => {
    disconnected.push(deviceId)
  },

  _connected: connected,
  _disconnected: disconnected
}
