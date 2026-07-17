'use strict'

// Command registry + dispatcher. cli.js wraps this with readline; tests drive
// dispatch() directly with a programmatic ctx. Handler errors are caught and
// printed rather than propagated.

const { parseCommand } = require('./parse')
const { up } = require('./up')
const { start } = require('./start')
const { seed } = require('./seed')
const { ps } = require('./ps')
const { status } = require('./status')
const { keys } = require('./keys')
const { logs } = require('./logs')
const { stop } = require('./stop')
const { down } = require('./down')

const HELP = `MDK full-site CLI — commands:
  up [--miners N] [--no-ui] [--discovery local|dht]
                                   bring up the whole site (N per miner family, default 10 → 30 total)
  start mocks|kernel|gateway|ui|mcp-server      start one component
  start worker <whatsminer|antminer|avalon|antspace|bitdeer|abb|satec|schneider|seneca|minerpool|f2pool>
  seed whatsminer|antminer|avalon [--container <id>] [--pos <pdu_socket>] [--port <p>]
  seed antspace|bitdeer|abb|satec|schneider|seneca [--container <id>] [--port <p>]
  status                           query Kernel over HRPC: workers, devices, health
  keys                             print Kernel + worker RPC public keys
  ps                               list tracked processes (pid, status, uptime, log)
  logs <proc> [-f] [--grep <pat>] [--n <lines>]
  stop <proc>                      stop one component
  down                             stop everything
  help                             show this help
  exit                             stop everything and quit`

function help (ctx) {
  ctx.print(HELP)
}

async function exit (ctx) {
  if (ctx.exit) return ctx.exit()
}

const ROUTES = { up, start, seed, ps, status, keys, logs, stop, down, help, exit, quit: exit }

function createDispatcher (ctx) {
  async function dispatch (line) {
    const parsed = parseCommand(line)
    if (!parsed) return
    const handler = ROUTES[parsed.command]
    if (!handler) {
      ctx.print(`ERR_UNKNOWN_COMMAND: ${parsed.command} (try 'help')`)
      return
    }
    try {
      return await handler(ctx, parsed)
    } catch (err) {
      ctx.print(err.message)
    }
  }

  return { dispatch, help: HELP, routes: ROUTES }
}

module.exports = { createDispatcher, parseCommand, HELP }
