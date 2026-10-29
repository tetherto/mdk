'use strict'

const crypto = require('crypto')
const debug = require('debug')('mdk:kernel:command-log')
const { redactSecrets } = require('../action-manager/redact')

const DAY_MS = 24 * 60 * 60 * 1000
const DEFAULT_TTL_MS = 30 * DAY_MS
const PRUNE_INTERVAL_MS = 60 * 60 * 1000
const DEFAULT_LIMIT = 100

/**
 * Write-command log
 *
 * Append-only record of every command.request the Kernel sees: one `attempt`
 * entry per request (caller key and roles, command, target, params with
 * secrets redacted, QUEUED or REJECTED with its error) and one `settled` entry
 * per terminal outcome. Entries are keyed by time, read newest first, and
 * deleted once older than ttlMs (pruned at most hourly as entries arrive).
 */
class CommandLog {
  constructor (opts) {
    this.store = opts.store
    this.ttlMs = opts.ttlMs || DEFAULT_TTL_MS
    this._prunedAt = 0
  }

  async append (entry) {
    const ts = Date.now()
    const record = { ts, ...entry }
    if (record.params) record.params = redactSecrets(record.params)
    await this.store.put(_key(ts, crypto.randomBytes(8).toString('hex')), Buffer.from(JSON.stringify(record)))
    if (ts - this._prunedAt >= Math.min(this.ttlMs, PRUNE_INTERVAL_MS)) {
      this.prune().catch(err => debug('prune failed: %s', err.message))
    }
  }

  /**
   * @param {object} [query]
   * @param {number} [query.start] - earliest ts, inclusive
   * @param {number} [query.end] - latest ts, inclusive
   * @param {number} [query.limit] - most entries to return (default 100)
   */
  async query (query) {
    const { start, end, limit } = query || {}
    const range = { reverse: true, limit: limit || DEFAULT_LIMIT }
    if (start !== undefined) range.gte = _key(start, '')
    if (end !== undefined) range.lt = _key(end + 1, '')
    const entries = []
    for await (const node of this.store.createReadStream(range)) {
      entries.push(JSON.parse(node.value.toString()))
    }
    return entries
  }

  async prune () {
    this._prunedAt = Date.now()
    const expired = []
    for await (const node of this.store.createReadStream({ lt: _key(this._prunedAt - this.ttlMs, '') })) {
      expired.push(node.key)
    }
    for (const key of expired) await this.store.del(key)
  }
}

function _key (ts, suffix) {
  return `${String(Math.max(0, ts)).padStart(15, '0')}:${suffix}`
}

module.exports = { CommandLog }
