'use strict'

// Device spec for `mdk validate worker --path . --smoke`: setup() starts the
// F2Pool API simulator from mock/server.js on a free port and returns how to
// reach it; teardown() stops it so the smoke run can check every channel
// fails cleanly once the pool is gone.
const { createServer } = require('./mock/server')

module.exports = {
  async setup () {
    const mock = createServer({ host: '127.0.0.1', port: 0, usernames: 'smoke-account' })
    await mock.ready

    return {
      config: { accounts: ['smoke-account'], apiUrl: `http://127.0.0.1:${mock.app.server.address().port}` },
      env: { F2POOL_API_SECRET: 'secret-key' },
      teardown: () => mock.exit()
    }
  }
}
