'use strict'

const test = require('brittle')
const DHT = require('hyperdht')
const path = require('path')
const fs = require('fs')
const os = require('os')
const createTestnet = require('hyperdht/testnet')
const KernelManager = require('../../lib/kernel.manager')
const { WorkerRuntime } = require('../../../mdk-worker')
const { createRawMdkClient } = require('../../../client')
const { grantTestAdmin } = require('../../lib/testing')
const simPlugin = require('../../../mdk-worker/tests/fixtures/sim-plugin')

async function startSite (t) {
  const testnet = await createTestnet(3, t.teardown)
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-levels-'))
  t.teardown(() => fs.rmSync(root, { recursive: true, force: true }))

  const worker = new WorkerRuntime(simPlugin, {
    workerId: 'sim-rack-1',
    storeDir: path.join(root, 'worker'),
    bootstrap: testnet.bootstrap,
    allowAll: true,
    devices: [{ deviceId: 'SIM-001', config: { hashrate: 100, power: 3000 } }]
  })
  await worker.start()
  t.teardown(() => worker.stop())

  const kernel = new KernelManager({
    kernel: { hrpc: { whitelist: [], bootstrap: testnet.bootstrap }, discovery: { mode: 'local', dir: path.join(root, 'keys') }, commandVerifyIntervalMs: 100 }
  }, { storeDir: path.join(root, 'kernel'), root, loadConf: () => {} })
  await kernel.init()
  await kernel.start()
  t.teardown(() => kernel.stop())
  await kernel.registerWorker(worker.getPublicKey())

  const credential = await grantTestAdmin(kernel)
  const keyPair = DHT.keyPair()
  kernel.allowKey(keyPair.publicKey)
  const client = createRawMdkClient({ hrpc: { key: kernel.getPublicKey(), bootstrap: testnet.bootstrap, keyPair }, credential })
  await client.connect()
  t.teardown(() => client.close())
  await client.waitForWorkers({ count: 1, timeoutMs: 20000 })
  return client
}

async function settled (client, commandId) {
  for (;;) {
    const status = await client.getCommandStatus(commandId)
    const verifying = status.verification && status.verification.state === 'PENDING'
    if (['SUCCESS', 'FAILED', 'TIMEOUT'].includes(status.status) && !verifying) return status
    await new Promise(resolve => setTimeout(resolve, 50))
  }
}

test('command result levels - accepted, terminal and device-verified are reported separately', async (t) => {
  const client = await startSite(t)

  const accepted = await client.sendCommand('SIM-001', 'setPowerLimit', { limit_watts: 2500 })
  t.is(accepted.status, 'QUEUED', 'level 1: the request is accepted, not reported as success')

  const verified = await settled(client, accepted.commandId)
  t.is(verified.status, 'SUCCESS', 'level 2: Kernel terminal state stays readable')
  t.alike(verified.result, { deviceId: 'SIM-001', watts: 2500, ok: true })
  t.is(verified.verification.state, 'VERIFIED', 'level 3: telemetry confirms the device state')
  t.is(verified.verification.telemetry, 'power_limit')
  t.is(verified.verification.expected, 2500)
  t.is(verified.verification.observed, 2500)

  const undeclared = await settled(client, (await client.sendCommand('SIM-001', 'reboot', {})).commandId)
  t.is(undeclared.status, 'SUCCESS')
  t.is(undeclared.verification.state, 'NOT_DECLARED', 'no contract verify: success is never upgraded to verified')

  const failed = await settled(client, (await client.sendCommand('SIM-001', 'explode', {})).commandId)
  t.is(failed.status, 'FAILED', 'a failed command is still readable after it settles')
  t.is(failed.error, 'ERR_SIM_EXPLODE')
  t.is(failed.verification, null)
})
