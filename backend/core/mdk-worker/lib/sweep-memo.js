'use strict'

/**
 * One device read per poll sweep, shared by every channel of it.
 *
 * The runtime hands the same `params` object to each handler it calls during
 * one sweep (see telemetry.js sweep()), and a fresh one to every other read,
 * so a read memoized on that object's identity is shared exactly for the
 * sweep and never beyond it: a later pull asks the device again, and a device
 * that has gone away fails instead of answering from a cache.
 *
 * Call the factory inside a plugin's own module so the memo lives in that
 * device's private registry: a memo shared between devices would hand device
 * B the rows device A read when the Kernel sweeps a whole worker with one
 * params object.
 *
 *   const sweep = require('@tetherto/mdk-worker/sweep-memo')()
 *   module.exports = (params) => sweep(params, 'stats', () => client.getStats())
 */
function createSweepMemo () {
  const bySweep = new WeakMap()
  return (params, name, read) => {
    const key = params !== null && typeof params === 'object' ? params : null
    let reads = key ? bySweep.get(key) : null
    if (!reads) {
      reads = new Map()
      if (key) bySweep.set(key, reads)
    }
    if (!reads.has(name)) reads.set(name, Promise.resolve().then(read))
    return reads.get(name)
  }
}

module.exports = createSweepMemo
