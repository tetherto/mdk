'use strict'

const path = require('path')
const fs = require('fs')
const os = require('os')
const crypto = require('crypto')
const { getKernel, waitForDiscovery } = require('../../../backend/core/mdk')
const { createMdkClient } = require('../../../backend/core/client')
const { startWhatsminerWorker } = require('../../../backend/workers/miners/whatsminer')
const wmMock = require('../../../backend/workers/miners/whatsminer/mock/server')

const ROOT = path.join(os.tmpdir(), 'e2e-run')
const TOPIC = crypto.randomBytes(32).toString('hex')

async function main () {
  fs.rmSync(ROOT, { recursive: true, force: true })

  wmMock.createServer({ port: 14028, host: '127.0.0.1', type: 'm56s', serial: 'WM-001', password: 'admin' })

  // Start worker first so it announces on DHT before kernel joins. The device
  // set comes from the persisted provisioning store; seedDevices populates it
  // on this first boot.
  const worker = await startWhatsminerWorker({
    workerId: 'whatsminer-m56s-e2e',
    model: 'm56s',
    storeDir: path.join(ROOT, 'worker-store'),
    kernelTopic: TOPIC,
    seedDevices: [{
      id: 'WM-001',
      info: { serialNum: 'WM-001' },
      opts: { address: '127.0.0.1', port: 14028, password: 'admin' }
    }]
  })
  const deviceId = worker.services.provisioning.listDeviceIds()[0]

  // Start kernel with same topic — discovers the worker via DHT
  const kernel = await getKernel({ root: ROOT, topic: TOPIC })
  await waitForDiscovery(kernel)

  // Connect over HRPC by the kernel's public key (in-process, no config needed)
  const client = createMdkClient({ hrpc: { key: kernel.getPublicKey() } })
  await client.connect()

  const list = await client.pullTelemetry(deviceId, 'list')
  console.log('Devices:', list.things?.map(t => `${t.id} [${t.type}]`))

  const tel = await client.pullTelemetry(deviceId, 'metrics')
  const s = tel.metrics?.snap?.stats
  if (s) console.log(`Telemetry: ${s.status} hashrate=${s.hashrate_mhs?.avg} power=${s.power_w}W`)

  const caps = await client.getCapabilities(deviceId)
  console.log('Commands:', caps.capabilities?.commands?.map(c => c.name).join(', '))

  await client.close()
  await worker.stop(); await kernel.stop()
  fs.rmSync(ROOT, { recursive: true, force: true })
  process.exit(0)
}

main().catch((err) => { console.error(err); process.exit(1) })
