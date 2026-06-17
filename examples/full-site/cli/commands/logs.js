'use strict'

const { resolveProcName } = require('./components')

// Show / search / follow one process's log:
//   logs <proc> [-f] [--grep <pattern>] [--n <lines>]
// Returns a { follow } handle when -f is set so the REPL can stop it on the
// next input line.
function logs (ctx, { args, flags }) {
  const token = args[0]
  if (!token) throw new Error('ERR_LOGS_TARGET_REQUIRED')
  const name = resolveProcName(token) || token
  if (!ctx.pm.has(name)) throw new Error(`ERR_PROC_NOT_FOUND: ${name}`)

  if (flags.grep) {
    const matches = ctx.pm.grepLog(name, String(flags.grep))
    ctx.print(matches.length ? matches.join('\n') : `(no matches for ${flags.grep} in ${name})`)
  } else {
    ctx.print(ctx.pm.tailLog(name, flags.n ? Number(flags.n) : 40))
  }

  if (flags.f) {
    ctx.print(`--- following ${name} (press enter to stop) ---`)
    return { follow: ctx.pm.followLog(name, (line) => ctx.print(line)) }
  }
}

module.exports = { logs }
