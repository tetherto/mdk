'use strict'

let mock
const cleanup = () => {
  if (mock) {
    if (typeof mock.stop === 'function') {
      mock.stop()
    } else if (typeof mock.exit === 'function') {
      mock.exit()
    }
  }
}

const run = async (srv, host, port, type) => {
  try {
    mock = srv.createServer({ host, port, type })
  } catch (e) {
    cleanup()
    process.exit(1)
  }
}

module.exports = { run }
