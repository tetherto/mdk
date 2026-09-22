'use strict'

/**
 * Backend examples test runner.
 *
 * Runs each standalone backend example one by one and reports pass/fail.
 *
 * Auto-exit examples: spawned and waited on; pass = exit code 0.
 * Server examples: spawned, waited for a success marker in stdout/stderr,
 *   then sent SIGTERM; pass = marker appeared before timeout.
 * Skipped examples: multi-process setups or scripts that require external
 *   config/services not part of this runner.
 *
 * Usage (from repo root):
 *   node examples/backend/run-examples.js
 */

const { spawn } = require('child_process')
const path = require('path')
const { setTimeout: sleep } = require('timers/promises')

const REPO_ROOT = path.resolve(__dirname, '..', '..')
const NODE = process.execPath

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
}

function label (tag, color) {
  return `${color}${C.bold}${tag}${C.reset}`
}

const PASS = label(' PASS ', C.green)
const FAIL = label(' FAIL ', C.red)
const SKIP = label(' SKIP ', C.yellow)

// ── Example definitions ───────────────────────────────────────────────────────

const EXAMPLES = [
  // ── Auto-exit: pass if process exits with code 0 ─────────────────────────

  {
    script: 'mdk-plugin-e2e/run.js',
    description: 'Plugin-authoring E2E (WorkerRuntime + worker plugin on mock devices + fleet-summary gateway plugin)',
    mode: 'auto',
    timeout: 90000
  },
  {
    script: 'minerpools/f2pool/index.js',
    description: 'F2Pool minerpool standalone example (mock API fetch, port 5063)',
    mode: 'auto',
    timeout: 20000
  },
  {
    script: 'minerpools/emcd/index.js',
    description: 'EMCD minerpool example (signed mock API, port 5065)',
    mode: 'auto',
    timeout: 30000
  },
  {
    script: 'kernel/demo.js',
    description: 'Kernel full feature parity demo (all telemetry + command types)',
    mode: 'auto',
    timeout: 30000
  },

  // ── Server: long-running; pass when successMarker appears, then SIGTERM ──

  {
    script: 'containers/antspace/index.js',
    description: 'Antspace HK3 container worker + Kernel (port 8000)',
    mode: 'server',
    successMarker: 'Ctrl+C to stop',
    timeout: 60000
  },
  {
    script: 'powermeters/abb/index.js',
    description: 'ABB B23 power meter example: Kernel + ABB worker (standalone, port 5060)',
    mode: 'server',
    successMarker: 'Ctrl+C to stop',
    timeout: 60000
  },
  {
    script: 'powermeters/satec/index.js',
    description: 'Satec PM180 power meter example: Kernel + Satec worker (standalone, port 5061)',
    mode: 'server',
    successMarker: 'Ctrl+C to stop',
    timeout: 60000
  },
  {
    script: 'powermeters/schneider/index.js',
    description: 'Schneider PM5340 power meter example: Kernel + Schneider worker (standalone, port 5062)',
    mode: 'server',
    successMarker: 'Ctrl+C to stop',
    timeout: 60000
  },
  {
    script: 'sensors/seneca/index.js',
    description: 'Seneca sensor example: Kernel + Seneca worker (standalone, port 5050)',
    mode: 'server',
    successMarker: 'Ctrl+C to stop',
    timeout: 60000
  },
  {
    script: 'minerpools/ocean/index.js',
    description: 'Ocean minerpool worker + mock pool API (standalone, port 5040)',
    mode: 'server',
    successMarker: 'Ctrl+C to stop',
    timeout: 30000
  },
  {
    script: 'kernel/command-flow.js',
    description: 'Kernel command flow reference (HRPC command cheatsheet)',
    mode: 'server',
    successMarker: 'Ctrl+C to stop',
    timeout: 60000
  },
  {
    script: 'kernel/telemetry-flow.js',
    description: 'Kernel telemetry flow reference (live pull + cheatsheet)',
    mode: 'server',
    successMarker: 'Live telemetry',
    timeout: 60000
  },
  {
    script: 'kernel/auth-whitelist.js',
    description: 'Kernel HRPC auth allowlist demo',
    mode: 'server',
    successMarker: 'Ctrl+C to stop',
    timeout: 60000
  },
  {
    script: 'kernel/kernel-shell.js',
    description: 'Kernel shell: createKernel() explicit lifecycle',
    mode: 'server',
    successMarker: 'Ctrl+C to stop',
    timeout: 60000
  },
  {
    script: 'miners/antminer/index.js',
    description: 'Antminer site: Kernel + gateway + 4 Antminer workers (S19XP/S19XPH/S21/S21PRO)',
    mode: 'server',
    successMarker: 'Ctrl+C to stop',
    timeout: 150000
  },
  {
    script: 'containers/bitdeer/index.js',
    description: 'Bitdeer D40 container example: Kernel + Bitdeer worker over MQTT (port 10883)',
    mode: 'server',
    successMarker: 'Ctrl+C to stop',
    timeout: 60000
  },
  {
    script: 'miners/avalon/index.js',
    description: 'Avalon miner site: Kernel + 1 Avalon A1346 worker',
    mode: 'server',
    successMarker: 'Ctrl+C to stop',
    timeout: 90000
  }
]

// ── Runner helpers ────────────────────────────────────────────────────────────

function runAutoExit (scriptPath, timeout) {
  return new Promise((resolve) => {
    const output = []
    const proc = spawn(NODE, [scriptPath], {
      cwd: REPO_ROOT,
      stdio: ['ignore', 'pipe', 'pipe']
    })

    const onData = (chunk) => output.push(chunk.toString())
    proc.stdout.on('data', onData)
    proc.stderr.on('data', onData)

    let done = false
    const timer = setTimeout(() => {
      if (done) return
      done = true
      proc.kill('SIGKILL')
      resolve({ ok: false, reason: `timed out after ${timeout / 1000}s`, output: output.join('') })
    }, timeout)

    proc.on('close', (code) => {
      if (done) return
      done = true
      clearTimeout(timer)
      if (code === 0) {
        resolve({ ok: true, output: output.join('') })
      } else {
        resolve({ ok: false, reason: `exited with code ${code}`, output: output.join('') })
      }
    })

    proc.on('error', (err) => {
      if (done) return
      done = true
      clearTimeout(timer)
      resolve({ ok: false, reason: err.message, output: output.join('') })
    })
  })
}

function runServer (scriptPath, successMarker, timeout) {
  return new Promise((resolve) => {
    const output = []
    const proc = spawn(NODE, [scriptPath], {
      cwd: REPO_ROOT,
      stdio: ['ignore', 'pipe', 'pipe']
    })

    let markerResult = null
    let closed = false

    const onData = (chunk) => {
      const text = chunk.toString()
      output.push(text)
      if (!markerResult && text.includes(successMarker)) {
        markerResult = { ok: true }
        clearTimeout(timer)
        proc.stdout.removeAllListeners('data')
        proc.stderr.removeAllListeners('data')
        proc.kill('SIGTERM')
        // force-kill after 4 s if it hasn't exited yet
        setTimeout(() => { try { proc.kill('SIGKILL') } catch {} }, 4000).unref()
      }
    }

    proc.stdout.on('data', onData)
    proc.stderr.on('data', onData)

    const timer = setTimeout(() => {
      proc.stdout.removeAllListeners('data')
      proc.stderr.removeAllListeners('data')
      proc.kill('SIGKILL')
      markerResult = { ok: false, reason: `timed out after ${timeout / 1000}s — marker "${successMarker}" never appeared` }
    }, timeout)

    proc.on('close', (code) => {
      if (closed) return
      closed = true
      clearTimeout(timer)
      if (markerResult) {
        resolve({ ...markerResult, output: output.join('') })
      } else {
        resolve({ ok: false, reason: `process exited prematurely (code ${code})`, output: output.join('') })
      }
    })

    proc.on('error', (err) => {
      if (closed) return
      closed = true
      clearTimeout(timer)
      resolve({ ok: false, reason: err.message, output: output.join('') })
    })
  })
}

function lastLines (text, n = 10) {
  return text.trim().split('\n').slice(-n).join('\n')
}

function formatDuration (ms) {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

// ── Prerequisites check ───────────────────────────────────────────────────────

function checkPrereqs () {
  const checks = [
    {
      pkg: '@tetherto/mdk-kernel',
      hint: 'npm --prefix backend/core run install:packages'
    }
  ]

  // Resolve via node's module algorithm rather than checking a hardcoded
  // node_modules path: npm workspaces may hoist these to the repo root's
  // node_modules instead of nesting them under each package.
  const missing = checks.filter(c => {
    try {
      require.resolve(c.pkg, { paths: [REPO_ROOT] })
      return false
    } catch {
      return true
    }
  })
  if (missing.length === 0) return

  console.error(`\n${C.red}${C.bold}  Missing dependencies — run first:${C.reset}`)
  for (const m of missing) {
    console.error(`${C.yellow}    ${m.hint}${C.reset}`)
  }
  console.error(`\n${C.dim}  Or install all at once: npm run setup${C.reset}\n`)
  process.exit(1)
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main () {
  checkPrereqs()
  const results = []
  const total = { pass: 0, fail: 0, skip: 0 }

  console.log(`\n${C.bold}Backend Examples Test Runner${C.reset}`)
  console.log(`${C.dim}Running ${EXAMPLES.length} examples from ${REPO_ROOT}${C.reset}\n`)

  for (const ex of EXAMPLES) {
    const scriptPath = path.join(__dirname, ex.script)
    const prefix = `  ${ex.script.padEnd(42)} `

    if (ex.mode === 'skip') {
      console.log(`${prefix}${SKIP}  ${C.gray}${ex.reason}${C.reset}`)
      results.push({ ...ex, status: 'skip' })
      total.skip++
      continue
    }

    process.stdout.write(`${prefix}${C.dim}running…${C.reset}`)

    const start = Date.now()
    let result

    if (ex.mode === 'auto') {
      result = await runAutoExit(scriptPath, ex.timeout)
    } else {
      result = await runServer(scriptPath, ex.successMarker, ex.timeout)
    }

    const elapsed = Date.now() - start
    // clear the "running…" line
    process.stdout.write('\r' + ' '.repeat(prefix.length + 12) + '\r')

    if (result.ok) {
      console.log(`${prefix}${PASS}  ${C.gray}${formatDuration(elapsed)}${C.reset}`)
      results.push({ ...ex, status: 'pass', elapsed })
      total.pass++
    } else {
      console.log(`${prefix}${FAIL}  ${C.gray}${formatDuration(elapsed)} — ${result.reason}${C.reset}`)
      if (result.output) {
        console.log(`${C.dim}     last output:${C.reset}`)
        lastLines(result.output, 8).split('\n').forEach(l => console.log(`${C.gray}     ${l}${C.reset}`))
      }
      results.push({ ...ex, status: 'fail', elapsed, reason: result.reason })
      total.fail++
    }

    // brief pause between examples to let ports fully release
    if (ex.mode !== 'skip') await sleep(1500)
  }

  // ── Summary ─────────────────────────────────────────────────────────────

  const line = '─'.repeat(56)
  console.log(`\n  ${C.dim}${line}${C.reset}`)
  console.log(`  ${C.bold}Results${C.reset}`)
  console.log(`  ${C.dim}${line}${C.reset}`)
  console.log(`  ${label(' PASS ', C.green)}  ${total.pass}`)
  console.log(`  ${label(' FAIL ', C.red)}  ${total.fail}`)
  console.log(`  ${label(' SKIP ', C.yellow)}  ${total.skip}`)
  console.log(`  ${C.dim}${line}${C.reset}\n`)

  if (total.fail > 0) {
    console.log(`${C.red}${C.bold}  ${total.fail} example(s) failed.${C.reset}\n`)
    process.exit(1)
  } else {
    console.log(`${C.green}${C.bold}  All examples passed.${C.reset}\n`)
  }
}

main().catch((err) => { console.error(err); process.exit(1) })
