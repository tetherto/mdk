'use strict'

// Tests for argv helpers, workerSpec resolution, and proc entrypoint boot markers.
// The proc boot tests spawn real child processes (mocks, kernel) to confirm each
// prints MDK_READY before being terminated — no full-site orchestration required.

const test = require('brittle')
const os = require('os')
const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

const { parseMinerCount, arg } = require('../../backend/argv')
const { WORKER_SPECS, workerSpec } = require('../../backend/site')

const NODE = process.execPath
const PKG_DIR = path.join(__dirname, '..', '..')
const REPO_ROOT = path.join(__dirname, '..', '..', '..', '..')

// Spawn a proc script with args, wait for a marker in stdout/stderr, then kill.
function spawnProc (script, args, marker, timeout) {
  return new Promise((resolve) => {
    const output = []
    const proc = spawn(NODE, [path.join(PKG_DIR, script), ...args], {
      cwd: REPO_ROOT,
      stdio: ['ignore', 'pipe', 'pipe']
    })
    let found = false
    let closed = false
    const onData = (chunk) => {
      output.push(chunk.toString())
      if (!found && output.join('').includes(marker)) {
        found = true
        clearTimeout(timer)
        proc.stdout.removeAllListeners('data')
        proc.stderr.removeAllListeners('data')
        proc.kill('SIGTERM')
        setTimeout(() => { try { proc.kill('SIGKILL') } catch {} }, 4000).unref()
      }
    }
    proc.stdout.on('data', onData)
    proc.stderr.on('data', onData)
    const timer = setTimeout(() => {
      proc.stdout.removeAllListeners('data')
      proc.stderr.removeAllListeners('data')
      proc.kill('SIGKILL')
    }, timeout)
    proc.on('close', (code) => {
      if (closed) return
      closed = true
      clearTimeout(timer)
      resolve(found
        ? { ok: true, output: output.join('') }
        : { ok: false, reason: `exited (code ${code}) before marker "${marker}"`, output: output.join('') })
    })
    proc.on('error', (err) => {
      if (closed) return
      closed = true
      clearTimeout(timer)
      resolve({ ok: false, reason: err.message, output: output.join('') })
    })
  })
}

// --- argv helpers ---

test('parseMinerCount returns integer for a valid positive string', (t) => {
  t.is(parseMinerCount('5', 10), 5)
  t.is(parseMinerCount('100', 10), 100)
  t.is(parseMinerCount('3.7', 10), 3, 'truncates fractional input')
})

test('parseMinerCount falls back to default for invalid inputs', (t) => {
  t.is(parseMinerCount('0', 10), 10, 'zero is not a positive count')
  t.is(parseMinerCount('-1', 10), 10, 'negative not accepted')
  t.is(parseMinerCount('abc', 10), 10, 'non-numeric falls back')
  t.is(parseMinerCount('', 10), 10, 'empty string falls back')
  t.is(parseMinerCount(undefined, 10), 10, 'undefined falls back')
})

test('arg returns the value following the flag name in process.argv', (t) => {
  // process.argv is the real argv — verify the function returns the fallback when
  // the flag is absent (normal test-runner invocation won't include --worker).
  t.is(arg('--worker', 'default'), 'default', 'absent flag returns fallback')
  t.is(arg('--discovery', 'local'), 'local', 'absent flag returns fallback')
})

// --- workerSpec resolution ---

test('WORKER_SPECS lists all 11 worker families', (t) => {
  t.is(WORKER_SPECS.length, 11)
  const names = WORKER_SPECS.map(s => s.name)
  for (const expected of ['whatsminer', 'antminer', 'avalon', 'antspace', 'bitdeer', 'abb', 'satec', 'schneider', 'seneca', 'minerpool', 'f2pool']) {
    t.ok(names.includes(expected), `${expected} present`)
  }
})

test('workerSpec resolves every family by short name and by workerId', (t) => {
  for (const spec of WORKER_SPECS) {
    t.alike(workerSpec(spec.name), spec, `${spec.name}: name resolves`)
    t.alike(workerSpec(spec.workerId), spec, `${spec.workerId}: workerId resolves`)
  }
})

test('workerSpec returns null for an unknown token', (t) => {
  t.is(workerSpec('unknown'), null)
  t.is(workerSpec(''), null)
  t.is(workerSpec(null), null)
})

test('every WORKER_SPEC has a seed function or pool flag (no seedless thing workers)', (t) => {
  for (const spec of WORKER_SPECS) {
    if (spec.pool) {
      t.ok(spec.pool, `${spec.name}: pool spec has pool flag`)
    } else {
      t.is(typeof spec.seed, 'function', `${spec.name}: thing spec has seed function`)
    }
  }
})

// --- proc entrypoint boot tests ---

test('mocks proc boots all device families and announces MDK_READY', { timeout: 30000 }, async (t) => {
  const result = await spawnProc('backend/proc/mocks.js', ['--miners', '1'], 'MDK_READY mocks', 25000)
  t.ok(result.ok, result.reason || 'MDK_READY mocks appeared')
  t.ok(result.output.includes('miners=1'), 'ready line reports miner count')
})

test('kernel proc boots in local mode and writes .kernel-key', { timeout: 30000 }, async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-kernel-proc-'))
  t.teardown(() => { try { fs.rmSync(root, { recursive: true, force: true }) } catch {} })

  const result = await spawnProc('backend/proc/kernel.js', ['--root', root], 'MDK_READY kernel', 25000)
  t.ok(result.ok, result.reason || 'MDK_READY kernel appeared')
  t.ok(result.output.includes('mode=local'), 'reports discovery mode in ready line')

  const keyFile = path.join(root, '.kernel-key')
  t.ok(fs.existsSync(keyFile), '.kernel-key written to --root')
  const key = fs.readFileSync(keyFile, 'utf8').trim()
  t.is(key.length, 64, 'kernel key is a 64-char hex string')
})
