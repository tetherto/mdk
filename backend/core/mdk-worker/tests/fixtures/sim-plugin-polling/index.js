'use strict'

// Like sim-plugin, but the contract declares telemetryPollIntervalMs and two
// metrics share one handler. `calls` counts handler invocations per device so
// tests can prove a stored read made no device call.
const calls = { stats: {}, status: {} }

module.exports = {
  contract: require('./mdk-contract.json'),
  dir: __dirname,

  connect: async (config, { deviceId }) => ({
    deviceId,
    hashrate: config.hashrate,
    power: config.power,
    status: config.status || 'mining',
    fail: config.fail || false,
    failStats: config.failStats || false
  }),

  _calls: calls,
  _reset () {
    calls.stats = {}
    calls.status = {}
  }
}
