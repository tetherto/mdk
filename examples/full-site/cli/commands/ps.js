'use strict'

function ps (ctx) {
  const rows = ctx.pm.list()
  if (!rows.length) { ctx.print('(no processes)'); return }

  const pad = (s, n) => String(s).padEnd(n)
  ctx.print(`${pad('NAME', 18)}${pad('PID', 8)}${pad('STATUS', 10)}${pad('UPTIME', 9)}LOG`)
  for (const r of rows) {
    const uptime = r.uptimeMs == null ? '-' : `${Math.round(r.uptimeMs / 1000)}s`
    ctx.print(`${pad(r.name, 18)}${pad(r.pid == null ? '-' : r.pid, 8)}${pad(r.status, 10)}${pad(uptime, 9)}${r.logPath}`)
  }
}

module.exports = { ps }
