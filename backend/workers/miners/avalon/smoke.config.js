'use strict'

// Device spec for `mdk validate worker --path . --smoke`: setup() starts the
// A1346 CGMiner-API simulator from mock/server.js on a free port and returns
// how to reach it, one sample param set per command, and teardown() to stop
// it. reboot and setPowerMode are left out of `commands` on purpose: the
// miner library sends both fire-and-forget (a rebooting miner never answers),
// and nobody watches the device during an automated smoke run.
const { once } = require('node:events')
const { createServer } = require('./mock/server')

module.exports = {
  async setup () {
    const mock = createServer({ host: '127.0.0.1', port: 0, type: 'a1346', serial: 'SMOKE-0', password: 'root' })
    await once(mock.server, 'listening')

    return {
      config: { address: '127.0.0.1', port: mock.server.address().port, password: 'root', type: 'miner-av-a1346', timeout: 2000 },
      commands: {
        setLED: { enabled: false },
        setupPools: { pools: [{ url: 'stratum+tcp://pool.example:3333', user: 'worker', pass: 'x' }] }
      },
      teardown: () => mock.exit()
    }
  }
}
