'use strict'

// Boots the mock device servers that the REAL workers talk to. Each mock speaks
// the genuine wire protocol of its device family (Whatsminer/Antminer/Avalon TCP,
// Modbus/HTTP for containers, powermeters, and sensors, Ocean/F2Pool REST), so the real managers
// run their actual connect / collect / command paths against localhost endpoints
// instead of hardware. Bitdeer is excluded here — its mock is an MQTT client that
// must connect after the bitdeer worker's embedded broker starts (see site.js).

const path = require('path')
const debug = require('debug')('mdk:example:full-site:mocks')

const WORKERS = path.join(__dirname, '..', '..', 'backend', 'workers')

const whatsminerMock = require('whatsminer-mdk-worker/mock/api-v3-server')
const antminerMock = require(path.join(WORKERS, 'miners', 'antminer', 'mock', 'server'))
const avalonMock = require(path.join(WORKERS, 'miners', 'avalon', 'mock', 'server'))
const antspaceMock = require(path.join(WORKERS, 'containers', 'antspace', 'mock', 'server'))
const abbMock = require(path.join(WORKERS, 'power-meter', 'abb', 'mock', 'server'))
const satecMock = require(path.join(WORKERS, 'power-meter', 'satec', 'mock', 'server'))
const schneiderMock = require(path.join(WORKERS, 'power-meter', 'schneider', 'mock', 'server'))
const oceanMock = require(path.join(WORKERS, 'minerpools', 'ocean', 'mock', 'server'))
const f2poolMock = require(path.join(WORKERS, 'minerpools', 'f2pool', 'mock', 'server'))
const senecaMock = require(path.join(WORKERS, 'temperature', 'seneca', 'mock', 'server'))
const { remoteOceanConfig } = require('./backend/ocean-remote-config')

// Stable port plan — site.js seeds each device's opts.port to match.
const PORTS = {
  MINER_BASE: 14100,
  ANTMINER_BASE: 14200,
  AVALON_BASE: 14300,
  ANTSPACE: 5504,
  POWERMETER: 5503,
  SATEC_POWERMETER: 5505,
  SCHNEIDER_POWERMETER: 5506,
  SENSOR_BASE: 5510,
  POOL: 8010,
  F2POOL: 8011,
  BITDEER_MQTT: 10883
}

const HOST = '127.0.0.1'

// Typical draw of one modern hydro/immersion ASIC (Whatsminer M56S / Antminer
// S19XP / Avalon A1346 all land in this range) — used to size the site
// powermeter mocks off the actual fleet instead of a fixed placeholder.
const AVG_MINER_POWER_W = 3400

function _close (handle) {
  if (!handle) return
  const fn = handle.exit || handle.stop || handle.close
  if (typeof fn === 'function') {
    try { fn.call(handle) } catch (e) { debug('mock close error: %s', e.message) }
  }
}

// Start every mock device the site needs (except Bitdeer MQTT client). Returns a
// handle with close().
function startMocks ({ minerCount }) {
  const handles = []

  for (let i = 0; i < minerCount; i++) {
    // whatsminer-mdk-worker's mock takes a raw state override (no type/serial
    // shorthand the retired in-repo mock had) — see mvp-site's startMocks.
    handles.push(whatsminerMock.createServer({
      host: HOST,
      port: PORTS.MINER_BASE + i,
      password: 'admin',
      state: { deviceInfo: { miner: { type: 'm56s', 'miner-sn': `WM-${String(i).padStart(4, '0')}` } } }
    }))
  }
  debug('started %d whatsminer mocks on %d..%d', minerCount, PORTS.MINER_BASE, PORTS.MINER_BASE + minerCount - 1)

  for (let i = 0; i < minerCount; i++) {
    handles.push(antminerMock.createServer({
      host: HOST,
      port: PORTS.ANTMINER_BASE + i,
      type: 's19xp',
      serial: `AM-${String(i).padStart(4, '0')}`,
      password: 'root'
    }))
  }
  debug('started %d antminer mocks on %d..%d', minerCount, PORTS.ANTMINER_BASE, PORTS.ANTMINER_BASE + minerCount - 1)

  for (let i = 0; i < minerCount; i++) {
    handles.push(avalonMock.createServer({
      host: HOST,
      port: PORTS.AVALON_BASE + i,
      type: 'a1346',
      serial: `AV-${String(i).padStart(4, '0')}`
    }))
  }
  debug('started %d avalon mocks on %d..%d', minerCount, PORTS.AVALON_BASE, PORTS.AVALON_BASE + minerCount - 1)

  // Antspace racks the whatsminer + antminer families (see site.js); the pools
  // see the whole site (all 3 miner families) — sizing both off minerCount
  // keeps the container/pool mock numbers proportional to the actual fleet
  // instead of always reporting a fixed full-rack/full-site demo size.
  const antspaceMinerCount = minerCount * 2
  const siteMinerCount = minerCount * 3
  // overview.js sums every powermeter tagged pos:'site' (all 3, see site.js),
  // so split one realistic site total evenly across them rather than letting
  // each report its own independent (and far larger) placeholder demo scale.
  const sitePowerW = siteMinerCount * AVG_MINER_POWER_W
  const perMeterPowerW = sitePowerW / 3
  handles.push(antspaceMock.createServer({ host: HOST, port: PORTS.ANTSPACE, type: 'hk3', minerCount: antspaceMinerCount }))
  handles.push(abbMock.createServer({ host: HOST, port: PORTS.POWERMETER, type: 'b23', powerW: perMeterPowerW }))
  handles.push(satecMock.createServer({ host: HOST, port: PORTS.SATEC_POWERMETER, type: 'pm180', powerW: perMeterPowerW }))
  handles.push(schneiderMock.createServer({ host: HOST, port: PORTS.SCHNEIDER_POWERMETER, type: 'pm5340', powerW: perMeterPowerW }))
  const oceanRemote = remoteOceanConfig()
  if (!oceanRemote) {
    handles.push(oceanMock.createServer({ host: HOST, port: PORTS.POOL, workerCount: siteMinerCount }))
  } else {
    debug('ocean mock skipped — minerpool bridged to remote worker %s…', oceanRemote.serverKey.slice(0, 16))
  }
  handles.push(f2poolMock.createServer({ host: HOST, port: PORTS.F2POOL, usernames: 'sample-f2pool-account', workerCount: siteMinerCount }))
  // Sensor 0 sits on the antspace container (whatsminer+antminer), sensor 1 on
  // the bitdeer container (avalon only, see site.js) — matching SENSOR_CONTAINERS
  // order — so each reports a heat load proportional to the fleet it's actually
  // venting instead of a fixed baseline regardless of `--miners N`.
  const sensorMinerCounts = [antspaceMinerCount, minerCount]
  for (let i = 0; i < 2; i++) {
    handles.push(senecaMock.createServer({ host: HOST, port: PORTS.SENSOR_BASE + i, type: 'seneca', minerCount: sensorMinerCounts[i] }))
  }
  debug('started antspace (%d), abb (%d), satec (%d), schneider (%d), ocean (%s), f2pool (%d), sensors (%d..%d)',
    PORTS.ANTSPACE, PORTS.POWERMETER, PORTS.SATEC_POWERMETER, PORTS.SCHNEIDER_POWERMETER,
    oceanRemote ? 'remote' : PORTS.POOL, PORTS.F2POOL, PORTS.SENSOR_BASE, PORTS.SENSOR_BASE + 1)

  return {
    oceanRemote: !!oceanRemote,
    close () {
      for (const h of handles) _close(h)
      debug('closed %d mock device(s)', handles.length)
    }
  }
}

module.exports = { startMocks, PORTS, HOST }
