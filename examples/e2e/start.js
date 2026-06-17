'use strict'

/**
 * MDK Site Monitor — interactive CLI.
 *
 * Run with:  npm start   (from examples/e2e/)
 *
 * Shows service descriptions and available commands on startup.
 * Type commands at the prompt to start, stop, or inspect services.
 */

const { spawn } = require('child_process')
const path = require('path')
const readline = require('readline')

// ── Colours ───────────────────────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m'
}

// ── Paths ─────────────────────────────────────────────────────────────────────
const E2E_DIR = path.resolve(__dirname, '../backend/mdk-e2e')
const SERVER_JS = path.resolve(E2E_DIR, 'server.js')
const UI_DIR = path.join(__dirname, 'ui')

// ── Service registry ──────────────────────────────────────────────────────────
// 'ork' and 'app-node' both use server.js and are mutually exclusive (same port).
const SERVICE_DEFS = {
  ork: {
    label: 'ORK',
    color: C.cyan,
    cmd: process.execPath,
    args: [SERVER_JS],
    opts: { cwd: E2E_DIR }
  },
  'app-node': {
    label: 'BACKEND',
    color: C.cyan,
    cmd: process.execPath,
    args: [SERVER_JS, '--app-node'],
    opts: { cwd: E2E_DIR }
  },
  ui: {
    label: 'UI',
    color: C.yellow,
    cmd: 'npm',
    args: ['run', 'dev'],
    opts: {
      cwd: UI_DIR,
      shell: true,
      env: Object.assign({}, process.env, { VITE_NO_AUTH: 'true' })
    }
  }
}

const BACKEND_SERVICES = new Set(['ork', 'app-node'])

// running: Map<name, { proc, label, color, stopping }>
const running = new Map()

// ── Readline setup ────────────────────────────────────────────────────────────
// No leading \n in the prompt string — spacing before the prompt is handled
// explicitly in the line handler so serviceLog can write it directly.
const PROMPT = `${C.green}mdk${C.reset}${C.bold}>${C.reset} `

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: PROMPT
})

// ── Output helpers ────────────────────────────────────────────────────────────

/**
 * For BACKGROUND SERVICE output arriving asynchronously.
 *
 * The naive approach of calling rl.prompt(true) after each log line breaks
 * because readline tracks _prevRows (rows used by the previous prompt draw).
 * _refreshLine() moves the cursor UP by _prevRows before redrawing, which
 * overwrites the log line we just wrote.
 *
 * Fix: write the prompt string DIRECTLY via process.stdout.write (bypasses
 * _refreshLine entirely), then reset rl._prevRows = 0 so the next
 * rl.prompt() call from the command handler starts from the correct line.
 */
function serviceLog (label, color, line) {
  readline.clearLine(process.stdout, 0) // erase current prompt line
  readline.cursorTo(process.stdout, 0)
  process.stdout.write(`${color}[${label}]${C.reset} ${line}\n`)
  process.stdout.write(PROMPT) // redraw prompt directly, no _refreshLine
  rl._prevRows = 0 // keep readline's row tracking in sync
}

/**
 * For COMMAND RESPONSE output (status, errors, confirmations).
 * Plain write — no prompt redraw here; the rl.on('line') handler writes
 * a blank line and calls rl.prompt() once after the full response.
 */
function out (msg) {
  process.stdout.write(msg + '\n')
}

function pipeLines (label, color, data) {
  String(data).split('\n').filter(l => l.trim()).forEach(line =>
    serviceLog(label, color, line)
  )
}

// ── Service control ───────────────────────────────────────────────────────────
function startService (name) {
  if (running.has(name)) {
    out(`${C.yellow}${SERVICE_DEFS[name].label} is already running.${C.reset}`)
    return false
  }

  // ork / app-node are mutually exclusive — both run server.js on the same port
  if (BACKEND_SERVICES.has(name)) {
    const other = name === 'ork' ? 'app-node' : 'ork'
    if (running.has(other)) {
      out(`${C.yellow}Cannot start ${C.bold}${name}${C.reset}${C.yellow}: ` +
          `${C.bold}${other}${C.reset}${C.yellow} is already running. ` +
          `Stop it first with ${C.bold}stop ${other}${C.reset}${C.yellow}.${C.reset}`)
      return false
    }
  }

  const { label, color, cmd, args, opts } = SERVICE_DEFS[name]
  const proc = spawn(cmd, args, { ...opts, stdio: ['ignore', 'pipe', 'pipe'] })
  running.set(name, { proc, label, color, stopping: false })

  proc.stdout.on('data', d => pipeLines(label, color, d))
  proc.stderr.on('data', d => pipeLines(label, color, d))
  proc.on('exit', (code) => {
    const entry = running.get(name)
    running.delete(name)
    if (entry && entry.stopping) return // intentional kill — suppress message
    if (code !== 0 && code !== null) {
      serviceLog(label, color, `${C.red}exited with code ${code}${C.reset}`)
    } else {
      serviceLog(label, color, `${C.dim}stopped${C.reset}`)
    }
  })

  out(`${color}[${label}]${C.reset} ${C.dim}starting…${C.reset}`)
  return true
}

function stopService (name) {
  if (!running.has(name)) {
    out(`${C.dim}${name} is not running.${C.reset}`)
    return
  }
  const entry = running.get(name)
  entry.stopping = true
  try { entry.proc.kill() } catch (_) {}
  running.delete(name)
  out(`${entry.color}[${entry.label}]${C.reset} ${C.dim}stopped${C.reset}`)
}

// ── Commands ──────────────────────────────────────────────────────────────────
function cmdStart (args) {
  const target = (args[0] || 'all').toLowerCase()

  if (target === 'all') {
    const backendStarted = startService('app-node')
    const delay = backendStarted ? 4000 : 0
    setTimeout(() => startService('ui'), delay)
    return
  }

  if (!SERVICE_DEFS[target]) {
    out(`Unknown service ${C.bold}${target}${C.reset}. Choose: ${Object.keys(SERVICE_DEFS).join(', ')}, all`)
    return
  }

  startService(target)
}

function cmdStop (args) {
  const target = (args[0] || 'all').toLowerCase()

  if (target === 'all') {
    if (running.size === 0) { out(`${C.dim}Nothing is running.${C.reset}`); return }
    for (const name of [...running.keys()]) stopService(name)
    return
  }

  if (!SERVICE_DEFS[target]) {
    out(`Unknown service ${C.bold}${target}${C.reset}. Choose: ${Object.keys(SERVICE_DEFS).join(', ')}, all`)
    return
  }

  stopService(target)
}

function cmdStatus () {
  if (running.size === 0) {
    out(`${C.dim}No services running.${C.reset}`)
    return
  }
  out(`${C.bold}Running services:${C.reset}`)
  for (const [name, { label, color, proc }] of running) {
    const addr = name === 'app-node'
      ? 'http://localhost:3000'
      : name === 'ui'
        ? 'http://localhost:3030'
        : 'ork backend'
    out(`  ${C.green}●${C.reset} ${color}${label.padEnd(10)}${C.reset}` +
        ` pid ${C.bold}${proc.pid}${C.reset}  ${C.dim}${addr}${C.reset}`)
  }
}

function printHelp () {
  console.log(`
${C.bold}${C.green}MDK Site Monitor${C.reset}

${C.bold}Services:${C.reset}
  ${C.cyan}ork${C.reset}        ORK backend — mock Whatsminer M56S + worker
               ${C.dim}(no HTTP API)${C.reset}
  ${C.cyan}app-node${C.reset}   ORK backend + HTTP API on ${C.bold}:3000${C.reset} — noAuth mode
               ${C.dim}(includes ORK — use this for the full example)${C.reset}
  ${C.cyan}ui${C.reset}         Vite UI dev server on ${C.bold}:3030${C.reset}
               ${C.dim}(proxies /ork and /oauth to app-node)${C.reset}

${C.bold}Commands:${C.reset}
  ${C.bold}start${C.reset} [ork|app-node|ui|all]   Start a service  ${C.dim}(default: all)${C.reset}
  ${C.bold}stop${C.reset}  [ork|app-node|ui|all]   Stop a service   ${C.dim}(default: all)${C.reset}
  ${C.bold}status${C.reset}                        Show running services
  ${C.bold}help${C.reset}                          Show this message
  ${C.bold}exit${C.reset}                          Stop all services and quit

${C.dim}Tip: "start all" launches the full example — backend API + UI.
     Open http://localhost:3030 once the UI service starts.${C.reset}
`)
}

// ── Boot ──────────────────────────────────────────────────────────────────────
printHelp()
rl.prompt()

rl.on('line', (raw) => {
  const parts = raw.trim().split(/\s+/)
  const cmd = (parts[0] || '').toLowerCase()
  const args = parts.slice(1)

  switch (cmd) {
    case 'start': cmdStart(args); break
    case 'stop': cmdStop(args); break
    case 'status': case 's': cmdStatus(); break
    case 'help': case '?': printHelp(); break
    case 'exit': case 'quit': case 'q':
      cmdStop([])
      process.exit(0)
      break
    case '': break
    default:
      out(`Unknown command ${C.bold}${cmd}${C.reset}. Type ${C.bold}help${C.reset} for usage.`)
  }

  // Blank line for visual separation, then prompt via rl.prompt() so readline's
  // internal state (_prevRows, cursor) is properly reset for the next cycle.
  process.stdout.write('\n')
  rl.prompt()
})

rl.on('close', () => { cmdStop([]); process.exit(0) })

process.on('SIGINT', () => {
  console.log()
  cmdStop([])
  process.exit(0)
})
