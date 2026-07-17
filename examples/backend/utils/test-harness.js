'use strict'

const path = require('path')
const { spawn } = require('child_process')

const NODE = process.execPath

// Spawns `script` (relative to pkgDir) and waits for it to exit cleanly.
// cwd is set to repoRoot so scripts that resolve paths from the repo root work correctly.
function runAutoExit (pkgDir, repoRoot, script, timeout) {
  return new Promise((resolve) => {
    const output = []
    const proc = spawn(NODE, [path.join(pkgDir, script)], {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe']
    })
    proc.stdout.on('data', (c) => output.push(c.toString()))
    proc.stderr.on('data', (c) => output.push(c.toString()))
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
      resolve({ ok: code === 0, reason: code !== 0 ? `exit code ${code}` : undefined, output: output.join('') })
    })
    proc.on('error', (err) => {
      if (done) return
      done = true
      clearTimeout(timer)
      resolve({ ok: false, reason: err.message, output: output.join('') })
    })
  })
}

// Spawns `script` (relative to pkgDir) and waits for `marker` to appear in combined stdout/stderr.
// Sends SIGTERM once the marker is found, then SIGKILL after 4 s as a fallback.
function runServer (pkgDir, repoRoot, script, marker, timeout) {
  return new Promise((resolve) => {
    const output = []
    const proc = spawn(NODE, [path.join(pkgDir, script)], {
      cwd: repoRoot,
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

module.exports = { runAutoExit, runServer }
