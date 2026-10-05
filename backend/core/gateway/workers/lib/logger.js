'use strict'

const pino = require('pino')

// Everything the gateway prints — Fastify's request lines and every plugin's
// logger — goes through one destination, so a plugin failure is formatted and
// ordered like the rest of the log instead of arriving as a bare console line.

let destination = null

function _destination () {
  if (destination) return destination

  // Human-readable in a terminal; NDJSON when stdout is piped, which is what
  // Docker, systemd and log shippers expect to parse.
  destination = process.stdout.isTTY
    ? require('pino-pretty')({
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname',
      singleLine: true
    })
    : pino.destination(1)

  return destination
}

// `debug: 0` in the gateway's common.json is the default, so debug lines are
// opt-in the same way they are for the other facilities.
function _level (conf) {
  return conf?.debug ? 'debug' : 'info'
}

// Fastify announces every address it binds, and logs an "incoming request" line
// paired with each "request completed". The CLI already prints the gateway URL,
// and one line per request is what an operator can actually read.
const hooks = {
  logMethod (args, method) {
    const msg = typeof args[0] === 'string' ? args[0] : typeof args[1] === 'string' ? args[1] : ''
    if (msg.startsWith('Server listening at') || msg === 'incoming request') return
    return method.apply(this, args)
  }
}

function fastifyLoggerOptions (conf) {
  return { level: _level(conf), stream: _destination(), hooks }
}

let root = null

/**
 * The logger a plugin sees as `logger` on its ambient context: pino's
 * error/warn/info/debug/trace/fatal plus child(), tagged with the plugin name so
 * a line names who wrote it.
 */
function pluginLogger (name, conf) {
  if (!root) root = pino({ level: _level(conf) }, _destination())
  return root.child({ name })
}

/**
 * The same logger for the few things the gateway itself has to tell an operator
 * — a plugin's `onReady` callback throwing, say. Tagged like a plugin's so the
 * line names its source, and on the one stream, so it is ordered with the rest.
 */
function gatewayLogger (conf) {
  return pluginLogger('gateway', conf)
}

module.exports = { fastifyLoggerOptions, pluginLogger, gatewayLogger }
