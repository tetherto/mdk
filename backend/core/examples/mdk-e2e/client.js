'use strict'

const net = require('net')
const crypto = require('crypto')
const readline = require('readline')
const { ACTIONS, MESSAGE_TYPES } = require('../../ork/lib/protocol/actions')
const { DEFAULT_IPC_SOCK } = require('../../mdk')

const IPC_PATH = process.argv[2] || DEFAULT_IPC_SOCK

function buildEnvelope (action, deviceId, payload) {
  return {
    id: crypto.randomUUID(),
    version: '0.1.0',
    type: MESSAGE_TYPES.REQUEST,
    action,
    sender: 'mdk-client:cli:1',
    target: null,
    deviceId: deviceId || null,
    timestamp: Date.now(),
    payload: payload || {}
  }
}

function ipcRequest (sockPath, envelope) {
  return new Promise((resolve, reject) => {
    const client = net.connect(sockPath, () => {
      client.write(JSON.stringify(envelope) + '\n')
    })
    let data = ''
    client.on('data', (chunk) => {
      data += chunk.toString()
      const idx = data.indexOf('\n')
      if (idx !== -1) {
        client.end()
        resolve(JSON.parse(data.slice(0, idx)))
      }
    })
    client.on('error', reject)
    setTimeout(() => { client.destroy(); reject(new Error('timeout')) }, 10000)
  })
}

async function run (cmd, args) {
  let envelope

  switch (cmd) {
    case 'workers':
      envelope = buildEnvelope(ACTIONS.WORKER_LIST)
      break

    case 'capabilities': {
      const did = args[0]
      if (!did) { console.log('Usage: capabilities <deviceId>'); return }
      envelope = buildEnvelope(ACTIONS.DEVICE_CAPABILITIES, did)
      break
    }

    case 'state': {
      const did = args[0]
      envelope = buildEnvelope(ACTIONS.STATE_PULL, did)
      break
    }

    case 'metrics': {
      const did = args[0]
      if (!did) { console.log('Usage: metrics <deviceId>'); return }
      envelope = buildEnvelope(ACTIONS.TELEMETRY_PULL, did, { query: { type: 'metrics' } })
      break
    }

    case 'list': {
      const did = args[0]
      envelope = buildEnvelope(ACTIONS.TELEMETRY_PULL, did, { query: { type: 'list' } })
      break
    }

    case 'count': {
      const did = args[0]
      envelope = buildEnvelope(ACTIONS.TELEMETRY_PULL, did, { query: { type: 'count' } })
      break
    }

    case 'logs': {
      const did = args[0]
      if (!did) { console.log('Usage: logs <deviceId>'); return }
      envelope = buildEnvelope(ACTIONS.TELEMETRY_PULL, did, { query: { type: 'logs', limit: 5 } })
      break
    }

    case 'settings': {
      const did = args[0]
      envelope = buildEnvelope(ACTIONS.TELEMETRY_PULL, did, { query: { type: 'settings' } })
      break
    }

    case 'stats': {
      const did = args[0]
      envelope = buildEnvelope(ACTIONS.TELEMETRY_PULL, did, { query: { type: 'stats' } })
      break
    }

    case 'config': {
      const did = args[0]
      envelope = buildEnvelope(ACTIONS.TELEMETRY_PULL, did, { query: { type: 'thing_config' } })
      break
    }

    case 'reboot': {
      const did = args[0]
      if (!did) { console.log('Usage: reboot <deviceId>'); return }
      envelope = buildEnvelope(ACTIONS.COMMAND_REQUEST, did, { command: 'reboot', params: {} })
      break
    }

    case 'setpower': {
      const did = args[0]
      const mode = args[1] || 'normal'
      if (!did) { console.log('Usage: setpower <deviceId> <normal|low|high>'); return }
      envelope = buildEnvelope(ACTIONS.COMMAND_REQUEST, did, { command: 'setPowerMode', params: { mode } })
      break
    }

    case 'setled': {
      const did = args[0]
      const on = args[1] !== 'off'
      if (!did) { console.log('Usage: setled <deviceId> [on|off]'); return }
      envelope = buildEnvelope(ACTIONS.COMMAND_REQUEST, did, { command: 'setLED', params: { enabled: on } })
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
    const resp = await ipcRequest(IPC_PATH, envelope)
    console.log(JSON.stringify(resp, null, 2))
  } catch (err) {
    console.log(`  Error: ${err.message}`)
  }
}

async function main () {
  console.log(`\n  MDK Client — connected to IPC: ${IPC_PATH}`)
  console.log('  Type "help" for commands, "quit" to exit.\n')

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

  const prompt = () => {
    rl.question('mdk> ', async (line) => {
      const parts = line.trim().split(/\s+/)
      const cmd = (parts[0] || '').toLowerCase()
      if (!cmd) { prompt(); return }
      if (cmd === 'quit' || cmd === 'exit') { rl.close(); return }
      await run(cmd, parts.slice(1))
      prompt()
    })
  }

  prompt()
}

main()
