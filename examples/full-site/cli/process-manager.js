'use strict'

// ProcessManager — spawns and tracks each MDK component as its own OS process.
//
// Each child's stdout+stderr is piped to its own log file under
// <root>/logs/<name>.log; readiness is detected by watching that stream for the
// child's `MDK_READY` token (so callers can sequence dependency order). Status
// is real process state, not a guess: starting → running (token seen) → exited
// | failed. The child_process.spawn dependency is injectable for unit tests.

const path = require('path')
const fs = require('fs')
const debug = require('debug')('mdk:example:procmgr')

const READY_TOKEN = 'MDK_READY'
const KILL_GRACE_MS = 5000
const READY_BUF_CAP = 8192

class ProcessManager {
  constructor ({ root, cwd, logsDir, spawn } = {}) {
    if (!root) throw new Error('ERR_PROCMGR_ROOT_REQUIRED')
    this.root = root
    this.cwd = cwd || process.cwd()
    this.logsDir = logsDir || path.join(root, 'logs')
    this._spawn = spawn || require('child_process').spawn
    this._procs = new Map()
    fs.mkdirSync(this.logsDir, { recursive: true })
  }

  logPath (name) {
    return path.join(this.logsDir, `${name}.log`)
  }

  has (name) {
    return this._procs.has(name)
  }

  isAlive (name) {
    const rec = this._procs.get(name)
    return !!rec && !rec._exited
  }

  get (name) {
    const rec = this._procs.get(name)
    if (!rec) throw new Error(`ERR_PROC_NOT_FOUND: ${name}`)
    return rec
  }

  // Spawn `node <entry> <argv>`. Throws if a live process already owns the name.
  spawn (name, entry, argv = [], { readyToken = READY_TOKEN, env } = {}) {
    if (this.isAlive(name)) throw new Error(`ERR_PROC_ALREADY_RUNNING: ${name}`)

    const logPath = this.logPath(name)
    const stream = fs.createWriteStream(logPath, { flags: 'a' })
    stream.write(`\n--- ${name} started ${new Date().toISOString()} ---\n`)

    const child = this._spawn('node', [entry, ...argv], {
      cwd: this.cwd,
      env: env ? Object.assign({}, process.env, env) : process.env
    })

    const rec = {
      name,
      entry,
      argv,
      child,
      pid: child.pid,
      status: 'starting',
      startedAt: Date.now(),
      logPath,
      readyToken,
      exitCode: null,
      signal: null,
      error: null,
      _ready: false,
      _exited: false,
      _stopping: false,
      _readyBuf: '',
      _readyWaiters: [],
      _stream: stream
    }

    const onChunk = (chunk) => {
      try { stream.write(chunk) } catch {}
      if (rec._ready) return
      rec._readyBuf = (rec._readyBuf + chunk.toString()).slice(-READY_BUF_CAP)
      if (rec._readyBuf.includes(readyToken)) {
        rec._ready = true
        rec.status = 'running'
        rec._readyBuf = ''
        for (const w of rec._readyWaiters) w.resolve(rec)
        rec._readyWaiters = []
      }
    }

    if (child.stdout) child.stdout.on('data', onChunk)
    if (child.stderr) child.stderr.on('data', onChunk)

    child.on('exit', (code, signal) => {
      rec._exited = true
      rec.exitCode = code
      rec.signal = signal
      rec.status = (rec._stopping || code === 0) ? 'exited' : 'failed'
      try { stream.end(`--- ${name} ${rec.status} code=${code} signal=${signal} ---\n`) } catch {}
      const err = new Error(`ERR_PROC_EXITED: ${name} (code ${code}, signal ${signal})`)
      for (const w of rec._readyWaiters) w.reject(err)
      rec._readyWaiters = []
      debug('%s %s (code=%s signal=%s)', name, rec.status, code, signal)
    })

    child.on('error', (err) => {
      rec._exited = true
      rec.status = 'failed'
      rec.error = err.message
      for (const w of rec._readyWaiters) w.reject(err)
      rec._readyWaiters = []
      debug('%s spawn error: %s', name, err.message)
    })

    this._procs.set(name, rec)
    debug('spawned %s (pid %s): node %s %s', name, child.pid, entry, argv.join(' '))
    return rec
  }

  // Resolve when the child prints its ready token; reject on exit/error/timeout.
  waitForReady (name, timeoutMs = 30000) {
    const rec = this.get(name)
    if (rec._ready) return Promise.resolve(rec)
    if (rec._exited) return Promise.reject(new Error(`ERR_PROC_NOT_RUNNING: ${name}`))
    return new Promise((resolve, reject) => {
      const w = { resolve, reject }
      rec._readyWaiters.push(w)
      const timer = setTimeout(() => {
        const i = rec._readyWaiters.indexOf(w)
        if (i !== -1) rec._readyWaiters.splice(i, 1)
        reject(new Error(`ERR_PROC_READY_TIMEOUT: ${name}`))
      }, timeoutMs)
      timer.unref()
    })
  }

  // SIGTERM, escalating to SIGKILL after a grace period. Resolves on exit.
  stop (name, { graceMs = KILL_GRACE_MS } = {}) {
    const rec = this._procs.get(name)
    if (!rec) throw new Error(`ERR_PROC_NOT_FOUND: ${name}`)
    if (rec._exited) return Promise.resolve(rec)
    rec._stopping = true
    return new Promise((resolve) => {
      const killTimer = setTimeout(() => { try { rec.child.kill('SIGKILL') } catch {} }, graceMs)
      killTimer.unref()
      rec.child.once('exit', () => { clearTimeout(killTimer); resolve(rec) })
      try { rec.child.kill('SIGTERM') } catch { clearTimeout(killTimer); resolve(rec) }
    })
  }

  // Stop everything in reverse spawn order (e.g. ui → app-node → workers → ork
  // → mocks), so dependents go down before their dependencies.
  async stopAll (opts) {
    const names = [...this._procs.keys()].reverse()
    for (const name of names) {
      if (this.isAlive(name)) await this.stop(name, opts)
    }
    return names
  }

  // Snapshot for `ps`. uptime is ms since spawn while alive, else null.
  list () {
    const now = Date.now()
    return [...this._procs.values()].map((rec) => ({
      name: rec.name,
      pid: rec.pid,
      status: rec.status,
      uptimeMs: rec._exited ? null : now - rec.startedAt,
      logPath: rec.logPath
    }))
  }

  // --- log access ------------------------------------------------------------

  readLog (name) {
    const p = this.logPath(name)
    try { return fs.readFileSync(p, 'utf8') } catch { return '' }
  }

  tailLog (name, lines = 40) {
    const all = this.readLog(name).split('\n')
    return all.slice(-Math.max(1, lines + 1)).join('\n')
  }

  grepLog (name, pattern) {
    const re = pattern instanceof RegExp ? pattern : new RegExp(pattern)
    return this.readLog(name).split('\n').filter((l) => re.test(l))
  }

  // Follow appended log lines (tail -f). Returns { stop } to detach.
  followLog (name, onLine) {
    const p = this.logPath(name)
    if (!fs.existsSync(p)) fs.closeSync(fs.openSync(p, 'a'))
    let pos = fs.statSync(p).size
    const drain = () => {
      let size
      try { size = fs.statSync(p).size } catch { return }
      if (size <= pos) { if (size < pos) pos = 0; return }
      const stream = fs.createReadStream(p, { start: pos, end: size - 1, encoding: 'utf8' })
      let buf = ''
      stream.on('data', (d) => { buf += d })
      stream.on('end', () => {
        pos = size
        for (const line of buf.split('\n')) if (line) onLine(line)
      })
    }
    const watcher = fs.watch(p, () => drain())
    return { stop () { try { watcher.close() } catch {} } }
  }
}

module.exports = { ProcessManager, READY_TOKEN }
