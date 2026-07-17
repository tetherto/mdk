'use strict'

/**
 * Kernel Storage Layer
 *
 * Opens a Hyperbee via hp-svc-facs-store and creates named sub-databases
 * for each Kernel concern:
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

const MAIN_DB = 'kernel-db'
const ACTION_APPROVER_DB = 'action-approver'

/**
 * Create and return all Kernel Hyperbee stores
 * @param {object} storeFactory - The hp-svc-facs-store instance (this.store_s0)
 * @returns {object} Named stores with a close() method
 */
async function createStores (storeFactory) {
  const db = storeFactory.getBee(
    { name: MAIN_DB },
    { keyEncoding: 'utf-8' }
  )
  await db.ready()

  const registry = db.sub('kernel-registry')
  const capabilities = db.sub('ork-capabilities')
  const commandWal = db.sub('kernel-command-wal')

  const actionApproverDb = storeFactory.getBee(
    { name: ACTION_APPROVER_DB }
  )
  await actionApproverDb.ready()

  return {
    db,
    registry,
    capabilities,
    commandWal,
    actionApprover: actionApproverDb,

    async close () {
      await db.close()
      await actionApproverDb.close()
    }
  }
}

module.exports = { createStores, MAIN_DB }
