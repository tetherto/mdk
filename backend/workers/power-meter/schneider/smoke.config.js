'use strict'

// Device spec for `mdk validate worker --path . --smoke`: setup() starts the
// Schneider PM5340 simulator from mock/server.js on a free port and returns how to
// reach it; teardown() stops it so the smoke run can check every channel
// fails cleanly once the meter is gone.
const { once } = require('node:events')
const { createServer } = require('./mock/server')

module.exports = {
  async setup () {
    const mock = createServer({ host: '127.0.0.1', port: 0, type: 'pm5340' })
    await once(mock.server, 'listening')

    return {
      // A short Modbus timeout so the device-stopped pass fails fast rather
      // than riding out the meter's default 10 s.
      config: { address: '127.0.0.1', port: mock.server.address().port, unitId: 1, model: 'pm5340', timeout: 2000 },
      teardown: () => mock.exit()
    }
  }
}
