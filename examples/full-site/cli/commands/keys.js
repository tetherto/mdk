'use strict'

const { readKeys } = require('../../backend/inspect')
const { renderKeys } = require('../render')

// Print the Kernel public key and each worker's RPC public key.
function keys (ctx) {
  ctx.print(renderKeys(readKeys(ctx.root)))
}

module.exports = { keys }
