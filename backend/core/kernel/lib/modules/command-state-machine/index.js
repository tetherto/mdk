'use strict'

const EventEmitter = require('events')
const debug = require('debug')('mdk:kernel:csm')
const crypto = require('crypto')
const { isDeepStrictEqual } = require('util')
const { COMMAND_STATES, VERIFICATION_STATES, isTerminal, isValidTransition } = require('./states')
const { WAL } = require('../../storage/wal')
const { ACTIONS, COMMAND_SCOPES, MESSAGE_TYPES } = require('../../protocol/actions')
const { build: buildEnvelope } = require('../../protocol/envelope')

const DAY_MS = 24 * 60 * 60 * 1000
const PRUNE_INTERVAL_MS = 60 * 60 * 1000

/**
 * Command State Machine
 *
 * Tracks the full execution lifecycle of every command dispatched through Kernel.
 * WAL-backed — every state transition is persisted before it takes effect.
 *
 * State transitions:
 *   QUEUED → DISPATCHED → EXECUTING → SUCCESS | FAILED | TIMEOUT
 *
 * A command that was sent but got no response may already have run on the
 * device, so it settles as TIMEOUT (ERR_COMMAND_UNCONFIRMED) and is never
 * re-sent; the caller reconciles by reading the device state back.
 *
 * Device verification:
 *   A SUCCESS or TIMEOUT command whose contract entry declares `verify` gets
 *   verification PENDING, then the declared telemetry is read back from the
 *   Worker every verifyIntervalMs, starting one interval after it settles so
 *   a device read cached before the command cannot confirm it, until it
 *   equals the requested param (VERIFIED) or `withinMs` passes (UNVERIFIED).
 *   Without `verify` it is NOT_DECLARED.
 *
 * Crash recovery:
 *   On startup, sweeps WAL:
 *   - DISPATCHED/EXECUTING → TIMEOUT (ERR_COMMAND_UNCONFIRMED)
 *   - QUEUED → left untouched
 *   - SUCCESS/FAILED/TIMEOUT → kept for resultTtlMs, then compacted
 *   - verification PENDING → UNVERIFIED
 *
 * Events:
 *   'command:done' { commandId, state, result, error } — emitted on SUCCESS, FAILED, TIMEOUT, cancel
 */
class CommandStateMachine extends EventEmitter {
  constructor (opts) {
    super()
    this.wal = new WAL(opts.wal)
    this.workerChannel = opts.workerChannel
    this.registry = opts.registry
    this.telemetryCollector = opts.telemetryCollector
    this.timeoutMs = opts.timeoutMs || 30000
    this.resultTtlMs = opts.resultTtlMs || DAY_MS
    this.verifyIntervalMs = opts.verifyIntervalMs || 5000

    this._commands = new Map()
    this._kernelId = 'kernel:kernel:default'
    this._draining = false
    this._prunedAt = Date.now()
  }

  async recover () {
    const entries = await this.wal.sweep()
    const cutoff = Date.now() - this.resultTtlMs
    let recovered = 0

    for (const { commandId, entry } of entries) {
      if (
        entry.state === COMMAND_STATES.DISPATCHED ||
        entry.state === COMMAND_STATES.EXECUTING
      ) {
        entry.state = COMMAND_STATES.TIMEOUT
        entry.error = 'ERR_COMMAND_UNCONFIRMED'
        entry.verification = _verification(entry, VERIFICATION_STATES.UNVERIFIED)
        await this.wal.append(commandId, entry)
      } else if (entry.state === COMMAND_STATES.QUEUED) {
        this._commands.set(commandId, entry)
        recovered++
      } else if (entry.updatedAt < cutoff) {
        await this.wal.delete(commandId)
      } else if (entry.verification && entry.verification.state === VERIFICATION_STATES.PENDING) {
        entry.verification.state = VERIFICATION_STATES.UNVERIFIED
        await this.wal.append(commandId, entry)
      }
    }

    debug('recovery complete: %d commands re-queued', recovered)
  }

  async prune () {
    this._prunedAt = Date.now()
    const cutoff = this._prunedAt - this.resultTtlMs
    for (const { commandId, entry } of await this.wal.sweep()) {
      if (isTerminal(entry.state) && entry.updatedAt < cutoff) await this.wal.delete(commandId)
    }
  }

  async enqueue (opts) {
    const commandId = crypto.randomUUID()
    const entry = {
      state: COMMAND_STATES.QUEUED,
      scope: opts.scope || COMMAND_SCOPES.DEVICE,
      deviceId: opts.deviceId || null,
      workerId: opts.workerId || null,
      targets: opts.targets || null,
      command: opts.command,
      params: opts.params || {},
      requesterId: opts.requesterId,
      ...(opts.via ? { via: opts.via } : {}),
      verify: opts.verify || null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    await this.wal.append(commandId, entry)
    this._commands.set(commandId, entry)
    if (Date.now() - this._prunedAt >= Math.min(this.resultTtlMs, PRUNE_INTERVAL_MS)) {
      this.prune().catch(err => debug('prune failed: %s', err.message))
    }
    debug(
      'command queued: %s (%s %s → %s)',
      commandId,
      opts.command,
      entry.scope,
      entry.scope === COMMAND_SCOPES.DEVICE ? entry.deviceId : entry.workerId
    )

    this._dispatch(commandId, entry).catch(err => {
      debug('dispatch error for %s: %s', commandId, err.message)
    })

    return commandId
  }

  _resolveTarget (entry) {
    if (entry.scope && entry.scope !== COMMAND_SCOPES.DEVICE) {
      return entry.workerId ? this.registry.resolveWorker(entry.workerId) : null
    }
    return this.registry.resolveWorkerForDevice(entry.deviceId)
  }

  async _dispatch (commandId, entry) {
    if (this._draining) return

    const resolution = this._resolveTarget(entry)
    if (!resolution || !resolution.channel) return
    if (!this.registry.isRoutable(resolution.workerId)) return

    this._transition(entry, COMMAND_STATES.DISPATCHED)
    await this.wal.append(commandId, entry)

    this._transition(entry, COMMAND_STATES.EXECUTING)
    await this.wal.append(commandId, entry)

    try {
      const payload = {
        commandId,
        command: entry.command,
        params: entry.params,
        scope: entry.scope || COMMAND_SCOPES.DEVICE
      }
      if (entry.workerId) payload.workerId = entry.workerId
      if (entry.targets) payload.targets = entry.targets

      const envelope = buildEnvelope({
        action: ACTIONS.COMMAND_REQUEST,
        type: MESSAGE_TYPES.REQUEST,
        sender: this._kernelId,
        target: resolution.workerId,
        deviceId: entry.deviceId,
        payload
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

      debug('command unconfirmed, not retrying: %s (%s)', commandId, err.message)
      this._transition(entry, COMMAND_STATES.TIMEOUT)
      entry.error = 'ERR_COMMAND_UNCONFIRMED'
    }

    if (entry.state !== COMMAND_STATES.FAILED) {
      entry.verification = _verification(entry, VERIFICATION_STATES.PENDING)
    }
    await this.wal.append(commandId, entry)

    if (isTerminal(entry.state)) {
      this._commands.delete(commandId)
      this.emit('command:done', {
        commandId,
        state: entry.state,
        result: entry.result || null,
        error: entry.error || null
      })
      if (entry.verification && entry.verification.state === VERIFICATION_STATES.PENDING) {
        this._verify(commandId, entry).catch(err => {
          debug('verification error for %s: %s', commandId, err.message)
        })
      }
    }

    return entry
  }

  async _verify (commandId, entry) {
    const { verification } = entry
    const deadline = Date.now() + entry.verify.withinMs

    for (;;) {
      await new Promise(resolve => setTimeout(resolve, this.verifyIntervalMs).unref())
      if (this._draining) return
      const reading = await this.telemetryCollector.pull(entry.deviceId, { type: verification.telemetry })
      if (reading && reading.error == null && 'value' in reading) {
        verification.observed = reading.value
        verification.at = reading.timestamp
        if (isDeepStrictEqual(reading.value, verification.expected)) {
          verification.state = VERIFICATION_STATES.VERIFIED
          break
        }
      }
      if (Date.now() >= deadline) {
        verification.state = VERIFICATION_STATES.UNVERIFIED
        break
      }
    }

    if (this._draining) return
    await this.wal.append(commandId, entry)
    debug('command %s verification %s', commandId, verification.state)
  }

  _transition (entry, newState) {
    if (!isValidTransition(entry.state, newState)) {
      debug('invalid transition: %s → %s', entry.state, newState)
    }
    entry.state = newState
    entry.updatedAt = Date.now()
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
        entry.error = 'ERR_KERNEL_SHUTDOWN'
        entry.verification = _verification(entry, VERIFICATION_STATES.UNVERIFIED)
        await this.wal.append(commandId, entry)
      }
    }
    this._commands.clear()
  }
}

function _verification (entry, state) {
  if (!entry.verify) return { state: VERIFICATION_STATES.NOT_DECLARED }
  return { state, telemetry: entry.verify.telemetry, expected: entry.verify.expected, observed: null, at: null }
}

module.exports = { CommandStateMachine }
