'use strict'

/**
 * MDK Whatsminer Worker — Full Feature Parity Example
 *
 * Shows how the existing ThingManager-based worker maps to the MDK Protocol.
 * The worker keeps its entire internal machinery:
 *   - Thing registry (registerThing, updateThing, forgetThings, listThings)
 *   - Telemetry collection (collectThingSnap → metrics)
 *   - Log storage (tailLog, getHistoricalLogs)
 *   - Settings (getSettings, saveSettings)
 *   - Comments (save, edit, delete)
 *   - Actions (reboot, setPowerMode, setLED, setupPools)
 *   - Stats (aggrStats, real-time data)
 *
 * What changes is ONLY the communication interface:
 *   - telemetry.pull + query → read operations (listThings, tailLog, metrics, etc.)
 *   - command.request → write operations (registerThing, reboot, setPools, etc.)
 *   - state.pull → worker-level state snapshot
 *   - health.ping → liveness probe
 */

const contract = require('./mdk-contract.json')
const { ACTIONS } = require('../../lib/protocol/actions')
const { buildResponse } = require('../../lib/protocol/envelope')

// ─── Simulated Internal Services (mirrors ThingManager services) ─────

/**
 * In production, this would be the actual WhatsminerManager extending
 * MinerManager → ThingManager with all its services. Here we simulate
 * the key features to show the protocol mapping.
 */
class ThingStore {
  constructor () {
    this.things = new Map()
    this.logs = new Map()
    this.comments = new Map()
    this.settings = { collectSnapsItvMs: 60000, autoReconnect: true }
  }

  // ─── DataService equivalents ─────────────────────────────────────

  registerThing (req) {
    if (!req.id) req.id = `thg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    if (!req.opts || !req.opts.address) throw new Error('ERR_THING_VALIDATE_OPTS_INVALID')

    // Check for duplicate IP
    for (const [, thg] of this.things) {
      if (thg.opts.address === req.opts.address) {
        throw new Error('ERR_THING_IP_ADDRESS_EXISTS')
      }
    }

    const thing = {
      id: req.id,
      type: 'miner-wm',
      info: req.info || {},
      opts: req.opts,
      status: 'offline',
      tags: ['whatsminer', 'miner'],
      registeredAt: Date.now(),
      comments: []
    }

    this.things.set(req.id, thing)
    this.logs.set(req.id, [])
    return thing
  }

  updateThing (req) {
    const thing = this.things.get(req.id)
    if (!thing) throw new Error('ERR_THING_NOT_FOUND')

    if (req.info) Object.assign(thing.info, req.info)
    if (req.opts) Object.assign(thing.opts, req.opts)
    thing.updatedAt = Date.now()
    return thing
  }

  forgetThings (req) {
    const ids = req.ids || (req.all ? [...this.things.keys()] : [])
    let count = 0
    for (const id of ids) {
      if (this.things.delete(id)) {
        this.logs.delete(id)
        this.comments.delete(id)
        count++
      }
    }
    return count
  }

  // ─── ListingService equivalents ──────────────────────────────────

  listThings (req) {
    const things = []
    for (const [, thg] of this.things) {
      const entry = {
        id: thg.id,
        type: thg.type,
        info: thg.info,
        status: thg.status,
        tags: thg.tags
      }
      if (req && req.includeOpts) entry.opts = thg.opts
      things.push(entry)
    }
    return things
  }

  getThingsCount () {
    return this.things.size
  }

  // ─── LogHistoryService equivalents ───────────────────────────────

  tailLog (req) {
    const thingId = req.thingId || req.deviceId
    const logs = this.logs.get(thingId) || []
    const limit = req.limit || 50
    return logs.slice(-limit)
  }

  getHistoricalLogs (req) {
    const thingId = req.thingId || req.deviceId
    const logs = this.logs.get(thingId) || []
    const from = req.from || 0
    const to = req.to || Date.now()
    return logs.filter(l => l.ts >= from && l.ts <= to)
  }

  // ─── SettingsService equivalents ─────────────────────────────────

  getSettings () {
    return { ...this.settings }
  }

  saveSettings (entries) {
    Object.assign(this.settings, entries)
    return this.settings
  }

  // ─── CommentsService equivalents ─────────────────────────────────

  saveComment (req) {
    const thingId = req.thingId || req.deviceId
    const thing = this.things.get(thingId)
    if (!thing) throw new Error('ERR_THING_NOT_FOUND')

    const comment = {
      id: `cmt-${Date.now()}`,
      text: req.text,
      author: req.author || 'system',
      createdAt: Date.now()
    }
    if (!thing.comments) thing.comments = []
    thing.comments.push(comment)
    return comment
  }

  editComment (req) {
    const thingId = req.thingId || req.deviceId
    const thing = this.things.get(thingId)
    if (!thing) throw new Error('ERR_THING_NOT_FOUND')

    const comment = (thing.comments || []).find(c => c.id === req.commentId)
    if (!comment) throw new Error('ERR_COMMENT_NOT_FOUND')
    comment.text = req.text
    comment.updatedAt = Date.now()
    return comment
  }

  deleteComment (req) {
    const thingId = req.thingId || req.deviceId
    const thing = this.things.get(thingId)
    if (!thing) throw new Error('ERR_THING_NOT_FOUND')

    const idx = (thing.comments || []).findIndex(c => c.id === req.commentId)
    if (idx === -1) throw new Error('ERR_COMMENT_NOT_FOUND')
    thing.comments.splice(idx, 1)
    return 1
  }

  // ─── StatsService equivalents ────────────────────────────────────

  aggrStats (thingIds, opts) {
    const things = thingIds
      ? thingIds.map(id => this.things.get(id)).filter(Boolean)
      : [...this.things.values()]

    let totalHashrate = 0
    let totalPower = 0
    let count = 0

    for (const thg of things) {
      if (thg._snap) {
        totalHashrate += thg._snap.hashrate_rt || 0
        totalPower += thg._snap.power_draw || 0
        count++
      }
    }

    return {
      totalHashrate,
      totalPower,
      avgHashrate: count > 0 ? totalHashrate / count : 0,
      avgPower: count > 0 ? totalPower / count : 0,
      onlineCount: count,
      totalCount: things.length
    }
  }
}

// ─── Hardware Simulator (replaces actual Whatsminer TCP/crypto calls) ──

class HardwareSimulator {
  getSnap (device) {
    return {
      hashrate_rt: 85 + Math.random() * 15,
      hashrate_avg: 90,
      power_draw: 3200 + Math.floor(Math.random() * 200),
      temperature_in: 28 + Math.floor(Math.random() * 5),
      temperature_out: 62 + Math.floor(Math.random() * 10),
      fan_speed_in: 4500 + Math.floor(Math.random() * 500),
      fan_speed_out: 4200 + Math.floor(Math.random() * 500),
      uptime_seconds: Math.floor(Math.random() * 86400),
      accepted_shares: Math.floor(Math.random() * 100000),
      rejected_shares: Math.floor(Math.random() * 100),
      pool_url: device.pools ? device.pools[0].url : 'stratum+tcp://pool.example.com:3333',
      status: device.status || 'online'
    }
  }

  reboot (device) {
    device.status = 'rebooting'
    device._rebootTimer = setTimeout(() => { device.status = 'online' }, 3000)
    return { message: 'Reboot initiated' }
  }

  setPowerMode (device, params) {
    device.power_mode = params.mode
    return { power_mode: device.power_mode }
  }

  setLED (device, params) {
    device.led_enabled = params.enabled
    return { led_enabled: device.led_enabled }
  }

  setupPools (device, params) {
    device.pools = [{ url: params.pool1_url, user: params.pool1_user, pass: params.pool1_pass }]
    return { pools: device.pools }
  }

  setPowerPct (device, params) {
    device.power_pct = params.pct
    return { power_pct: device.power_pct }
  }
}

// ─── MDK Protocol Worker ──────────────────────────────────────────────

class WhatsminerWorker {
  constructor (opts) {
    this.workerId = opts.workerId || 'whatsminer-worker-1'
    this.store = new ThingStore()
    this.hw = new HardwareSimulator()

    // Register initial devices (equivalent to setupThings in ConnectionService)
    for (const device of (opts.devices || [])) {
      this.store.registerThing({
        id: device.deviceId,
        info: { serialNum: device.deviceId, container: device.container || null },
        opts: { address: device.ip, port: device.port, password: device.password || 'admin' }
      })
      const thg = this.store.things.get(device.deviceId)
      thg.status = 'online'
      thg.pools = [{ url: 'stratum+tcp://pool.example.com:3333', user: 'worker.001', pass: 'x' }]
      thg.power_mode = 'normal'
      thg.led_enabled = false
    }
  }

  /**
   * Handle an incoming MDK Protocol envelope from ORK.
   * Routes based on action type.
   */
  async handleRequest (envelope) {
    switch (envelope.action) {
      case ACTIONS.IDENTITY_REQUEST:
        return this._handleIdentityRequest(envelope)
      case ACTIONS.CAPABILITY_REQUEST:
        return this._handleCapabilityRequest(envelope)
      case ACTIONS.TELEMETRY_PULL:
        return this._handleTelemetryPull(envelope)
      case ACTIONS.COMMAND_REQUEST:
        return this._handleCommandRequest(envelope)
      case ACTIONS.HEALTH_PING:
        return this._handleHealthPing(envelope)
      case ACTIONS.STATE_PULL:
        return this._handleStatePull(envelope)
      default:
        return buildResponse(envelope, 'error', {
          error: `ERR_UNKNOWN_ACTION: ${envelope.action}`
        }, this.workerId)
    }
  }

  // ─── identity.request → Worker declares its devices ─────────────

  _handleIdentityRequest (envelope) {
    const devices = this.store.listThings({}).map(thg => ({
      deviceId: thg.id
    }))

    return buildResponse(envelope, ACTIONS.IDENTITY_RESPONSE, {
      workerId: this.workerId,
      devices
    }, this.workerId)
  }

  // ─── capability.request → Worker returns mdk-contract.json ──────

  _handleCapabilityRequest (envelope) {
    return buildResponse(envelope, ACTIONS.CAPABILITY_RESPONSE, {
      contract
    }, this.workerId)
  }

  // ─── telemetry.pull → All read operations ───────────────────────
  //
  // The query.type field determines what data to return.
  // This maps to: listThings, tailLog, getHistoricalLogs, metrics, stats, settings, config

  _handleTelemetryPull (envelope) {
    const query = (envelope.payload && envelope.payload.query) || {}
    const deviceId = envelope.deviceId || (envelope.payload && envelope.payload.deviceId)

    try {
      let result

      switch (query.type) {
        case 'list':
          // listThings — returns all registered devices
          result = { things: this.store.listThings(query) }
          break

        case 'count':
          // getThingsCount
          result = { count: this.store.getThingsCount() }
          break

        case 'logs':
          // tailLog — historical log entries for a device
          result = { logs: this.store.tailLog({ deviceId, ...query }) }
          break

        case 'logs_multi':
          // tailLogMulti — logs for multiple devices
          result = {
            logs: (query.deviceIds || []).reduce((acc, id) => {
              acc[id] = this.store.tailLog({ deviceId: id, ...query })
              return acc
            }, {})
          }
          break

        case 'historical_logs':
          // getHistoricalLogs
          result = { logs: this.store.getHistoricalLogs({ deviceId, ...query }) }
          break

        case 'settings':
          // getWrkSettings
          result = { settings: this.store.getSettings() }
          break

        case 'config':
          // getWrkConf — worker configuration
          result = { config: { workerId: this.workerId, contract: contract.metadata } }
          break

        case 'thing_config':
          // getThingConf — per-device config
          result = { config: this._getThingConfig(deviceId) }
          break

        case 'stats':
          // aggrStats — aggregated statistics
          result = { stats: this.store.aggrStats(query.deviceIds, query.opts || {}) }
          break

        case 'ext_data':
          // getWrkExtData
          result = { extData: {} }
          break

        case 'metrics':
        default:
          // Default: live telemetry for a specific device (collectThingSnap)
          if (!deviceId) {
            // If no deviceId, return metrics for all devices
            result = { devices: this._collectAllMetrics() }
          } else {
            result = this._collectDeviceMetrics(deviceId)
          }
          break
      }

      return buildResponse(envelope, ACTIONS.TELEMETRY_RESPONSE, {
        deviceId,
        ...result,
        timestamp: Date.now()
      }, this.workerId)
    } catch (err) {
      return buildResponse(envelope, ACTIONS.TELEMETRY_RESPONSE, {
        deviceId,
        error: err.message
      }, this.workerId)
    }
  }

  // ─── command.request → All write operations ─────────────────────
  //
  // Maps to: registerThing, updateThing, forgetThings, reboot, setPowerMode,
  // setLED, setupPools, saveSettings, saveComment, editComment, deleteComment

  _handleCommandRequest (envelope) {
    const { commandId, command, params } = envelope.payload
    const deviceId = envelope.deviceId

    try {
      let result

      switch (command) {
        // ─── Thing lifecycle commands (DataService) ──────────────
        case 'registerThing':
          result = this.store.registerThing(params)
          break

        case 'updateThing':
          result = this.store.updateThing({ id: deviceId, ...params })
          break

        case 'forgetThings':
          result = { removed: this.store.forgetThings(params) }
          break

        // ─── Device hardware commands (ActionsService) ──────────
        case 'reboot':
          result = this._applyToDevice(deviceId, 'reboot', params)
          break

        case 'setPowerMode':
          result = this._applyToDevice(deviceId, 'setPowerMode', params)
          break

        case 'setLED':
          result = this._applyToDevice(deviceId, 'setLED', params)
          break

        case 'setupPools':
          result = this._applyToDevice(deviceId, 'setupPools', params)
          break

        case 'setPowerPct':
          result = this._applyToDevice(deviceId, 'setPowerPct', params)
          break

        // ─── Settings commands (SettingsService) ────────────────
        case 'saveSettings':
          result = this.store.saveSettings(params)
          break

        // ─── Comment commands (CommentsService) ─────────────────
        case 'saveComment':
          result = this.store.saveComment({ deviceId, ...params })
          break

        case 'editComment':
          result = this.store.editComment({ deviceId, ...params })
          break

        case 'deleteComment':
          result = this.store.deleteComment({ deviceId, ...params })
          break

        default:
          return buildResponse(envelope, ACTIONS.COMMAND_RESULT, {
            commandId,
            status: 'FAILED',
            error: `ERR_UNKNOWN_COMMAND: ${command}`
          }, this.workerId)
      }

      return buildResponse(envelope, ACTIONS.COMMAND_RESULT, {
        commandId,
        status: 'SUCCESS',
        result
      }, this.workerId)
    } catch (err) {
      return buildResponse(envelope, ACTIONS.COMMAND_RESULT, {
        commandId,
        status: 'FAILED',
        error: err.message
      }, this.workerId)
    }
  }

  // ─── state.pull → Worker-level state snapshot ───────────────────

  _handleStatePull (envelope) {
    const states = {}
    for (const [id, thg] of this.store.things) {
      states[id] = {
        status: thg.status,
        power_mode: thg.power_mode || 'normal',
        led_enabled: thg.led_enabled || false,
        pool_url: thg.pools ? thg.pools[0].url : null
      }
    }

    return buildResponse(envelope, ACTIONS.STATE_RESPONSE, {
      state: states,
      thingCount: this.store.things.size,
      workerId: this.workerId
    }, this.workerId)
  }

  // ─── health.ping → Liveness probe ──────────────────────────────

  _handleHealthPing (envelope) {
    return buildResponse(envelope, ACTIONS.HEALTH_PONG, {
      status: 'OK'
    }, this.workerId)
  }

  // ─── Internal helpers ──────────────────────────────────────────

  _collectDeviceMetrics (deviceId) {
    const thg = this.store.things.get(deviceId)
    if (!thg) return { error: 'ERR_DEVICE_NOT_FOUND' }

    const snap = this.hw.getSnap(thg)
    thg._snap = snap // cache for stats aggregation

    // Also store in logs (simulates SnapsService.collectSnaps)
    const logs = this.store.logs.get(deviceId) || []
    logs.push({ ts: Date.now(), ...snap })
    // Keep bounded log (simulates log rotation)
    if (logs.length > 1000) logs.splice(0, logs.length - 1000)
    this.store.logs.set(deviceId, logs)

    return { metrics: snap }
  }

  _collectAllMetrics () {
    const all = []
    for (const [deviceId] of this.store.things) {
      const { metrics } = this._collectDeviceMetrics(deviceId)
      all.push({ deviceId, ...metrics })
    }
    return all
  }

  _applyToDevice (deviceId, action, params) {
    const thg = this.store.things.get(deviceId)
    if (!thg) throw new Error('ERR_DEVICE_NOT_FOUND')
    if (thg.status === 'offline') throw new Error('ERR_DEVICE_OFFLINE')

    switch (action) {
      case 'reboot': return this.hw.reboot(thg)
      case 'setPowerMode': return this.hw.setPowerMode(thg, params)
      case 'setLED': return this.hw.setLED(thg, params)
      case 'setupPools': return this.hw.setupPools(thg, params)
      case 'setPowerPct': return this.hw.setPowerPct(thg, params)
      default: throw new Error(`ERR_UNKNOWN_DEVICE_ACTION: ${action}`)
    }
  }

  _getThingConfig (deviceId) {
    const thg = this.store.things.get(deviceId)
    if (!thg) return null
    return {
      id: thg.id,
      type: thg.type,
      opts: thg.opts,
      power_mode: thg.power_mode,
      pools: thg.pools
    }
  }
}

module.exports = { WhatsminerWorker }
