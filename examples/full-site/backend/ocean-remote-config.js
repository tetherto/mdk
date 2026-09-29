'use strict'

// Opt-in switch: run the example's minerpool slot against a real, already-running
// MiningOS Ocean worker (over HRPC) instead of the bundled Ocean REST mock.
//
// Auto-detected, like examples/backend/minerpools/ocean does with its mdk.config.json:
// drop a config/ocean-remote.json next to the committed .example and the example uses
// the remote worker; with no such file the example stays clone-and-run on the mock.
//
// Read by backend/site.js (which worker boot to use) and mocks.js (whether to start
// the Ocean mock on PORTS.POOL at all).

const fs = require('fs')
const path = require('path')

const CONFIG_PATH = path.join(__dirname, '..', 'config', 'ocean-remote.json')

let _cached

function remoteOceanConfig () {
  if (_cached !== undefined) return _cached

  _cached = null
  try {
    const conf = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))
    if (conf && typeof conf.serverKey === 'string' && /^[0-9a-f]{64}$/i.test(conf.serverKey)) {
      _cached = conf
    } else if (conf) {
      console.warn('  ignoring config/ocean-remote.json: serverKey must be a 64-char hex RPC public key')
    }
  } catch (err) {
    if (err.code !== 'ENOENT') console.warn('  ignoring config/ocean-remote.json: %s', err.message)
  }

  return _cached
}

module.exports = { remoteOceanConfig, CONFIG_PATH }
