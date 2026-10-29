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
      { kind: 'worker', name: 'wk', worker: 'miner-avalon', type: 'A1346', rack: 'r1' }
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
    services: [{ kind: 'worker', name: 'wk', worker: 'miner-avalon', type: 'A1346', rack: 'r1' }]
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
      { kind: 'worker', name: 'wk', worker: 'miner-avalon', type: 'A1346', rack: 'r1' }
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
    services: [{ kind: 'worker', name: 'wk', worker: 'miner-avalon', type: 'A1346', rack: 'r1' }]
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
    services: [{ kind: 'worker', name: 'wk', worker: 'miner-avalon', type: 'A1346', rack: 'r1' }]
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
  const services = [{ kind: 'worker', name: 'wk', worker: 'miner-avalon', type: 'A1346', rack: 'r1' }]

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
  const services = [{ kind: 'worker', name: 'wk', worker: 'miner-avalon', type: 'A1346', rack: 'r1' }]
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
      { kind: 'worker', name: 'wk', worker: 'miner-avalon', type: 'A1346', rack: 'r1' }
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
    services: [{ kind: 'worker', name: 'wk', worker: 'miner-avalon', type: 'A1346', rack: 'r1' }]
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
    services: [{ kind: 'worker', name: 'wk', worker: 'miner-avalon', type: 'A1346', rack: 'r1' }]
  })

  const { apps } = require(path.join(siteDir, 'ecosystem.config.js'))
  t.is(apps[0].env.MDK_DHT_BOOTSTRAP, '10.0.0.5:49737')
  t.absent('MDK_DHT_HOST' in apps[0].env, 'no loopback bind toward a LAN bootstrap')
})

test('startServices dht profile refuses public bootstrap nodes and bad hosts', async (t) => {
  useTmpSiteDir(t)
  const services = [{ kind: 'worker', name: 'wk', worker: 'miner-avalon', type: 'A1346', rack: 'r1' }]
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
      { kind: 'worker', name: 'wk', worker: 'miner-avalon', type: 'A1346', rack: 'r1' }
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
