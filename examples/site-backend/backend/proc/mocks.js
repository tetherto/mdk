'use strict'

// Per-process entrypoint: boots exactly the mock device servers (the encrypted
// Whatsminer TCP / Modbus / Ocean REST endpoints the real workers talk to).
// The mock listeners keep the event loop alive; SIGINT/SIGTERM tear them down.

const { onShutdown } = require('../../../../backend/core/mdk')
const { startMocks } = require('../../mocks')
const { DEFAULT_MINER_COUNT } = require('../site')
const { minerCountFromArgv } = require('../argv')

function main () {
  const minerCount = minerCountFromArgv(DEFAULT_MINER_COUNT)
  const mocks = startMocks({ minerCount })

  // Mocks are plain listeners, not an mdk handle, so wire the close directly.
  onShutdown(() => mocks.close())

  console.log('MDK_READY mocks miners=%d', minerCount)
}

main()
