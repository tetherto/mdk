'use strict'

/**
 * Write-Ahead Log (WAL) for Command State Machine
 *
 * Provides append-only persistence for command state transitions.
 * Every state transition is written to the WAL before it takes effect,
 * enabling crash recovery.
 *
 * On restart, the Command State Machine sweeps the WAL:
 * - DISPATCHED/EXECUTING → forced to TIMEOUT
 * - TIMEOUT → re-queued if retry budget remains, else terminal
 * - QUEUED → left untouched (will be picked up naturally)
 * - SUCCESS/FAILED → already terminal, can be compacted
 */

const { COMMAND_STATES } = require('../modules/command-state-machine/states')

class WAL {
  constructor (store) {
    this.store = store
  }

  /**
   * Append a command state entry to the WAL
   * @param {string} commandId - Unique command identifier
   * @param {object} entry - Command state entry
   * @param {string} entry.state - Current command state
   * @param {string} entry.deviceId - Target device
   * @param {string} entry.command - Command name
   * @param {object} entry.params - Command parameters
   * @param {number} entry.retries - Remaining retry count
   * @param {number} entry.createdAt - Creation timestamp
   * @param {number} entry.updatedAt - Last update timestamp
   */
  async append (commandId, entry) {
    const value = Buffer.from(JSON.stringify({
      ...entry,
      updatedAt: Date.now()
    }))
    await this.store.put(commandId, value)
  }

  /**
   * Read a single command entry
   * @param {string} commandId
   * @returns {object|null}
   */
  async get (commandId) {
    const node = await this.store.get(commandId)
    if (!node) return null
    return JSON.parse(node.value.toString())
  }

  /**
   * Delete a terminal command entry (compaction)
   * @param {string} commandId
   */
  async delete (commandId) {
    await this.store.del(commandId)
  }

  /**
   * Sweep all entries — used for crash recovery
   * @returns {Array<{ commandId: string, entry: object }>}
   */
  async sweep () {
    const entries = []
    for await (const node of this.store.createReadStream()) {
      entries.push({
        commandId: node.key.toString(),
        entry: JSON.parse(node.value.toString())
      })
    }
    return entries
  }

  /**
   * Get all non-terminal entries (for monitoring / admin)
   * @returns {Array<{ commandId: string, entry: object }>}
   */
  async getPending () {
    const all = await this.sweep()
    return all.filter(({ entry }) =>
      entry.state !== COMMAND_STATES.SUCCESS &&
      entry.state !== COMMAND_STATES.FAILED
    )
  }
}

module.exports = { WAL }
