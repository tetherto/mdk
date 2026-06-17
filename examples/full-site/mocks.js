'use strict'

// Boots the mock device servers that the REAL workers talk to. Each mock speaks
// the genuine wire protocol of its device family (encrypted Whatsminer TCP,
// Modbus TCP for the container and powermeter, Ocean REST), so the real managers
// run their actual connect / collect / command paths against localhost endpoints
// instead of hardware. No simulator code — only mock transports.

const path = require('path')
const debug = require('debug')('mdk:example:full-site:mocks')

const WORKERS = path.join(__dirname, '..', '..', 'backend', 'workers')

const whatsminerMock = require(path.join(WORKERS, 'miners', 'whatsminer', 'mock', 'server'))
const microbtMock = require(path.join(WORKERS, 'containers', 'microbt', 'mock', 'server'))
const abbMock = require(path.join(WORKERS, 'power-meter', 'abb', 'mock', 'server'))
const oceanMock = require(path.join(WORKERS, 'minerpools', 'ocean', 'mock', 'server'))

// Stable port plan — start.js seeds each device's opts.port to match. Miners get
// one TCP listener each starting at MINER_BASE; the Modbus mocks must use
// distinct ports (both default to 5020), and the pool serves REST.
const PORTS = {
  MINER_BASE: 14100,
  CONTAINER: 5502,
  POWERMETER: 5503,
  POOL: 8010
}

const HOST = '127.0.0.1'

function _close (handle) {
  if (!handle) return
  const fn = handle.exit || handle.stop || handle.close
  if (typeof fn === 'function') {
    try { fn.call(handle) } catch (e) { debug('mock close error: %s', e.message) }
  }
}

// Start every mock device the site needs. Returns a handle with close().
function startMocks ({ minerCount }) {
  const handles = []

  for (let i = 0; i < minerCount; i++) {
    handles.push(whatsminerMock.createServer({
      host: HOST,
      port: PORTS.MINER_BASE + i,
      type: 'm56s',
      serial: `WM-${String(i).padStart(4, '0')}`,
      password: 'admin'
    }))
  }
  debug('started %d whatsminer mocks on %d..%d', minerCount, PORTS.MINER_BASE, PORTS.MINER_BASE + minerCount - 1)

  handles.push(microbtMock.createServer({ host: HOST, port: PORTS.CONTAINER, type: 'kehua' }))
  handles.push(abbMock.createServer({ host: HOST, port: PORTS.POWERMETER, type: 'b23' }))
  handles.push(oceanMock.createServer({ host: HOST, port: PORTS.POOL }))
  debug('started container (%d), powermeter (%d), pool (%d)', PORTS.CONTAINER, PORTS.POWERMETER, PORTS.POOL)

  return {
    close () {
      for (const h of handles) _close(h)
      debug('closed %d mock device(s)', handles.length)
    }
  }
}

module.exports = { startMocks, PORTS, HOST }
