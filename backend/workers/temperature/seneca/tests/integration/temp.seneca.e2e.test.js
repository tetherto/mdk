'use strict'

const test = require('brittle')
const net = require('net')
const path = require('path')
const fs = require('fs/promises')
const os = require('os')
const { setTimeout: sleep } = require('timers/promises')

const srv = require('../../mock/server')
const TempSenecaSensorManager = require('../../lib/types/temp.seneca.sensor.manager.wrk')

function reservePort (host = '127.0.0.1') {
  return new Promise((resolve, reject) => {
    const s = net.createServer()
    s.unref()
    s.listen(0, host, () => {
      const addr = s.address()
      s.close((err) => (err ? reject(err) : resolve(addr.port)))
    })
    s.on('error', reject)
  })
}

test('e2e: mock Modbus TCP server + TempSenecaSensorManager snap', async (t) => {
  const host = '127.0.0.1'
  const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), 'seneca-e2e-'))
  const storeDir = path.join(baseDir, 'store')
  await fs.mkdir(storeDir, { recursive: true })
  const cfgDir = path.join(baseDir, 'config')
  await fs.mkdir(cfgDir, { recursive: true })
  await fs.writeFile(
    path.join(cfgDir, 'base.thing.json'),
    JSON.stringify({
      scheduleAddlStatConfigTfs: [],
      collectSnapTimeoutMs: 10000,
      storeSnapItvMs: 1000,
      sensor: { timeout: 10000 },
      alerts: {}
    }),
    'utf8'
  )
  await fs.writeFile(
    path.join(cfgDir, 'common.json'),
    JSON.stringify({ dir_log: 'logs', debug: 0 }),
    'utf8'
  )

  let mock
  let seneca

  try {
    const port = await reservePort(host)
    mock = srv.createServer({ host, port, type: 'seneca' })
    await sleep(200)

    seneca = new TempSenecaSensorManager({}, {
      rack: 'rack-e2e',
      storeDir,
      root: baseDir
    })

    await seneca.init()
    seneca.active = true

    await seneca.registerThing({
      info: {
        serialNum: 'seneca-e2e-1'
      },
      opts: {
        address: host,
        port,
        unitId: 0,
        register: 3
      }
    })

    const thg = Object.values(seneca.mem.things)[0]
    t.ok(thg?.ctrl, 'thing connected with ctrl')

    const snap = await thg.ctrl.getSnap()
    t.ok(snap.success, 'snap success')
    t.is(snap.stats.status, 'ok')
    t.ok(typeof snap.stats.temp_c === 'number')
    t.ok(snap.stats.temp_c >= 30 && snap.stats.temp_c <= 40, 'temp in mock range (30–40 °C)')
  } finally {
    if (mock) mock.stop()
    if (seneca?._initialized) {
      for (const thg of Object.values(seneca.mem.things || {})) {
        seneca.disconnectThing(thg)
      }
      await new Promise((resolve) => {
        seneca.stop(() => resolve())
      })
    }
    await sleep(200)
    await fs.rm(baseDir, {
      recursive: true,
      force: true,
      maxRetries: 15,
      retryDelay: 100
    })
  }
})
