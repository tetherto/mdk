'use strict'

const test = require('brittle')
const fs = require('fs')
const os = require('os')
const path = require('path')
const {
  resolveRepoRoot,
  ensureConfigFromExamples,
  resolveWorkerBoot,
  WORKER_BOOTS
} = require('../../utils/service-bootstrap')

const realRepoRoot = path.join(__dirname, '..', '..', '..', '..', '..')

test('resolveRepoRoot takes the checkout from MDK_REPO_ROOT only', (t) => {
  t.is(resolveRepoRoot({ MDK_REPO_ROOT: realRepoRoot }), path.resolve(realRepoRoot))
  t.exception(() => resolveRepoRoot({}), /ERR_MDK_REPO_ROOT_REQUIRED/, 'no upward search when unset')
  t.exception(() => resolveRepoRoot({ MDK_REPO_ROOT: ' ' }), /ERR_MDK_REPO_ROOT_REQUIRED/)
})

test('runWorker refuses to run without an explicit checkout', async (t) => {
  const { runWorker } = require('../../utils/service-bootstrap')
  await t.exception(runWorker(), /ERR_MDK_REPO_ROOT_REQUIRED/)
})

test('main requires MDK_REPO_ROOT for a worker', async (t) => {
  const { main } = require('../../utils/service-bootstrap')
  const prev = { SERVICE: process.env.SERVICE, MDK_REPO_ROOT: process.env.MDK_REPO_ROOT }
  t.teardown(() => {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }
  })
  process.env.SERVICE = 'worker'
  delete process.env.MDK_REPO_ROOT
  await t.exception(main(), /ERR_MDK_REPO_ROOT_REQUIRED/)
})

test('worker boots are resolved by package name', (t) => {
  for (const spec of Object.values(WORKER_BOOTS)) {
    t.ok(spec.pkg.startsWith('@tetherto/mdk-worker-'), `${spec.pkg} is a package name`)
    t.ok(require.resolve(spec.pkg), `${spec.pkg} resolves`)
  }
})

test('ensureConfigFromExamples is a no-op when the dir does not exist', (t) => {
  const missing = path.join(os.tmpdir(), 'mdk-does-not-exist-' + Date.now())
  ensureConfigFromExamples(missing) // should not throw
  t.pass()
})

test('ensureConfigFromExamples copies .example files that are missing, recursing into subdirs, and skips existing ones', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-config-examples-'))
  t.teardown(() => fs.rmSync(dir, { recursive: true, force: true }))

  fs.writeFileSync(path.join(dir, 'common.json.example'), '{"a":1}')
  fs.writeFileSync(path.join(dir, 'existing.json.example'), '{"b":2}')
  fs.writeFileSync(path.join(dir, 'existing.json'), '{"already":"here"}')
  fs.mkdirSync(path.join(dir, 'facs'))
  fs.writeFileSync(path.join(dir, 'facs', 'nested.json.example'), '{"c":3}')

  ensureConfigFromExamples(dir)

  t.ok(fs.existsSync(path.join(dir, 'common.json')), 'missing dest created from example')
  t.is(fs.readFileSync(path.join(dir, 'common.json'), 'utf8'), '{"a":1}')
  t.is(fs.readFileSync(path.join(dir, 'existing.json'), 'utf8'), '{"already":"here"}', 'existing dest left untouched')
  t.ok(fs.existsSync(path.join(dir, 'facs', 'nested.json')), 'recurses into subdirectories')
})

test('resolveWorkerBoot throws for an unknown worker key', (t) => {
  t.exception(() => resolveWorkerBoot('nope-not-a-worker'), /ERR_MDK_WORKER_UNKNOWN/)
  t.exception(() => resolveWorkerBoot('constructor'), /ERR_MDK_WORKER_UNKNOWN/)
})

test('resolveWorkerBoot throws when the resolved package has no matching factory export', (t) => {
  const loaded = []
  const load = (name) => { loaded.push(name); return {} }
  t.exception(() => resolveWorkerBoot('container-antspace', load), /ERR_MDK_WORKER_EXPORT: startAntspaceWorker/)
  t.alike(loaded, ['@tetherto/mdk-worker-antspace'])
})

test('resolveWorkerBoot returns the spec and factory when the package exports it', (t) => {
  const load = () => ({ startAntspaceWorker: () => 'ok' })
  const { spec, factory } = resolveWorkerBoot('container-antspace', load)
  t.is(spec, WORKER_BOOTS['container-antspace'])
  t.is(factory(), 'ok')
})

test('resolveWorkerBoot hosts a directory-loaded package on WorkerRuntimeV2 with the given devices', async (t) => {
  const ctor = []
  const load = (name) => {
    t.is(name, '@tetherto/mdk-worker')
    return {
      WorkerRuntimeV2: class {
        constructor (dir, opts) { ctor.push({ dir, opts }) }
        async start () { this.started = true }
        async stop () { this.stopped = true }
      }
    }
  }
  load.resolve = (request) => `/pkgs/${request}`
  const { spec, factory } = resolveWorkerBoot('miner-avalon', load)
  t.is(spec.runtime, 'v2')
  const devices = [{ deviceId: 'AV-1', config: { address: '10.0.0.5', port: 4028, password: 'x' } }]
  const handle = await factory({ workerId: 'avalon-a1346-r1', storeDir: '/data', model: 'a1346', allowedKeys: ['k'], devices, env: { A: '1' } })
  t.is(ctor[0].dir, '/pkgs/@tetherto/mdk-worker-avalon')
  t.alike(ctor[0].opts.devices, devices)
  t.alike(ctor[0].opts.config, { model: 'a1346' })
  t.alike(ctor[0].opts.env, { A: '1' })
  t.alike(ctor[0].opts.allowedKeys, ['k'])
  t.ok(handle.runtime.started)
  await handle.stop()
  t.ok(handle.runtime.stopped)
})

test('parseWorkerDevices reads the mdk.yaml devices shape from env or a file', (t) => {
  const { parseWorkerDevices, parseWorkerEnv } = require('../../utils/service-bootstrap')
  t.exception(() => parseWorkerDevices({}), /ERR_MDK_WORKER_DEVICES_REQUIRED/)
  t.exception(() => parseWorkerDevices({ MDK_WORKER_DEVICES: 'nope' }), /ERR_MDK_WORKER_DEVICES_INVALID/)
  t.exception(() => parseWorkerDevices({ MDK_WORKER_DEVICES: '[]' }), /ERR_MDK_WORKER_DEVICES_INVALID/)
  t.exception(() => parseWorkerDevices({ MDK_WORKER_DEVICES: '[{"opts":{}}]' }), /device 0 has no id/)
  t.alike(
    parseWorkerDevices({ MDK_WORKER_DEVICES: '[{"id":"a","opts":{"port":1},"info":{"container":"c"}},{"deviceId":"b","config":{"port":2}}]' }),
    [{ deviceId: 'a', config: { port: 1 }, info: { container: 'c' } }, { deviceId: 'b', config: { port: 2 } }]
  )
  const fs = require('fs')
  const os = require('os')
  const path = require('path')
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-devices-')), 'devices.json')
  fs.writeFileSync(file, '[{"id":"f","opts":{"port":3}}]')
  t.alike(parseWorkerDevices({ MDK_WORKER_DEVICES_FILE: file }), [{ deviceId: 'f', config: { port: 3 } }])
  t.alike(parseWorkerEnv({}), {})
  t.alike(parseWorkerEnv({ MDK_WORKER_ENV: '{"F2POOL_API_SECRET":"s"}' }), { F2POOL_API_SECRET: 's' })
  t.exception(() => parseWorkerEnv({ MDK_WORKER_ENV: '[1]' }), /ERR_MDK_WORKER_ENV_INVALID/)

  // The wrapped shapes startServices writes.
  const wrapped = path.join(path.dirname(file), 'wrapped.devices.json')
  fs.writeFileSync(wrapped, '{"_generated":"x","devices":[{"id":"w","opts":{"port":4}}]}')
  t.alike(parseWorkerDevices({ MDK_WORKER_DEVICES_FILE: wrapped }), [{ deviceId: 'w', config: { port: 4 } }])
  const envFile = path.join(path.dirname(file), 'wrapped.env.json')
  fs.writeFileSync(envFile, '{"_generated":"x","env":{"F2POOL_API_SECRET":"f"}}')
  t.alike(parseWorkerEnv({ MDK_WORKER_ENV_FILE: envFile }), { F2POOL_API_SECRET: 'f' })
  fs.writeFileSync(envFile, '{"PLAIN":"1"}')
  t.alike(parseWorkerEnv({ MDK_WORKER_ENV_FILE: envFile }), { PLAIN: '1' }, 'an unwrapped env file is read as is')
  t.alike(parseWorkerEnv({ MDK_WORKER_ENV: '{"A":"inline"}', MDK_WORKER_ENV_FILE: envFile }), { A: 'inline' }, 'inline wins')
  fs.writeFileSync(envFile, '{"_generated":"x"}')
  t.exception(() => parseWorkerEnv({ MDK_WORKER_ENV_FILE: envFile }), /ERR_MDK_WORKER_ENV_INVALID/)
})

test('isV2Worker names the WorkerRuntimeV2 families', (t) => {
  const { isV2Worker } = require('../../utils/service-bootstrap')
  for (const w of ['miner-avalon', 'powermeter-abb', 'powermeter-satec', 'powermeter-schneider', 'minerpool-f2pool']) t.ok(isV2Worker(w), w)
  for (const w of ['container-antspace', 'container-bitdeer', 'sensor-seneca', 'nope', 'toString']) t.absent(isV2Worker(w), w)
})

test('resolveWorkerTrust - env keys and the explicit allow-all opt-in', (t) => {
  const { resolveWorkerTrust } = require('../../utils/service-bootstrap')
  const key = 'ab'.repeat(32)
  const res = resolveWorkerTrust({ MDK_WORKER_ALLOWED_KEYS: ` ${key} ,` })
  t.ok(res.allowedKeys.includes(key))
  t.is(res.allowAll, false)
  t.is(resolveWorkerTrust({ MDK_WORKER_ALLOW_ALL: '1' }).allowAll, true)
})

test('the shipped bootstrap never walks up the tree or requires by checkout path', (t) => {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'utils', 'service-bootstrap.js'), 'utf8')
  t.absent(/findRepoRoot|path\.dirname\(dir\)/.test(src), 'no upward search')
  t.absent(/require\(path\.join/.test(src), 'no require of a computed checkout path')
})

test('resolveDht - MDK_DHT_BOOTSTRAP / MDK_DHT_HOST, refusing public bootstrap nodes', (t) => {
  const { resolveDht } = require('../../utils/service-bootstrap')
  t.alike(resolveDht({}), {}, 'unset: the public DHT')
  t.alike(resolveDht({ MDK_DHT_BOOTSTRAP: '172.31.249.2:49737', MDK_DHT_HOST: '172.31.249.11' }), {
    bootstrap: ['172.31.249.2:49737'],
    dhtHost: '172.31.249.11'
  })
  t.exception(() => resolveDht({ MDK_DHT_BOOTSTRAP: 'node3.hyperdht.org:49737' }), /ERR_MDK_DHT_BOOTSTRAP_PUBLIC/)
})

test('gatewayArgs - the DHT settings reach the spawned gateway as ctx flags', (t) => {
  const { gatewayArgs } = require('../../utils/service-bootstrap')
  t.alike(gatewayArgs({ env: 'production', port: 3000 }), ['--wtype', 'wrk-node-http', '--env', 'production', '--port', '3000'])
  t.alike(
    gatewayArgs({ env: 'development', port: 3000, dht: { bootstrap: ['127.0.0.1:49737', '127.0.0.1:49738'], dhtHost: '127.0.0.1' } }).slice(6),
    ['--kernelBootstrap', '127.0.0.1:49737,127.0.0.1:49738', '--kernelDhtHost', '127.0.0.1']
  )
})
