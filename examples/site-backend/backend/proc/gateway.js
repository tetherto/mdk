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

  const hnd = await startGateway({
    noAuth: true,
    kernelKey,
    extraPluginDirs: [path.join(__dirname, '..', '..', 'plugins', 'site')],
    port,
    // Bind all interfaces by default so the port is reachable under Docker host
    // networking; override with MDK_HTTP_HOST.
    httpd: { h0: { host: process.env.MDK_HTTP_HOST || '0.0.0.0' } },
    root: path.join(root, 'gateway'),
    env: 'test'
  })

  // The gateway starts even if the Kernel is unreachable (it just nulls its
  // client). Fail loudly so PM2/Docker restart us until the Kernel is up — this is
  // what makes startup order-independent without depends_on.
  if (!hnd.mdkClient) {
    await new Promise((resolve) => hnd.stop(resolve))
    throw new Error('ERR_KERNEL_NOT_CONNECTED: Kernel not reachable yet — retrying')
  }

  // Standalone startGateway handles SIGINT/SIGTERM (hnd.stop()).
  console.log('MDK_READY gateway port=%d kernel=%s', port, kernelKey.slice(0, 16))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
