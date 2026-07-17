'use strict'

const fs = require('fs')
const readline = require('readline')
const { createMdkClient } = require('../../../backend/core/client')
const { DEFAULT_KEY_FILE } = require('../../../backend/core/mdk')

const KERNEL_KEY = process.argv[2] ||
  (fs.existsSync(DEFAULT_KEY_FILE) ? fs.readFileSync(DEFAULT_KEY_FILE, 'utf8').trim() : null)

let client = null

async function run (cmd, args) {
  let call

  switch (cmd) {
    case 'workers':
      call = () => client.listWorkers()
      break

    case 'capabilities': {
      const did = args[0]
      if (!did) { console.log('Usage: capabilities <deviceId>'); return }
      call = () => client.getCapabilities(did)
      break
    }

    case 'state': {
      const did = args[0]
      call = () => client.pullState(did)
      break
    }

    case 'metrics': {
      const did = args[0]
      if (!did) { console.log('Usage: metrics <deviceId>'); return }
      call = () => client.pullTelemetry(did, 'metrics')
      break
    }

    case 'list': {
      const did = args[0]
      call = () => client.pullTelemetry(did, 'list')
      break
    }

    case 'count': {
      const did = args[0]
      call = () => client.pullTelemetry(did, 'count')
      break
    }

    case 'logs': {
      const did = args[0]
      if (!did) { console.log('Usage: logs <deviceId>'); return }
      call = () => client.pullTelemetry(did, { type: 'logs', limit: 5 })
      break
    }

    case 'settings': {
      const did = args[0]
      call = () => client.pullTelemetry(did, 'settings')
      break
    }

    case 'stats': {
      const did = args[0]
      call = () => client.pullTelemetry(did, 'stats')
      break
    }

    case 'config': {
      const did = args[0]
      call = () => client.pullTelemetry(did, 'thing_config')
      break
    }

    case 'reboot': {
      const did = args[0]
      if (!did) { console.log('Usage: reboot <deviceId>'); return }
      call = () => client.sendCommand(did, 'reboot', {})
      break
    }

    case 'setpower': {
      const did = args[0]
      const mode = args[1] || 'normal'
      if (!did) { console.log('Usage: setpower <deviceId> <normal|low|high>'); return }
      call = () => client.sendCommand(did, 'setPowerMode', { mode })
      break
    }

    case 'setled': {
      const did = args[0]
      const on = args[1] !== 'off'
      if (!did) { console.log('Usage: setled <deviceId> [on|off]'); return }
      call = () => client.sendCommand(did, 'setLED', { enabled: on })
      break
    }

    case 'help':
      console.log('')
      console.log('  Reads:')
      console.log('    workers                      — list workers')
      console.log('    list [deviceId]              — list devices')
      console.log('    count [deviceId]             — device count')
      console.log('    metrics <deviceId>           — live telemetry from hardware')
      console.log('    logs <deviceId>              — recent logs')
      console.log('    settings [deviceId]          — worker settings')
      console.log('    stats [deviceId]             — fleet stats')
      console.log('    config <deviceId>            — device config (pools, etc.)')
      console.log('    capabilities <deviceId>      — mdk-contract capabilities')
      console.log('    state [deviceId]             — worker state snapshot')
      console.log('')
      console.log('  Commands:')
      console.log('    reboot <deviceId>            — reboot miner')
      console.log('    setpower <deviceId> <mode>   — set power mode (normal/low/high)')
      console.log('    setled <deviceId> [on|off]   — toggle LED')
      console.log('')
      console.log('  quit / exit                    — exit client')
      console.log('')
      return

    default:
      console.log(`  Unknown command: ${cmd}. Type "help" for available commands.`)
      return
  }

  try {
    const resp = await call()
    console.log(JSON.stringify(resp, null, 2))
  } catch (err) {
    console.log(`  Error: ${err.message}`)
  }
}

async function main () {
  if (!KERNEL_KEY) {
    console.error(`\n  No kernel key: pass one as argv or start the Kernel first (key file: ${DEFAULT_KEY_FILE})\n`)
    process.exit(1)
  }

  client = createMdkClient({ hrpc: { key: KERNEL_KEY } })
  await client.connect()

  console.log(`\n  Client — connected to Kernel over HRPC: ${KERNEL_KEY.slice(0, 16)}…`)
  console.log('  Type "help" for commands, "quit" to exit.\n')

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

  const prompt = () => {
    rl.question('mdk> ', async (line) => {
      const parts = line.trim().split(/\s+/)
      const cmd = (parts[0] || '').toLowerCase()
      if (!cmd) { prompt(); return }
      if (cmd === 'quit' || cmd === 'exit') { rl.close(); client.close(); return }
      await run(cmd, parts.slice(1))
      prompt()
    })
  }

  prompt()
}

main()
