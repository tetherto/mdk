'use strict'

const EventEmitter = require('events')
const debug = require('debug')('mdk:ork:csm')
const crypto = require('crypto')
const { COMMAND_STATES, isTerminal, isValidTransition } = require('./states')
const { WAL } = require('../../storage/wal')
const { ACTIONS, MESSAGE_TYPES } = require('../../protocol/actions')
const { build: buildEnvelope } = require('../../protocol/envelope')

/**
 * Command State Machine
 *
 * Tracks the full execution lifecycle of every command dispatched through ORK.
 * WAL-backed — every state transition is persisted before it takes effect.
 *
 * State transitions:
 *   QUEUED → DISPATCHED → EXECUTING → SUCCESS | FAILED | TIMEOUT
 *   TIMEOUT → QUEUED (retry) | FAILED (exhausted)
 *
 * Crash recovery:
 *   On startup, sweeps WAL:
 *   - DISPATCHED/EXECUTING/TIMEOUT → forced to TIMEOUT + re-queue if retries remain
 *   - QUEUED → left untouched
 *
 * Events:
 *   'command:done' { commandId, state, result, error } — emitted on SUCCESS, FAILED, cancel
 */
class CommandStateMachine extends EventEmitter {
  constructor (opts) {
    super()
    this.wal = new WAL(opts.wal)
    this.workerChannel = opts.workerChannel
    this.registry = opts.registry
    this.maxRetries = opts.maxRetries !== undefined ? opts.maxRetries : 3
    this.timeoutMs = opts.timeoutMs || 30000

    this._commands = new Map()
    this._orkId = 'ork:kernel:default'
    this._draining = false
  }

  async recover () {
    const entries = await this.wal.sweep()
    let recovered = 0

    for (const { commandId, entry } of entries) {
      if (
        entry.state === COMMAND_STATES.DISPATCHED ||
        entry.state === COMMAND_STATES.EXECUTING ||
        entry.state === COMMAND_STATES.TIMEOUT
      ) {
        if (entry.retries > 0) {
          entry.state = COMMAND_STATES.QUEUED
          entry.retries -= 1
          await this.wal.append(commandId, entry)
          this._commands.set(commandId, entry)
          recovered++
        } else {
          entry.state = COMMAND_STATES.FAILED
          entry.error = 'ERR_RECOVERY_EXHAUSTED'
          await this.wal.append(commandId, entry)
        }
      } else if (entry.state === COMMAND_STATES.QUEUED) {
        this._commands.set(commandId, entry)
        recovered++
      } else if (isTerminal(entry.state)) {
        await this.wal.delete(commandId)
      }
    }

    debug('recovery complete: %d commands re-queued', recovered)
  }

  async enqueue (opts) {
    const commandId = crypto.randomUUID()
    const entry = {
      state: COMMAND_STATES.QUEUED,
      deviceId: opts.deviceId,
      command: opts.command,
      params: opts.params || {},
      requesterId: opts.requesterId,
      retries: this.maxRetries,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    await this.wal.append(commandId, entry)
    this._commands.set(commandId, entry)
    debug('command queued: %s (%s → %s)', commandId, opts.command, opts.deviceId)

    this._dispatch(commandId, entry).catch(err => {
      debug('dispatch error for %s: %s', commandId, err.message)
    })

    return commandId
  }

  async _dispatch (commandId, entry) {
    if (this._draining) return

    const resolution = this.registry.resolveWorkerForDevice(entry.deviceId)
    if (!resolution || !resolution.channel) return
    if (!this.registry.isRoutable(resolution.workerId)) return

    this._transition(entry, COMMAND_STATES.DISPATCHED)
    await this.wal.append(commandId, entry)

    this._transition(entry, COMMAND_STATES.EXECUTING)
    await this.wal.append(commandId, entry)

    try {
      const envelope = buildEnvelope({
        action: ACTIONS.COMMAND_REQUEST,
        type: MESSAGE_TYPES.REQUEST,
        sender: this._orkId,
        target: resolution.workerId,
        deviceId: entry.deviceId,
        payload: { commandId, command: entry.command, params: entry.params }
      })

      const result = await this.workerChannel.send(resolution.channel, envelope, {
        timeout: this.timeoutMs
      })

      if (this._draining) return

      if (result && result.payload && result.payload.status === 'SUCCESS') {
        this._transition(entry, COMMAND_STATES.SUCCESS)
        entry.result = result.payload.result || {}
      } else {
        this._transition(entry, COMMAND_STATES.FAILED)
        entry.error = (result && result.payload && result.payload.error) || 'ERR_COMMAND_FAILED'
      }
    } catch (err) {
      if (this._draining) return

      this._transition(entry, COMMAND_STATES.TIMEOUT)
      await this.wal.append(commandId, entry)

      if (entry.retries > 0) {
        entry.retries -= 1
        this._transition(entry, COMMAND_STATES.QUEUED)
        await this.wal.append(commandId, entry)
        debug('command timeout, re-queuing: %s (%d retries left)', commandId, entry.retries)
        setImmediate(() => this._dispatch(commandId, entry))
        return entry
      }

      this._transition(entry, COMMAND_STATES.FAILED)
      entry.error = 'ERR_MAX_RETRIES_EXHAUSTED'
    }

    await this.wal.append(commandId, entry)

    if (isTerminal(entry.state)) {
      this._commands.delete(commandId)
      await this.wal.delete(commandId)
      this.emit('command:done', {
        commandId,
        state: entry.state,
        result: entry.result || null,
        error: entry.error || null
      })
    }

    return entry
  }

  _transition (entry, newState) {
    if (!isValidTransition(entry.state, newState)) {
      debug('invalid transition: %s → %s', entry.state, newState)
    }
    entry.state = newState
  }

  async getState (commandId) {
    const memEntry = this._commands.get(commandId)
    if (memEntry) return memEntry
    return this.wal.get(commandId)
  }

  async cancel (commandId) {
    const entry = this._commands.get(commandId)
    if (!entry || entry.state !== COMMAND_STATES.QUEUED) return false

    entry.state = COMMAND_STATES.FAILED
    entry.error = 'ERR_CANCELLED'
    await this.wal.append(commandId, entry)
    this._commands.delete(commandId)
    await this.wal.delete(commandId)
    this.emit('command:done', {
      commandId,
      state: COMMAND_STATES.FAILED,
      result: null,
      error: 'ERR_CANCELLED'
    })
    return true
  }

  /**
   * Drain on shutdown.
   *
   * Sets _draining so any _dispatch coroutine that resumes after an await
   * exits without touching the WAL or _commands. Marks every EXECUTING or
   * DISPATCHED command TIMEOUT in the WAL (persisted for the next recovery
   * sweep) then clears the in-memory map.
   *
   * QUEUED commands are left in the WAL untouched — they are re-queued by
   * the next recover() call on restart.
   */
  async drain () {
    this._draining = true
    for (const [commandId, entry] of this._commands) {
      if (
        entry.state === COMMAND_STATES.EXECUTING ||
        entry.state === COMMAND_STATES.DISPATCHED
      ) {
        entry.state = COMMAND_STATES.TIMEOUT
        entry.error = 'ERR_ORK_SHUTDOWN'
        await this.wal.append(commandId, entry)
      }
    }
    this._commands.clear()
  }
}

module.exports = { CommandStateMachine }
