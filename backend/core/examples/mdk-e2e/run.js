'use strict'

const path = require('path')
const fs = require('fs')
const net = require('net')
const os = require('os')
const crypto = require('crypto')
const { getOrk, startWorker, waitForDiscovery } = require('../../mdk')
const { WM_M56S } = require('../../../workers/miners/whatsminer')
const wmMock = require('../../../workers/miners/whatsminer/mock/server')
const { ACTIONS, MESSAGE_TYPES } = require('../../ork/lib/protocol/actions')
const { build } = require('../../ork/lib/protocol/envelope')

const ROOT = path.join(os.tmpdir(), 'e2e-run')
const SOCK = path.join(ROOT, 'store', 'ork-db', 'ork.sock')
const TOPIC = crypto.randomBytes(32).toString('hex')

function ipc (sock, action, payload, deviceId) {
  return new Promise((resolve, reject) => {
    const c = net.connect(sock, () => {
      c.write(JSON.stringify(build({ action, type: MESSAGE_TYPES.REQUEST, sender: 'e2e', deviceId, payload })) + '\n')
    })
    let d = ''
    c.on('data', (ch) => { d += ch; const i = d.indexOf('\n'); if (i !== -1) { c.end(); resolve(JSON.parse(d.slice(0, i))) } })
    c.on('error', reject)
    setTimeout(() => { c.destroy(); reject(new Error('timeout')) }, 10000)
  })
}

async function main () {
  fs.rmSync(ROOT, { recursive: true, force: true })

  wmMock.createServer({ port: 14028, host: '127.0.0.1', type: 'm56s', serial: 'WM-001', password: 'admin' })

  // Start worker first so it announces on DHT before ork joins
  const { manager, adapter } = await startWorker(WM_M56S, { orkTopic: TOPIC, root: ROOT })
  await manager.registerThing({ info: { serialNum: 'WM-001' }, opts: { address: '127.0.0.1', port: 14028, password: 'admin' } })
  const deviceId = Object.keys(manager.mem.things)[0]

  // Start ork with same topic — discovers the worker via DHT
  const ork = await getOrk({ root: ROOT, ipc: { path: SOCK }, topic: TOPIC })
  await waitForDiscovery(ork)

  const list = await ipc(SOCK, ACTIONS.TELEMETRY_PULL, { query: { type: 'list' } }, deviceId)
  console.log('Devices:', list.things?.map(t => `${t.id} [${t.type}]`))

  const tel = await ipc(SOCK, ACTIONS.TELEMETRY_PULL, { query: { type: 'metrics' } }, deviceId)
  const s = tel.metrics?.stats
  if (s) console.log(`Telemetry: ${s.status} hashrate=${s.hashrate_mhs?.avg} power=${s.power_w}W`)

  const caps = await ipc(SOCK, ACTIONS.DEVICE_CAPABILITIES, {}, deviceId)
  console.log('Commands:', caps.capabilities?.commands?.map(c => c.name).join(', '))

  manager.stop(() => {}); await adapter.stop(); await ork.stop()
  fs.rmSync(ROOT, { recursive: true, force: true })
  process.exit(0)
}

main().catch((err) => { console.error(err); process.exit(1) })
