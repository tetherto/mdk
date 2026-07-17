'use strict'

// Worker-plugin fixture for the kernel action suites. connect() hands back
// the per-device state object carried in the device config, so tests hold
// the same objects the command handlers mutate.
module.exports = {
  contract: require('./mdk-contract.json'),
  dir: __dirname,
  connect: async (config) => config.state
}
