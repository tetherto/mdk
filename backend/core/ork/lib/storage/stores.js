'use strict'

/**
 * ORK Storage Layer
 *
 * Opens a Hyperbee via hp-svc-facs-store and creates named sub-databases
 * for each ORK concern:
 * - registry: Worker Registry (workerId → worker mapping)
 * - capabilities: Worker capability schemas (mdk-contract.json per worker)
 * - commandWal: Write-Ahead Log for Command State Machine
 *
 * Note: Telemetry storage is intentionally NOT here.
 * Workers own their own telemetry storage per HLD §4.3.1.
 *
 * Usage pattern (from hp-svc-facs-store):
 *   const bee = await storeFactory.getBee({ name: 'dbname' }, { keyEncoding: 'utf-8' })
 *   await bee.ready()
 *   const sub = bee.sub('namespace')
 */

const MAIN_DB = 'ork-db'

/**
 * Create and return all ORK Hyperbee stores
 * @param {object} storeFactory - The hp-svc-facs-store instance (this.store_s0)
 * @returns {object} Named stores with a close() method
 */
async function createStores (storeFactory) {
  const db = storeFactory.getBee(
    { name: MAIN_DB },
    { keyEncoding: 'utf-8' }
  )
  await db.ready()

  const registry = db.sub('ork-registry')
  const capabilities = db.sub('ork-capabilities')
  const commandWal = db.sub('ork-command-wal')

  return {
    db,
    registry,
    capabilities,
    commandWal,

    async close () {
      await db.close()
    }
  }
}

module.exports = { createStores, MAIN_DB }
