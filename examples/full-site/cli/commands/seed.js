'use strict'

const { SEED_TYPES, provisionDevice } = require('../../backend/provision')
const { requireRunning } = require('./components')

// seed <miner|container|powermeter> [--container <id>] [--pos <pdu_socket>] [--port <p>]
// Check the local ORK + worker are alive, then delegate registration to
// backend/provision.
async function seed (ctx, { args, flags }) {
  const type = args[0]
  const spec = SEED_TYPES[type]
  if (!spec) throw new Error(`ERR_UNKNOWN_SEED_TYPE: ${type || ''} (miner|container|powermeter)`)

  requireRunning(ctx, 'ork')
  requireRunning(ctx, spec.workerId)

  return provisionDevice(type, { root: ctx.root, flags, report: ctx.print })
}

module.exports = { seed }
