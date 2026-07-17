'use strict'

// Per-process entrypoint: boots the gateway (HRPC mdkClient + full-site plugin),
// connecting to the Kernel by its .kernel-key public key (RPC-listener-only).

const path = require('path')
const fs = require('fs')
const { startGateway } = require('../../../../backend/core/mdk')
const { ROOT, HTTP_PORT } = require('../site')
const { arg } = require('../argv')

async function main () {
  const root = arg('--root', ROOT)
  const port = Number(arg('--port', HTTP_PORT))

  const kernelKeyFile = path.join(root, '.kernel-key')
  if (!fs.existsSync(kernelKeyFile)) throw new Error('ERR_KERNEL_KEY_MISSING: start the Kernel first')
  const kernelKey = fs.readFileSync(kernelKeyFile, 'utf8').trim()

  await startGateway({
    noAuth: true,
    kernelKey,
    extraPluginDirs: [path.join(__dirname, '..', '..', 'plugins', 'site')],
    port,
    root: path.join(root, 'gateway'),
    env: 'test'
  })

  // Standalone startGateway handles SIGINT/SIGTERM (hnd.stop()).
  console.log('MDK_READY gateway port=%d kernel=%s', port, kernelKey.slice(0, 16))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
