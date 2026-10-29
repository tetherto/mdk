'use strict'

const EventEmitter = require('events')
const { compilePolicy } = require('./policy')

// The runtime copy of spec.rbac, kept in a Hyperbee. mdk.yaml stays the only
// place policy is written: the Kernel applies it at boot and on
// `mdk rbac apply`, and this store only persists what was applied, so a
// Kernel started without a stack file keeps enforcing the last good policy.
//
// Keys (utf-8) → values (JSON buffers, the Kernel stores' encoding):
//   current                     → the record in force
//   history/<appliedAt>/<ver>   → every record ever applied, oldest first

const CURRENT = 'current'
const HISTORY = 'history/'

function _encode (record) {
  return Buffer.from(JSON.stringify(record))
}

function _decode (node) {
  return node ? JSON.parse(node.value.toString()) : null
}

class PolicyStore extends EventEmitter {
  /**
   * @param {object} opts
   * @param {import('hyperbee')} opts.bee - a Hyperbee (or sub) with utf-8 keys
   * @param {() => number} [opts.now] - clock, for tests
   */
  constructor ({ bee, now = Date.now } = {}) {
    super()
    if (!bee) throw new Error('ERR_RBAC_STORE_BEE_REQUIRED')
    this.bee = bee
    this.now = now
    this._record = null
    this._compiled = compilePolicy(null)
  }

  /**
   * Load the record in force. A stored policy that no longer validates (say,
   * after an upgrade tightened the rules) is refused, never half-loaded.
   * @returns {Promise<object|null>} the record, or null when none was ever applied
   */
  async load () {
    const record = _decode(await this.bee.get(CURRENT))
    if (!record) return null
    this._compiled = compilePolicy(record.policy)
    this._record = record
    return record
  }

  /**
   * Validate and compile `rbac`, persist it, and switch to it. An invalid
   * policy throws ERR_RBAC_POLICY_INVALID before anything is written, so the
   * policy in force is untouched. Applying the policy already in force is a
   * no-op.
   *
   * @param {object|null|undefined} rbac - spec.rbac; absent means deny-all
   * @param {{ source?: string, by?: string, via?: string }} [meta] - where it came from, for
   *   the record: `by` who applied it, `via` the app that acted for them
   * @returns {Promise<{ changed: boolean, record: object }>}
   */
  async apply (rbac, meta = {}) {
    const compiled = compilePolicy(rbac)
    if (this._record && this._record.version === compiled.version) return { changed: false, record: this._record }

    const record = {
      version: compiled.version,
      appliedAt: new Date(this.now()).toISOString(),
      source: meta.source || 'api',
      ...(meta.by ? { by: meta.by } : {}),
      ...(meta.via ? { via: meta.via } : {}),
      previous: this._record ? this._record.version : null,
      policy: compiled.policy
    }
    const batch = this.bee.batch()
    await batch.put(CURRENT, _encode(record))
    await batch.put(`${HISTORY}${record.appliedAt}/${record.version}`, _encode(record))
    await batch.flush()

    this._record = record
    this._compiled = compiled
    this.emit('change', compiled, record)
    return { changed: true, record }
  }

  /** The evaluator in force: deny-all until a policy is loaded or applied. */
  current () {
    return this._compiled
  }

  /** The record in force, or null. */
  info () {
    return this._record
  }

  /** Applied records, oldest first. */
  async history ({ limit } = {}) {
    const out = []
    for await (const node of this.bee.createReadStream({ gte: HISTORY, lt: `${HISTORY}\xff`, ...(limit ? { limit, reverse: true } : {}) })) {
      out.push(_decode(node))
    }
    return limit ? out.reverse() : out
  }
}

module.exports = { PolicyStore }
