'use strict'

// Per-process entrypoint: boots exactly the mock device servers (the encrypted
// Whatsminer TCP / Modbus / Ocean REST endpoints the real workers talk to).
// The mock listeners keep the event loop alive; SIGINT/SIGTERM tear them down.

const { onShutdown } = require('../../../../backend/core/mdk')
const { startMocks } = require('../../mocks')
const { DEFAULT_MINER_COUNT } = require('../site')

function arg (name, fallback) {
  const i = process.argv.indexOf(name)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

function main () {
  const minerCount = Number(arg('--miners', DEFAULT_MINER_COUNT))
  const mocks = startMocks({ minerCount })

  // Mocks are plain listeners, not an mdk handle, so wire the close directly.
  onShutdown(() => mocks.close())

  console.log('MDK_READY mocks miners=%d', minerCount)
}

main()
