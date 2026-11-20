'use strict'

const device = require('../device')
const call = require('../call')

module.exports = async () => {
  const snap = await call(() => device.getSnap())
  if (snap.success) return snap
  if (snap.stats.status === 'offline') throw new Error('ERR_MINER_UNREACHABLE')
  const detail = snap.stats.errors && snap.stats.errors[0] ? snap.stats.errors[0].msg : 'unknown'
  throw new Error(`ERR_MINER_READ_FAILED: ${detail}`)
}
