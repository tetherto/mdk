// PM2 ecosystem for the site-backend example (host, multi-process).
//
// One PM2 app per process: mocks -> kernel -> 11 workers -> gateway, all on one
// host (127.0.0.1 + shared filesystem). Apps are computed from WORKER_SPECS so this
// file stays the single source of truth alongside backend/site.js.
//
// No depends_on is needed: autorestart + file-mediated discovery is self-healing
// (the gateway throws ERR_KERNEL_KEY_MISSING / ERR_KERNEL_NOT_CONNECTED until the
// Kernel is up; workers publish their RPC keys to the shared dir the Kernel watches).
//
//   MDK_MINERS=3 pm2 start deploy/ecosystem.config.js
//   pm2 logs   |   pm2 delete deploy/ecosystem.config.js

const path = require('path')

const exampleDir = path.join(__dirname, '..')
const procEntry = (file) => path.join(exampleDir, 'backend', 'proc', file)
const { WORKER_SPECS, HTTP_PORT } = require(path.join(exampleDir, 'backend', 'site'))

const minerCount = Number(process.env.MDK_MINERS) || 100
const discovery = process.env.MDK_DISCOVERY || 'local'
const httpPort = Number(process.env.MDK_HTTP_PORT) || HTTP_PORT

const env = { MDK_DISCOVERY: discovery }

function app (name, entry, args) {
  return {
    name,
    script: entry,
    args,
    cwd: exampleDir,
    exec_mode: 'fork',
    instances: 1,
    autorestart: true,
    restart_delay: 2000,
    env
  }
}

const apps = [
  app('mocks', procEntry('mocks.js'), ['--miners', String(minerCount)]),
  app('kernel', procEntry('kernel.js'), ['--discovery', discovery]),
  ...WORKER_SPECS.map((s) =>
    app(s.workerId, procEntry('worker.js'), ['--worker', s.name, '--miners', String(minerCount), '--discovery', discovery])
  ),
  app('gateway', procEntry('gateway.js'), ['--port', String(httpPort)])
]

module.exports = { apps }
