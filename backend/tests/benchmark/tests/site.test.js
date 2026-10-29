'use strict'

const test = require('brittle')
const fs = require('fs')
const os = require('os')
const path = require('path')

const { DEFAULT_WORKER_TYPE, DEFAULT_MODEL, MOCK_PORT_RANGE, ROOT } = require('../lib/constants')
const {
  benchmarkDir, config, loadConfig, profileRoot, validateWorkerSpec, validateCeilingSpec,
  makeDevicePlan, saveDevicePlan, loadDevicePlan, startMocks,
  stackPolicy, stackCredentials, signingCredential, gatewayTokenSource, workerStoreDir
} = require('../lib/site')
const { tcpConnectLatencyMs } = require('../lib/load')

function tmpRoot (t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-bench-site-'))
  t.teardown(() => fs.rmSync(dir, { recursive: true, force: true }))
  return dir
}

const ceiling = (startDeviceCount, stepDeviceCount, maxDeviceCount) => ({ startDeviceCount, stepDeviceCount, maxDeviceCount })

test('loadConfig / profileRoot', (t) => {
  t.is(loadConfig(), config)
  t.ok(Array.isArray(config.workers) && config.workers.length > 0)
  t.is(profileRoot('cap-1'), path.join(benchmarkDir, ROOT, 'cap-1'))
})

test('validateWorkerSpec: type and model must be registered', (t) => {
  validateWorkerSpec({ type: DEFAULT_WORKER_TYPE, model: DEFAULT_MODEL })
  t.exception(() => validateWorkerSpec({ type: 'mdk-worker-nope', model: DEFAULT_MODEL }), /ERR_UNSUPPORTED_WORKER_TYPE/)
  t.exception(() => validateWorkerSpec({ type: DEFAULT_WORKER_TYPE, model: 'nope' }), /ERR_UNSUPPORTED_MODEL/)
})

test('validateCeilingSpec: bounds on start / step / max', (t) => {
  const type = DEFAULT_WORKER_TYPE
  validateCeilingSpec({ type, ceiling: ceiling(10, 10, 30) }, { allowUncapped: false })
  validateCeilingSpec({ type, ceiling: ceiling(100, 100, 0) }, { allowUncapped: true })

  t.exception(() => validateCeilingSpec({ type }, { allowUncapped: true }), /ERR_MISSING_CEILING/)
  t.exception(() => validateCeilingSpec({ type, ceiling: ceiling(1, 1, -1) }, { allowUncapped: true }), /ERR_INVALID_CEILING_MAX/)
  t.exception(() => validateCeilingSpec({ type, ceiling: ceiling(1, 1, 1.5) }, { allowUncapped: true }), /ERR_INVALID_CEILING_MAX/)
  t.exception(() => validateCeilingSpec({ type, ceiling: ceiling(1, 1, 0) }, { allowUncapped: false }), /ERR_UNCAPPED_CEILING_WITH_MULTIPLE_WORKERS/)
  t.exception(() => validateCeilingSpec({ type, ceiling: ceiling(0, 1, 10) }, { allowUncapped: false }), /ERR_INVALID_CEILING_START: .*<= maxDeviceCount/)
  t.exception(() => validateCeilingSpec({ type, ceiling: ceiling(11, 1, 10) }, { allowUncapped: false }), /ERR_INVALID_CEILING_START/)
  t.exception(() => validateCeilingSpec({ type, ceiling: ceiling(0, 1, 0) }, { allowUncapped: true }), /ERR_INVALID_CEILING_START: .*>= 1$/)
  t.exception(() => validateCeilingSpec({ type, ceiling: ceiling(1, 11, 10) }, { allowUncapped: false }), /ERR_INVALID_CEILING_STEP: .*<= maxDeviceCount/)
  t.exception(() => validateCeilingSpec({ type, ceiling: ceiling(1, 0, 0) }, { allowUncapped: true }), /ERR_INVALID_CEILING_STEP: .*>= 1$/)
})

test('makeDevicePlan: one shared mock port per worker, unique ports, serials', (t) => {
  const usedPorts = new Set()
  const plan = makeDevicePlan({
    workers: [
      { type: DEFAULT_WORKER_TYPE, model: DEFAULT_MODEL, devices: 3 },
      { type: DEFAULT_WORKER_TYPE, model: DEFAULT_MODEL, devices: 2, simulateMocks: false }
    ],
    usedPorts
  })

  t.is(plan.devices.length, 5)
  t.is(plan.workers.length, 2)
  t.is(plan.workers[0].workerId, 'bench-worker-0')
  t.is(plan.workers[0].simulateMocks, true, 'simulateMocks defaults on')
  t.is(plan.workers[1].simulateMocks, false)
  t.ok(plan.workers[0].devices.every((d) => d.opts.port === plan.workers[0].port))
  t.is(plan.workers[0].devices[2].info.serialNum, 'BENCH-0-00003')
  t.is(usedPorts.size, 3, 'two worker ports plus the gateway port')
  t.ok(usedPorts.has(plan.gatewayPort))
  for (const port of usedPorts) t.ok(port >= MOCK_PORT_RANGE.min && port < MOCK_PORT_RANGE.max)

  const zero = makeDevicePlan({ workers: [{ type: DEFAULT_WORKER_TYPE, model: DEFAULT_MODEL, devices: 0 }], workerIdPrefix: 'zero', usedPorts })
  t.is(zero.workers[0].workerId, 'zero-0')
  t.is(zero.devices.length, 0)
  t.is(usedPorts.size, 5, 'a shared usedPorts set never hands out a port twice')

  t.exception(() => makeDevicePlan({ workers: [{ type: 'mdk-worker-nope', model: 'x', devices: 1 }] }), /ERR_UNSUPPORTED_WORKER_TYPE/)
})

test('saveDevicePlan / loadDevicePlan round-trip', (t) => {
  const root = tmpRoot(t)
  const plan = makeDevicePlan({ workers: [{ type: DEFAULT_WORKER_TYPE, model: DEFAULT_MODEL, devices: 2 }] })
  saveDevicePlan(root, plan)
  t.alike(loadDevicePlan(root), JSON.parse(JSON.stringify(plan)))
})

test('workerStoreDir creates the store dir', (t) => {
  const root = tmpRoot(t)
  const dir = workerStoreDir(root, 'bench-worker-0')
  t.ok(fs.statSync(dir).isDirectory())
})

test('startMocks: one listening server per spec; unknown models refused', async (t) => {
  const plan = makeDevicePlan({ workers: [{ type: DEFAULT_WORKER_TYPE, model: DEFAULT_MODEL, devices: 1 }] })
  const w = plan.workers[0]
  const mocks = startMocks([{ port: w.port, type: w.model, password: w.password }])
  t.teardown(() => mocks.close())
  await mocks.ready
  t.is(mocks.mocks.length, 1)
  t.ok(await tcpConnectLatencyMs('127.0.0.1', w.port) >= 0, 'mock accepts connections')

  t.exception(() => startMocks([{ port: 1, type: 'no-such-model' }]), /ERR_UNSUPPORTED_MODEL/)

  const closeThrows = startMocks([])
  closeThrows.mocks.push({ ready: Promise.resolve(), exit () { throw new Error('already closed') } })
  closeThrows.close()
  t.pass('close() swallows a mock that fails to exit')
})

test('stackPolicy binds every stack account to one full-access role', (t) => {
  const policy = stackPolicy()
  t.is(policy.roles.length, 1)
  t.alike(policy.roles[0].rules, [{ resources: ['*'], verbs: ['*'] }])
  t.alike(policy.bindings[0].subjects.map((s) => s.name).sort(), ['app:fleet', 'bench-harness', 'mdk-gateway'])
  t.ok(policy.bindings[0].subjects.every((s) => s.kind === 'ServiceAccount'))
})

test('stackCredentials: generated once per root, then read back', (t) => {
  const root = path.join(tmpRoot(t), 'nested')
  const first = stackCredentials(root)
  t.alike(Object.keys(first).sort(), ['app:fleet', 'bench-harness', 'mdk-gateway'])
  t.ok(/^[0-9a-f]{64}$/.test(first['bench-harness'].publicKey))
  t.alike(stackCredentials(root), first, 'a second call (another process) reads the same accounts')

  const signing = signingCredential(root, 'mdk-gateway')
  t.is(signing.name, 'mdk-gateway')
  t.is(signing.privateKey, first['mdk-gateway'].privateKeyPem)

  const source = gatewayTokenSource(root, 'http://127.0.0.1:1')
  t.is(source.name, 'bench-harness', 'Gateway tokens are signed in as the harness account')
})
