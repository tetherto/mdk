'use strict'

// Per-process entrypoint: boots the app-node (HRPC mdkClient + full-site plugin),
// connecting to the ORK by its .ork-key public key. No IPC (RPC-gateway-only).

const path = require('path')
const fs = require('fs')
const { startAppNode } = require('../../../../backend/core/mdk')
const { ROOT, HTTP_PORT } = require('../site')

function arg (name, fallback) {
  const i = process.argv.indexOf(name)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

async function main () {
  const root = arg('--root', ROOT)
  const port = Number(arg('--port', HTTP_PORT))

  const orkKeyFile = path.join(root, '.ork-key')
  if (!fs.existsSync(orkKeyFile)) throw new Error('ERR_ORK_KEY_MISSING: start the ORK first')
  const orkKey = fs.readFileSync(orkKeyFile, 'utf8').trim()

  await startAppNode({
    noAuth: true,
    orkKey,
    orkIpc: false,
    extraPluginDirs: [path.join(__dirname, '..', '..', 'plugins', 'site')],
    port,
    root: path.join(root, 'app-node'),
    env: 'test'
  })

  // Standalone startAppNode handles SIGINT/SIGTERM (hnd.stop()).
  console.log('MDK_READY app-node port=%d ork=%s', port, orkKey.slice(0, 16))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
