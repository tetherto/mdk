'use strict'

// Parse a REPL line into { command, args, flags }.
//   up --miners 3            -> { command:'up', args:[], flags:{miners:'3'} }
//   start worker miner       -> { command:'start', args:['worker','miner'], flags:{} }
//   logs ork -f --grep boot  -> { command:'logs', args:['ork'], flags:{f:true, grep:'boot'} }
//
// A `--flag` consumes the next token as its value unless that token is itself a
// flag, in which case it is a boolean. `-x` short flags are always boolean.
function parseCommand (line) {
  const tokens = String(line == null ? '' : line).trim().split(/\s+/).filter(Boolean)
  if (!tokens.length) return null

  const command = tokens[0]
  const args = []
  const flags = {}

  for (let i = 1; i < tokens.length; i++) {
    const t = tokens[i]
    if (t.startsWith('--')) {
      const key = t.slice(2)
      const next = tokens[i + 1]
      if (next !== undefined && !next.startsWith('-')) { flags[key] = next; i++ } else { flags[key] = true }
    } else if (t.startsWith('-') && t.length > 1) {
      flags[t.slice(1)] = true
    } else {
      args.push(t)
    }
  }

  return { command, args, flags }
}

module.exports = { parseCommand }
