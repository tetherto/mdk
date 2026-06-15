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

    this._rpc = null
    this._server = null
    this._swarm = null
    this._dht = null
    this._confBee = null
  }

  async start () {
    const seedDht = await this._getOrCreateSeed('seedDht')
    const seedRpc = await this._getOrCreateSeed('seedRpc')

    this._dht = new DHT({ keyPair: DHT.keyPair(seedDht) })
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

    this._swarm.join(topicBuf, { server: true, client: false })
    await this._swarm.flush()

    this._swarm.on('connection', (stream) => {
      stream.write(this._server.publicKey)
      stream.on('error', () => {})
    })

    debug(`joined discovery topic: ${topicBuf.toString('hex').slice(0, 16)}...`)
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

  _handleIdentity (envelope) {
    const things = this.manager.listThings({})
    const devices = (Array.isArray(things) ? things : []).map(t => ({
      deviceId: t.id
    }))

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
          result = { things: this.manager.listThings(query) }
          break
        case 'count':
          result = { count: Object.keys(this.manager.mem.things).length }
          break
        case 'logs':
          result = { logs: await this.manager.tailLog({ thingId: deviceId, ...query }) }
          break
        case 'historical_logs':
          result = { logs: await this.manager.getHistoricalLogs({ thingId: deviceId, ...query }) }
          break
        case 'logs_multi': {
          const deviceIds = query.deviceIds || (deviceId ? [deviceId] : Object.keys(this.manager.mem.things))
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
          result = { extData: this.manager._getWrkExtData ? this.manager._getWrkExtData(query) : {} }
          break
        case 'metrics':
        default: {
          if (!deviceId) {
            const all = []
            for (const id of Object.keys(this.manager.mem.things)) {
              const thg = this.manager.mem.things[id]
              try {
                const snap = await this.manager.collectThingSnap(thg)
                all.push({ deviceId: id, ...snap })
              } catch (e) {
                all.push({ deviceId: id, error: e.message })
              }
            }
            result = { devices: all }
          } else {
            const thg = this.manager.mem.things[deviceId]
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
            thingIds: Object.keys(this.manager.mem.things)
          })
          break
        default: {
          const thingIds = deviceId ? [deviceId] : (params.thingIds || [])
          result = await this.manager.applyThings({
            method: command,
            params: params ? Object.values(params) : [],
            thingIds
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
    for (const [id, thg] of Object.entries(this.manager.mem.things)) {
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
