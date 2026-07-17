'use strict'

// render.js — terminal formatting for the CLI (pure; unit-testable, no network).
// Takes the shapes produced by the MDK layer (backend/inspect.js) and turns them
// into the tables the REPL prints. No MDK or transport knowledge here.

function renderStatus (status) {
  const lines = []
  lines.push(`Kernel  ${status.kernelKey}`)
  lines.push('')
  if (!status.workers.length) {
    lines.push('  (no workers registered)')
    return lines.join('\n')
  }
  const pad = (s, n) => String(s).padEnd(n)
  lines.push(`  ${pad('WORKER', 20)}${pad('STATE', 10)}${pad('HEALTH', 10)}DEVICES`)
  for (const w of status.workers) {
    lines.push(`  ${pad(w.workerId, 20)}${pad(w.state, 10)}${pad(w.healthState, 10)}${w.deviceCount}`)
  }
  lines.push('')
  lines.push(`  ${status.workers.length} worker(s), ${status.totalDevices} device(s)`)
  return lines.join('\n')
}

function renderKeys (keys) {
  const lines = []
  lines.push(`${'Kernel'.padEnd(20)}${keys.kernelKey || '(not started)'}`)
  for (const w of keys.workers) {
    lines.push(`${w.workerId.padEnd(20)}${w.rpcKey}`)
  }
  if (!keys.workers.length) lines.push('(no worker keys published yet)')
  return lines.join('\n')
}

module.exports = { renderStatus, renderKeys }
