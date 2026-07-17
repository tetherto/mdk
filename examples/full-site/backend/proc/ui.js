'use strict'

// Per-process entrypoint: the Vite UI dev server. npm (and its vite child) run
// in their own process group (detached) so SIGTERM tears the whole group down
// rather than orphaning vite. stdio is inherited so output lands in this proc's
// log via the process manager.

const path = require('path')
const { spawn } = require('child_process')
const { arg } = require('../argv')

function main () {
  const uiPort = arg('--port', '3040')
  const apiPort = arg('--http-port', '3007')

  const child = spawn('npm', ['--prefix', path.join(__dirname, '..', '..', 'ui'), 'run', 'dev', '--', '--port', uiPort], {
    stdio: 'inherit',
    detached: true,
    env: Object.assign({}, process.env, { VITE_NO_AUTH: 'true', VITE_API_PORT: apiPort })
  })
  child.on('error', (err) => console.error('ui error:', err.message))

  process.once('SIGTERM', () => {
    try { process.kill(-child.pid, 'SIGTERM') } catch {}
    setTimeout(() => process.exit(0), 1000).unref()
  })

  console.log('MDK_READY ui port=%s api=%s', uiPort, apiPort)
}

main()
