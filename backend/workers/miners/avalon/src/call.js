'use strict'

// A transport failure (ECONNREFUSED, a timeout) surfaces from the CGMiner
// client as a bare socket error; the runtime's health channel and the
// smoke runner key on an ERR_* code, so wrap anything that is not one.
module.exports = async (fn) => {
  try {
    return await fn()
  } catch (err) {
    const detail = String((err && err.message) || err)
    if (/^ERR_/.test(detail)) throw err
    throw new Error(`ERR_MINER_UNREACHABLE: ${detail}`)
  }
}
