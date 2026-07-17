'use strict'

// Whatsminer-shaped stub plugin for the parity suites. Each device's
// telemetry comes from the immutable `snap` object in its device-spec
// config; `offline: true` makes connect() throw so the runtime holds the
// device offline (adapter-era "device offline" manager stub).
module.exports = {
  contract: require('./contract'),
  dir: __dirname,

  connect: async (config) => {
    if (config.offline) throw new Error('device offline')
    return { snap: config.snap || {} }
  }
}
