'use strict'

const test = require('brittle')
const fs = require('fs')
const path = require('path')
const childProcess = require('child_process')

// services.js destructures execFileSync at require time, so patching
// child_process.execFileSync only takes effect on a *fresh* evaluation of
// services.js — if some other test file (e.g. anything requiring
// mdk/index.js, which requires ./services) already loaded and cached it in
// this same process, requiring it again here would silently hand back that
// stale, unpatched copy and this suite would shell out to a real
// `pm2 start` / `docker compose up`. Bust the cache so our require below is
// guaranteed to re-evaluate services.js against our patched execFileSync,
// regardless of load order across the whole test run.
const execCalls = []
childProcess.execFileSync = (file, args, opts) => {
  execCalls.push({ file, args, opts })
}

delete require.cache[require.resolve('../../services')]
const { startServices, GENERATED_MARKER } = require('../../services')

const repoRoot = path.join(__dirname, '..', '..', '..', '..', '..')

// miner-avalon is a WorkerRuntimeV2 family, so it needs a device list.
const AVALON_WK = {
  kind: 'worker',
  name: 'wk',
  worker: 'miner-avalon',
  type: 'A1346',
  rack: 'r1',
  devices: [{ id: 'av-1', opts: { address: '127.0.0.1', port: 4028 } }]
}

// A tmp site dir nested under the real repo root so the generated mdk/ entry
// resolves @tetherto/* packages through the workspace node_modules.
function useTmpSiteDir (t) {
  const siteDir = fs.mkdtempSync(path.join(repoRoot, '.mdk-svc-test-'))
  const prevCwd = process.cwd()
  process.chdir(siteDir)
  t.teardown(() => {
    process.chdir(prevCwd)
    fs.rmSync(siteDir, { recursive: true, force: true })
  })
  return siteDir
}

test('startServices throws for an unsupported runtime', async (t) => {
  await t.exception(startServices({ runtime: 'nope' }), /Unsupported runtime: nope/)
})

test('startServices dispatches to pm2, writes ecosystem.config.js, does not autostart by default', async (t) => {
  const siteDir = useTmpSiteDir(t)
  execCalls.length = 0

  await startServices({
    runtime: 'pm2',
    repoRoot,
    services: [
      { kind: 'gateway', name: 'gw', port: 3000 },
      { ...AVALON_WK }
    ]
  })

  const ecosystemPath = path.join(siteDir, 'ecosystem.config.js')
  t.ok(fs.existsSync(ecosystemPath), 'ecosystem.config.js written')
  const written = require(ecosystemPath)
  t.is(written.apps.length, 2)
  t.is(written.apps[0].name, 'mdk-gw')
  t.is(written.apps[0].env.SERVICE, 'gateway')
  t.is(written.apps[0].env.PORT, '3000')
  t.is(written.apps[1].name, 'mdk-wk')
  t.is(written.apps[1].env.SERVICE, 'worker')
  t.is(written.apps[1].env.WORKER, 'miner-avalon')
  t.is(written.apps[1].env.RACK, 'r1')
  t.is(written.apps[1].env.MDK_REPO_ROOT, path.resolve(repoRoot), 'checkout handed to the process explicitly')

  t.ok(fs.existsSync(path.join(siteDir, 'mdk', 'worker.js')), 'ensureMdkWorker copied worker.js')
  t.ok(fs.existsSync(path.join(siteDir, 'mdk', 'utils', 'service-bootstrap.js')), 'ensureMdkWorker copied service-bootstrap.js')
  t.is(execCalls.length, 0, 'no autostart requested, pm2 not invoked')
})

test('startServices pm2 autostarts when shouldAutoStart is set', async (t) => {
  useTmpSiteDir(t)
  execCalls.length = 0

  await startServices({
    runtime: 'pm2',
    repoRoot,
    shouldAutoStart: true,
    services: [{ ...AVALON_WK }]
  })

  t.is(execCalls.length, 1)
  t.is(execCalls[0].file, 'pm2')
  t.alike(execCalls[0].args, ['start', path.join(process.cwd(), 'ecosystem.config.js')])
})

test('startServices dispatches to docker, writes docker-compose.generated.yml', async (t) => {
  const siteDir = useTmpSiteDir(t)
  execCalls.length = 0

  const result = await startServices({
    runtime: 'docker',
    repoRoot,
    image: 'mdk:latest',
    services: [
      { kind: 'gateway', name: 'gw', port: 3000 },
      { ...AVALON_WK }
    ]
  })

  t.is(result.siteDir, siteDir)
  t.ok(fs.existsSync(result.file), 'docker-compose.generated.yml written')
  const yaml = fs.readFileSync(result.file, 'utf8')
  t.ok(yaml.includes('  gw:'))
  t.ok(yaml.includes('  wk:'))
  t.ok(yaml.includes('SERVICE: gateway'))
  t.ok(yaml.includes('SERVICE: worker'))
  t.ok(yaml.includes('MDK_REPO_ROOT: /app/repo'), 'checkout handed to the container explicitly')
  t.is(execCalls.length, 0, 'no autostart requested, docker not invoked')
})

test('startServices docker autostarts when shouldAutoStart is set', async (t) => {
  useTmpSiteDir(t)
  execCalls.length = 0

  await startServices({
    runtime: 'docker',
    repoRoot,
    image: 'mdk:latest',
    shouldAutoStart: true,
    services: [{ ...AVALON_WK }]
  })

  t.is(execCalls.length, 1)
  t.is(execCalls[0].file, 'docker')
  t.alike(execCalls[0].args, [
    'compose',
    '-f',
    path.join(process.cwd(), 'docker-compose.generated.yml'),
    'up',
    '-d'
  ])
})

test('startServices docker requires an image', async (t) => {
  useTmpSiteDir(t)
  await t.exception(
    startServices({ runtime: 'docker', repoRoot, services: [] }),
    /Docker runtime requires "image"/
  )
})

test('startServices removes stale generated legacy pm2-bootstrap.js files only', async (t) => {
  const siteDir = useTmpSiteDir(t)

  fs.mkdirSync(path.join(siteDir, 'mdk', 'utils'), { recursive: true })
  fs.writeFileSync(path.join(siteDir, 'mdk', 'pm2-bootstrap.js'), '// Auto-generated by @tetherto/mdk', 'utf8')
  fs.writeFileSync(path.join(siteDir, 'mdk', 'utils', 'pm2-bootstrap.js'), `// ${GENERATED_MARKER}`, 'utf8')

  await startServices({
    runtime: 'pm2',
    repoRoot,
    services: [{ ...AVALON_WK }]
  })

  t.absent(fs.existsSync(path.join(siteDir, 'mdk', 'pm2-bootstrap.js')), 'stale root legacy file removed')
  t.absent(fs.existsSync(path.join(siteDir, 'mdk', 'utils', 'pm2-bootstrap.js')), 'stale utils legacy file removed')
})

test('startServices docker binds gateway ports to loopback unless a host is set', async (t) => {
  useTmpSiteDir(t)
  const svcs = [{ kind: 'gateway', name: 'gw', port: 3000 }, { kind: 'gateway', name: 'gw2', port: 3001, host: '0.0.0.0' }]

  const { file } = await startServices({ runtime: 'docker', repoRoot, image: 'mdk:latest', services: svcs })
  const yaml = fs.readFileSync(file, 'utf8')
  t.ok(yaml.includes('127.0.0.1:3000:3000'), 'default loopback bind')
  t.ok(yaml.includes('0.0.0.0:3001:3001'), 'per-service host honoured')
  t.ok(yaml.startsWith(`# ${GENERATED_MARKER}`), 'generated marker')

  const res = await startServices({ runtime: 'docker', repoRoot, image: 'mdk:latest', host: '10.0.0.1', services: [svcs[0]] })
  t.ok(fs.readFileSync(res.file, 'utf8').includes('10.0.0.1:3000:3000'), 'config.host honoured')
})

test('startServices refuses to overwrite user files in the site dir', async (t) => {
  const siteDir = useTmpSiteDir(t)
  const services = [{ ...AVALON_WK }]

  fs.writeFileSync(path.join(siteDir, 'ecosystem.config.js'), 'module.exports = { mine: true }\n')
  await t.exception(startServices({ runtime: 'pm2', repoRoot, services }), /ERR_MDK_GENERATED_FILE_CONFLICT/)
  t.is(fs.readFileSync(path.join(siteDir, 'ecosystem.config.js'), 'utf8'), 'module.exports = { mine: true }\n', 'user file untouched')

  await startServices({ runtime: 'pm2', repoRoot, services, overwrite: true })
  t.ok(fs.readFileSync(path.join(siteDir, 'ecosystem.config.js'), 'utf8').includes(GENERATED_MARKER), 'overwrite: true replaces it')

  // Generated files are regenerated freely.
  await startServices({ runtime: 'pm2', repoRoot, services })

  fs.writeFileSync(path.join(siteDir, 'mdk', 'worker.js'), '// hand-written\n')
  await t.exception(startServices({ runtime: 'pm2', repoRoot, services }), /ERR_MDK_GENERATED_FILE_CONFLICT/)
})

test('startServices requires an explicit repoRoot and never searches for one', async (t) => {
  useTmpSiteDir(t)
  const services = [{ ...AVALON_WK }]
  await t.exception(startServices({ runtime: 'pm2', services }), /ERR_MDK_REPO_ROOT_REQUIRED/)
  await t.exception(startServices({ runtime: 'docker', image: 'mdk:latest', services }), /ERR_MDK_REPO_ROOT_REQUIRED/)
  await t.exception(startServices({ runtime: 'pm2', repoRoot: '', services }), /ERR_MDK_REPO_ROOT_REQUIRED/)
})

test('startServices pm2 dht profile - loopback bootstrap app and env on every process', async (t) => {
  const siteDir = useTmpSiteDir(t)

  await startServices({
    runtime: 'pm2',
    repoRoot,
    dht: {},
    services: [
      { kind: 'gateway', name: 'gw', port: 3000 },
      { ...AVALON_WK }
    ]
  })

  const { apps } = require(path.join(siteDir, 'ecosystem.config.js'))
  t.is(apps.length, 3)
  t.is(apps[0].name, 'mdk-dht-bootstrap', 'bootstrap starts first')
  t.is(apps[0].env.SERVICE, 'dht-bootstrap')
  t.is(apps[0].env.MDK_DHT_HOST, '127.0.0.1')
  t.is(apps[0].env.MDK_DHT_PORT, '49737')
  for (const app of apps.slice(1)) {
    t.is(app.env.MDK_DHT_BOOTSTRAP, '127.0.0.1:49737', `${app.name} joins the private bootstrap`)
    t.is(app.env.MDK_DHT_HOST, '127.0.0.1', `${app.name} binds loopback`)
  }
})

test('startServices pm2 dht profile - an existing LAN list and interface, no generated bootstrap', async (t) => {
  const siteDir = useTmpSiteDir(t)

  await startServices({
    runtime: 'pm2',
    repoRoot,
    dht: { bootstrap: ['10.0.0.5:49737'], host: '10.0.0.7' },
    services: [{ ...AVALON_WK }]
  })

  const { apps } = require(path.join(siteDir, 'ecosystem.config.js'))
  t.is(apps.length, 1, 'no bootstrap app')
  t.is(apps[0].env.MDK_DHT_BOOTSTRAP, '10.0.0.5:49737')
  t.is(apps[0].env.MDK_DHT_HOST, '10.0.0.7')
})

test('startServices pm2 dht profile - a LAN list without a host binds every interface', async (t) => {
  const siteDir = useTmpSiteDir(t)

  await startServices({
    runtime: 'pm2',
    repoRoot,
    dht: { bootstrap: ['10.0.0.5:49737'] },
    services: [{ ...AVALON_WK }]
  })

  const { apps } = require(path.join(siteDir, 'ecosystem.config.js'))
  t.is(apps[0].env.MDK_DHT_BOOTSTRAP, '10.0.0.5:49737')
  t.absent('MDK_DHT_HOST' in apps[0].env, 'no loopback bind toward a LAN bootstrap')
})

test('startServices dht profile refuses public bootstrap nodes and bad hosts', async (t) => {
  useTmpSiteDir(t)
  const services = [{ ...AVALON_WK }]
  await t.exception(startServices({ runtime: 'pm2', repoRoot, services, dht: { bootstrap: ['node1.hyperdht.org:49737'] } }), /ERR_MDK_DHT_BOOTSTRAP_PUBLIC/)
  await t.exception(startServices({ runtime: 'pm2', repoRoot, services, dht: { host: 'localhost' } }), /ERR_MDK_DHT_HOST_INVALID/)
  await t.exception(startServices({ runtime: 'pm2', repoRoot, services, dht: { host: '127.0.0.1', bootstrap: ['10.0.0.5:49737'] } }), /ERR_MDK_DHT_HOST_UNREACHABLE/)
  await t.exception(startServices({ runtime: 'docker', image: 'mdk:latest', repoRoot, services, dht: { internal: true, bootstrap: ['10.0.0.5:49737'] } }), /ERR_MDK_DHT_CONFIG_INVALID/)
})

test('startServices docker dht profile - private network, fixed addresses, bootstrap service', async (t) => {
  useTmpSiteDir(t)

  const { file } = await startServices({
    runtime: 'docker',
    repoRoot,
    image: 'mdk:latest',
    dht: { internal: true },
    services: [
      { kind: 'gateway', name: 'gw', port: 3000 },
      { ...AVALON_WK }
    ]
  })
  const yaml = fs.readFileSync(file, 'utf8')

  t.ok(yaml.includes('  dht-bootstrap:'), 'bootstrap service generated')
  t.ok(yaml.includes('SERVICE: dht-bootstrap'))
  t.ok(yaml.includes('MDK_DHT_HOST: 172.31.249.2'), 'bootstrap advertises its fixed address')
  t.ok(yaml.includes('MDK_DHT_BOOTSTRAP: "172.31.249.2:49737"'), 'services join it')
  t.ok(yaml.includes('MDK_DHT_HOST: 172.31.249.10'), 'gateway binds its own address')
  t.ok(yaml.includes('MDK_DHT_HOST: 172.31.249.11'), 'worker binds its own address')
  t.ok(yaml.includes('ipv4_address: 172.31.249.11'))
  t.ok(/networks:\n {2}mdk-dht:\n {4}driver: bridge\n {4}internal: true\n {4}ipam:\n {6}config:\n {8}- subnet: 172\.31\.249\.0\/24/.test(yaml), 'internal network declared')
  t.ok(/ {2}gw:[\s\S]*? {6}default: \{\}/.test(yaml), 'gateway also on the default network to publish its port')
  t.absent(/hyperdht\.org/.test(yaml))
})

const { WORKER_BOOTS, parseWorkerDevices, parseWorkerEnv } = require('../../utils/service-bootstrap')

// Every WorkerRuntimeV2 family, as a startServices Worker entry with devices.
const V2_SERVICES = Object.entries(WORKER_BOOTS)
  .filter(([, spec]) => spec.runtime === 'v2')
  .map(([worker, spec], i) => ({
    kind: 'worker',
    name: `v2-${i}`,
    worker,
    ...(spec.pool ? {} : { type: Object.keys(spec.models)[0] }),
    rack: 'r1',
    devices: [{ id: `${spec.prefix}-1`, opts: { address: '127.0.0.1', port: 1000 + i, password: 'device-secret' } }],
    env: { API_SECRET: 'worker-secret' }
  }))

test('startServices pm2 points every V2 Worker at a devices file it boots with', async (t) => {
  const siteDir = useTmpSiteDir(t)
  t.ok(V2_SERVICES.length >= 5, 'covers every migrated family')

  await startServices({ runtime: 'pm2', repoRoot, services: V2_SERVICES })

  const ecosystem = fs.readFileSync(path.join(siteDir, 'ecosystem.config.js'), 'utf8')
  t.absent(ecosystem.includes('device-secret'), 'device credentials stay out of ecosystem.config.js')
  t.absent(ecosystem.includes('worker-secret'), 'worker env stays out of ecosystem.config.js')

  const { apps } = require(path.join(siteDir, 'ecosystem.config.js'))
  for (const svc of V2_SERVICES) {
    const { env } = apps.find((a) => a.name === `mdk-${svc.name}`)
    t.is(env.MDK_WORKER_DEVICES_FILE, path.join(siteDir, 'mdk-workers', `${svc.name}.devices.json`), `${svc.worker}: devices file set`)
    t.alike(parseWorkerDevices(env), [{ deviceId: svc.devices[0].id, config: svc.devices[0].opts }], `${svc.worker}: boots with its devices`)
    t.alike(parseWorkerEnv(env), svc.env, `${svc.worker}: boots with its worker env`)
    if (process.platform !== 'win32') {
      t.is(fs.statSync(env.MDK_WORKER_DEVICES_FILE).mode & 0o777, 0o600, `${svc.worker}: devices file is owner-only`)
      t.is(fs.statSync(env.MDK_WORKER_ENV_FILE).mode & 0o777, 0o600, `${svc.worker}: env file is owner-only`)
    }
  }
})

test('startServices docker points every V2 Worker at its devices file inside the container', async (t) => {
  const siteDir = useTmpSiteDir(t)

  const { file } = await startServices({ runtime: 'docker', repoRoot, image: 'mdk:latest', services: V2_SERVICES })

  const yaml = fs.readFileSync(file, 'utf8')
  t.absent(yaml.includes('device-secret'), 'device credentials stay out of the compose file')
  t.absent(yaml.includes('worker-secret'), 'worker env stays out of the compose file')

  const containerSite = path.posix.join('/app/repo', path.relative(repoRoot, siteDir).split(path.sep).join('/'))
  for (const svc of V2_SERVICES) {
    const inContainer = `${containerSite}/mdk-workers/${svc.name}.devices.json`
    t.ok(yaml.includes(`MDK_WORKER_DEVICES_FILE: ${inContainer}`), `${svc.worker}: container path set`)
    t.ok(yaml.includes(`MDK_WORKER_ENV_FILE: ${containerSite}/mdk-workers/${svc.name}.env.json`), `${svc.worker}: env file set`)
    const onHost = path.join(siteDir, 'mdk-workers', `${svc.name}.devices.json`)
    t.alike(parseWorkerDevices({ MDK_WORKER_DEVICES_FILE: onHost }), [{ deviceId: svc.devices[0].id, config: svc.devices[0].opts }])
  }
})

test('startServices refuses a V2 Worker without devices before writing anything', async (t) => {
  const siteDir = useTmpSiteDir(t)
  for (const svc of V2_SERVICES) {
    const { devices, ...noDevices } = svc
    await t.exception(startServices({ runtime: 'pm2', repoRoot, services: [noDevices] }), /ERR_MDK_WORKER_DEVICES_REQUIRED/, `${svc.worker}: pm2`)
    await t.exception(startServices({ runtime: 'docker', image: 'mdk:latest', repoRoot, services: [{ ...noDevices, devices: [] }] }), /ERR_MDK_WORKER_DEVICES_REQUIRED/, `${svc.worker}: docker`)
  }
  t.absent(fs.existsSync(path.join(siteDir, 'ecosystem.config.js')), 'no ecosystem written')
  t.absent(fs.existsSync(path.join(siteDir, 'docker-compose.generated.yml')), 'no compose file written')
  t.absent(fs.existsSync(path.join(siteDir, 'mdk')), 'no mdk/ entry written')
})

test('startServices validates Worker devices, env and names', async (t) => {
  useTmpSiteDir(t)
  const run = (svc) => startServices({ runtime: 'pm2', repoRoot, services: [{ ...AVALON_WK, ...svc }] })
  await t.exception(run({ devices: [{ opts: {} }] }), /ERR_MDK_WORKER_DEVICES_INVALID: device 0 has no id/)
  await t.exception(run({ env: ['x'] }), /ERR_MDK_WORKER_ENV_INVALID/)
  await t.exception(run({ env: null }), /ERR_MDK_WORKER_ENV_INVALID/)
  await t.exception(run({ name: '../escape' }), /ERR_MDK_SERVICE_NAME_INVALID/)
  await t.exception(
    startServices({ runtime: 'pm2', repoRoot, services: [{ kind: 'worker', name: 'ant', worker: 'container-antspace', type: 'HK3', rack: 'r1', devices: [{ id: 'a' }] }] }),
    /ERR_MDK_WORKER_DEVICES_UNSUPPORTED/,
    'a v1 Worker refuses devices instead of ignoring them'
  )
})

test('startServices v1 Workers need no devices and get no devices file', async (t) => {
  const siteDir = useTmpSiteDir(t)
  await startServices({ runtime: 'pm2', repoRoot, services: [{ kind: 'worker', name: 'ant', worker: 'container-antspace', type: 'HK3', rack: 'r1' }] })
  const { apps } = require(path.join(siteDir, 'ecosystem.config.js'))
  t.absent('MDK_WORKER_DEVICES_FILE' in apps[0].env)
  t.absent(fs.existsSync(path.join(siteDir, 'mdk-workers')))
})

test('startServices drops a stale generated env file when env is removed', async (t) => {
  const siteDir = useTmpSiteDir(t)
  const envFile = path.join(siteDir, 'mdk-workers', 'wk.env.json')
  await startServices({ runtime: 'pm2', repoRoot, services: [{ ...AVALON_WK, env: { A: '1' } }] })
  t.ok(fs.existsSync(envFile))
  await startServices({ runtime: 'pm2', repoRoot, services: [{ ...AVALON_WK }] })
  t.absent(fs.existsSync(envFile), 'removed')
  const content = fs.readFileSync(path.join(siteDir, 'ecosystem.config.js'), 'utf8')
  t.absent(content.includes('MDK_WORKER_ENV_FILE'))
})

test('startServices refuses to overwrite a hand-written devices file', async (t) => {
  const siteDir = useTmpSiteDir(t)
  fs.mkdirSync(path.join(siteDir, 'mdk-workers'))
  fs.writeFileSync(path.join(siteDir, 'mdk-workers', 'wk.devices.json'), '[{"id":"mine"}]')
  await t.exception(startServices({ runtime: 'pm2', repoRoot, services: [{ ...AVALON_WK }] }), /ERR_MDK_GENERATED_FILE_CONFLICT/)
})
