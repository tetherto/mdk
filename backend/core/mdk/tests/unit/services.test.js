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
const { startServices } = require('../../services')

const repoRoot = path.join(__dirname, '..', '..', '..', '..', '..')

// A tmp site dir nested under the real repo root so findRepoRoot(process.cwd())
// still resolves correctly (it walks up looking for backend/core/mdk).
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
    services: [
      { kind: 'gateway', name: 'gw', port: 3000 },
      { kind: 'worker', name: 'wk', worker: 'miner-antminer', type: 'S19XP', rack: 'r1' }
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
  t.is(written.apps[1].env.WORKER, 'miner-antminer')
  t.is(written.apps[1].env.RACK, 'r1')

  t.ok(fs.existsSync(path.join(siteDir, 'mdk', 'worker.js')), 'ensureMdkWorker copied worker.js')
  t.ok(fs.existsSync(path.join(siteDir, 'mdk', 'utils', 'service-bootstrap.js')), 'ensureMdkWorker copied service-bootstrap.js')
  t.is(execCalls.length, 0, 'no autostart requested, pm2 not invoked')
})

test('startServices pm2 autostarts when shouldAutoStart is set', async (t) => {
  useTmpSiteDir(t)
  execCalls.length = 0

  await startServices({
    runtime: 'pm2',
    shouldAutoStart: true,
    services: [{ kind: 'worker', name: 'wk', worker: 'miner-antminer', type: 'S19XP', rack: 'r1' }]
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
    image: 'mdk:latest',
    services: [
      { kind: 'gateway', name: 'gw', port: 3000 },
      { kind: 'worker', name: 'wk', worker: 'miner-antminer', type: 'S19XP', rack: 'r1' }
    ]
  })

  t.is(result.siteDir, siteDir)
  t.ok(fs.existsSync(result.file), 'docker-compose.generated.yml written')
  const yaml = fs.readFileSync(result.file, 'utf8')
  t.ok(yaml.includes('  gw:'))
  t.ok(yaml.includes('  wk:'))
  t.ok(yaml.includes('SERVICE: gateway'))
  t.ok(yaml.includes('SERVICE: worker'))
  t.is(execCalls.length, 0, 'no autostart requested, docker not invoked')
})

test('startServices docker autostarts when shouldAutoStart is set', async (t) => {
  useTmpSiteDir(t)
  execCalls.length = 0

  await startServices({
    runtime: 'docker',
    image: 'mdk:latest',
    shouldAutoStart: true,
    services: [{ kind: 'worker', name: 'wk', worker: 'miner-antminer', type: 'S19XP', rack: 'r1' }]
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
    startServices({ runtime: 'docker', services: [] }),
    /Docker runtime requires "image"/
  )
})

test('startServices removes stale legacy pm2-bootstrap.js files', async (t) => {
  const siteDir = useTmpSiteDir(t)

  fs.mkdirSync(path.join(siteDir, 'mdk', 'utils'), { recursive: true })
  fs.writeFileSync(path.join(siteDir, 'mdk', 'pm2-bootstrap.js'), '// legacy', 'utf8')
  fs.writeFileSync(path.join(siteDir, 'mdk', 'utils', 'pm2-bootstrap.js'), '// legacy', 'utf8')

  await startServices({
    runtime: 'pm2',
    services: [{ kind: 'worker', name: 'wk', worker: 'miner-antminer', type: 'S19XP', rack: 'r1' }]
  })

  t.absent(fs.existsSync(path.join(siteDir, 'mdk', 'pm2-bootstrap.js')), 'stale root legacy file removed')
  t.absent(fs.existsSync(path.join(siteDir, 'mdk', 'utils', 'pm2-bootstrap.js')), 'stale utils legacy file removed')
})
