'use strict'

const crypto = require('crypto')
const HyperswarmRPC = require('@hyperswarm/rpc')
const Hyperswarm = require('hyperswarm')
const DHT = require('hyperdht')
const debug = require('debug')('mdk:worker:adapter')
const { ACTIONS } = require('../../../core/ork/lib/protocol/actions')
const { buildResponse, serialize, deserialize } = require('../../../core/ork/lib/protocol/envelope')

class MDKWorkerAdapter {
  constructor (manager, contract, opts) {
    opts = opts || {}
    this.manager = manager
    this.contract = contract
    this.workerId = opts.workerId || manager.rackId
    this.orkTopic = opts.orkTopic || null
    this.store = opts.store || null
    // Optional DHT bootstrap override. Defaults to hyperdht's public bootstrap;
    // set only for a custom DHT network or hermetic tests (hyperdht/testnet).
    this._bootstrap = opts.bootstrap || null

    this._rpc = null
    this._server = null
    this._swarm = null
    this._discovery = null
    this._announceTimer = null
    this._dht = null
    this._confBee = null
  }

  async start () {
    const seedDht = await this._getOrCreateSeed('seedDht')
    const seedRpc = await this._getOrCreateSeed('seedRpc')

    this._dht = new DHT({ keyPair: DHT.keyPair(seedDht), ...(this._bootstrap ? { bootstrap: this._bootstrap } : {}) })
    this._rpc = new HyperswarmRPC({ dht: this._dht, seed: seedRpc })
    this._server = this._rpc.createServer()

    this._server.respond('mdk', async (reqBuf) => {
      try {
        const envelope = deserialize(reqBuf)
        const result = await this.handleRequest(envelope)
        return serialize(result)
      } catch (err) {
        debug(`request error: ${err.message}`)
        return serialize({ error: err.message })
      }
    })

    await this._server.listen()
    debug(`worker RPC listening (key: ${this._server.publicKey.toString('hex').slice(0, 16)}...)`)

    if (this.orkTopic) {
      await this._joinDiscoveryTopic()
    }

    return { publicKey: this._server.publicKey }
  }

  async stop () {
    if (this._announceTimer) { clearInterval(this._announceTimer); this._announceTimer = null }
    this._discovery = null
    if (this._swarm) { await this._swarm.destroy(); this._swarm = null }
    if (this._server) { await this._server.close(); this._server = null }
    if (this._rpc) { await this._rpc.destroy(); this._rpc = null }
    if (this._dht) { await this._dht.destroy(); this._dht = null }
    debug('worker adapter stopped')
  }

  getPublicKey () {
    return this._server ? this._server.publicKey : null
  }

  async _getOrCreateSeed (name) {
    if (!this.store) return crypto.randomBytes(32)

    if (!this._confBee) {
      this._confBee = this.store.getBee
        ? this.store.getBee({ name: 'workerConf' }, { keyEncoding: 'utf-8' })
        : this.store.sub('workerConf')
      if (this._confBee.ready) await this._confBee.ready()
    }

    const existing = await this._confBee.get(name)
    if (existing && existing.value) {
      return Buffer.isBuffer(existing.value) ? existing.value : Buffer.from(existing.value)
    }

    const seed = crypto.randomBytes(32)
    await this._confBee.put(name, seed)
    debug(`created persistent seed: ${name}`)
    return seed
  }

  async _joinDiscoveryTopic () {
    this._swarm = new Hyperswarm({ dht: this._dht })
    const topicBuf = Buffer.isBuffer(this.orkTopic)
      ? this.orkTopic
      : Buffer.from(this.orkTopic, 'hex')

    // Attach the handler BEFORE join. A Hyperswarm connection is persistent and
    // its `connection` event fires once, immediately on open — if the ORK client
    // connects before this is attached (e.g. during an awaited flush), the event
    // is missed and the worker never writes its key on that long-lived socket,
    // so the ORK times out and discovery hangs.
    this._swarm.on('connection', (stream) => {
      stream.write(this._server.publicKey)
      stream.on('error', () => {})
    })

    // Server join: announce this keypair under the topic. `discovery.flushed()`
    // is the server-mode wait — it resolves once we are announced on the DHT and
    // reachable (swarm.flush() is the client "connect to pending peers" wait, the
    // wrong semantics here). Hold the handle so we can re-announce and leave it.
    this._discovery = this._swarm.join(topicBuf, { server: true, client: false })
    await this._discovery.flushed()

    // Announce/lookup is an ongoing process; re-announce periodically so an ORK
    // that joins later (or after our announce expires) still finds us.
    this._announceTimer = setInterval(() => {
      if (this._discovery) this._discovery.refresh({ server: true }).catch(() => {})
    }, 30000)
    this._announceTimer.unref()

    debug(`joined discovery topic: ${topicBuf.toString('hex').slice(0, 16)}... (announced)`)
  }

  async handleRequest (envelope) {
    switch (envelope.action) {
      case ACTIONS.IDENTITY_REQUEST:
        return this._handleIdentity(envelope)
      case ACTIONS.CAPABILITY_REQUEST:
        return this._handleCapability(envelope)
      case ACTIONS.TELEMETRY_PULL:
        return this._handleTelemetry(envelope)
      case ACTIONS.COMMAND_REQUEST:
        return this._handleCommand(envelope)
      case ACTIONS.HEALTH_PING:
        return this._handleHealthPing(envelope)
      case ACTIONS.STATE_PULL:
        return this._handleStatePull(envelope)
      default:
        return buildResponse(envelope, envelope.action, {
          error: `ERR_UNKNOWN_ACTION: ${envelope.action}`
        }, this.workerId)
    }
  }

  // Things map for ThingManager-backed workers; empty for scheduler/EventEmitter
  // workers (e.g. minerpools) that expose data through getWrkExtData instead.
  _thingsMem () {
    return (this.manager.mem && this.manager.mem.things) || {}
  }

  _handleIdentity (envelope) {
    let devices
    if (typeof this.manager.listThings === 'function') {
      const things = this.manager.listThings({})
      devices = (Array.isArray(things) ? things : []).map(t => ({ deviceId: t.id }))
    } else {
      // Non-thing worker (scheduler/EventEmitter, e.g. a minerpool): expose a
      // single routable device so ORK can address it for ext_data telemetry.
      devices = [{ deviceId: this.workerId }]
    }

    return buildResponse(envelope, ACTIONS.IDENTITY_RESPONSE, {
      workerId: this.workerId,
      devices
    }, this.workerId)
  }

  _handleCapability (envelope) {
    return buildResponse(envelope, ACTIONS.CAPABILITY_RESPONSE, {
      contract: this.contract
    }, this.workerId)
  }

  async _handleTelemetry (envelope) {
    const query = (envelope.payload && envelope.payload.query) || {}
    const deviceId = envelope.deviceId || (envelope.payload && envelope.payload.deviceId)

    try {
      let result
      switch (query.type) {
        case 'list':
          result = { things: typeof this.manager.listThings === 'function' ? this.manager.listThings(query) : [] }
          break
        case 'count':
          result = { count: Object.keys(this._thingsMem()).length }
          break
        case 'logs':
          result = { logs: await this.manager.tailLog({ thingId: deviceId, ...query }) }
          break
        case 'historical_logs':
          result = { logs: await this.manager.getHistoricalLogs({ thingId: deviceId, ...query }) }
          break
        case 'logs_multi': {
          const deviceIds = query.deviceIds || (deviceId ? [deviceId] : Object.keys(this._thingsMem()))
          const allLogs = []
          for (const id of deviceIds) {
            try {
              const logs = await this.manager.tailLog({ thingId: id, ...query })
              allLogs.push(...(Array.isArray(logs) ? logs : []))
            } catch (e) {
              debug('logs_multi: skip failed device %s: %s', id, e.message)
            }
          }
          result = { logs: allLogs }
          break
        }
        case 'settings':
          result = { settings: await this.manager.getSettings() }
          break
        case 'config':
          result = { config: { workerId: this.workerId, contract: this.contract.metadata } }
          break
        case 'thing_config':
          result = { config: this.manager.getThingConf ? await this.manager.getThingConf({ thingId: deviceId }) : null }
          break
        case 'stats':
          result = { stats: await this.manager.aggrStats(query.deviceIds, query.opts || {}) }
          break
        case 'ext_data':
          if (typeof this.manager.getWrkExtData === 'function') {
            result = { extData: await this.manager.getWrkExtData({ query }) }
          } else if (typeof this.manager._getWrkExtData === 'function') {
            result = { extData: await this.manager._getWrkExtData(query) }
          } else {
            result = { extData: {} }
          }
          break
        case 'metrics':
        default: {
          if (!deviceId) {
            const all = []
            const things = this._thingsMem()
            for (const id of Object.keys(things)) {
              const thg = things[id]
              try {
                const snap = await this.manager.collectThingSnap(thg)
                all.push({ deviceId: id, ...snap })
              } catch (e) {
                all.push({ deviceId: id, error: e.message })
              }
            }
            result = { devices: all }
          } else {
            const thg = this._thingsMem()[deviceId]
            if (!thg) {
              result = { error: 'ERR_DEVICE_NOT_FOUND' }
            } else {
              try {
                const snap = await this.manager.collectThingSnap(thg)
                result = { metrics: snap }
              } catch (e) {
                result = { error: e.message }
              }
            }
          }
          break
        }
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

  async _handleCommand (envelope) {
    const { commandId, command, params } = envelope.payload
    const deviceId = envelope.deviceId

    try {
      let result

      switch (command) {
        case 'registerThing':
          result = await this.manager.registerThing(params)
          break
        case 'updateThing':
          result = await this.manager.updateThing({ id: deviceId, ...params })
          break
        case 'forgetThings':
          result = { removed: await this.manager.forgetThings(params) }
          break
        case 'saveSettings':
          result = await this.manager.saveSettingsEntries(params)
          break
        case 'saveComment':
          result = await this.manager.saveThingComment({ thingId: deviceId, ...params })
          break
        case 'editComment':
          result = await this.manager.editThingComment({ thingId: deviceId, ...params })
          break
        case 'deleteComment':
          result = await this.manager.deleteThingComment({ thingId: deviceId, ...params })
          break
        case 'rackReboot':
          result = await this.manager.applyThings({
            method: 'rackReboot',
            params: [],
            thingIds: Object.keys(this._thingsMem())
          })
          break
        default: {
          const thingIds = deviceId ? [deviceId] : (params.thingIds || [])
          result = await this.manager.applyThings({
            method: command,
            params: params ? Object.values(params) : [],
            thingIds,
            // applyThings filters via req.query (mingo), not thingIds — without
            // this a device-scoped command matches every thing and broadcasts.
            query: thingIds.length ? { id: { $in: thingIds } } : undefined
          })
          break
        }
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

  _handleHealthPing (envelope) {
    return buildResponse(envelope, ACTIONS.HEALTH_PONG, {
      status: 'OK'
    }, this.workerId)
  }

  _handleStatePull (envelope) {
    const states = {}
    for (const [id, thg] of Object.entries(this._thingsMem())) {
      states[id] = {
        status: thg.ctrl && thg.ctrl.isThingOnline ? (thg.ctrl.isThingOnline() ? 'online' : 'offline') : 'unknown',
        type: thg.type,
        tags: thg.tags || []
      }
    }

    return buildResponse(envelope, ACTIONS.STATE_RESPONSE, {
      state: states,
      thingCount: Object.keys(states).length,
      workerId: this.workerId
    }, this.workerId)
  }
}

module.exports = { MDKWorkerAdapter }
