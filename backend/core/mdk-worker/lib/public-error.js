'use strict'

const debug = require('debug')('mdk:worker:runtime')

// Errors that already carry a protocol code (ERR_*) are part of the wire
// contract and go back as-is; anything else (a stack-less TypeError from a
// handler, a driver message with an address or a credential in it) is logged
// here and replaced by the fallback code before it crosses the RPC boundary.
const ERR_CODE = /^ERR_[A-Z0-9_]+/

function publicError (err, fallback) {
  const message = err && typeof err.message === 'string' ? err.message : String(err)
  if (ERR_CODE.test(message)) return message
  debug('%s: %s', fallback, (err && err.stack) || message)
  return fallback
}

module.exports = { publicError }
