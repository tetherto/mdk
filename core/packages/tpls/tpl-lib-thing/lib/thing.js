'use strict'

const debug = require('debug')
const EventEmitter = require('events')

class Thing extends EventEmitter {
  constructor (type, { lastSeenTimeout = 30000, conf = {}, ...opts }) {
    super()
    this._lastSeen = null
    this._errorLog = []
    this._type = type
    this.debug = debug(`thing:${type}`)
    this.conf = conf
    this.opts = {
      lastSeenTimeout,
      timeout: conf.timeout || 10000,
      ...opts
    }
    this.lastSnap = null
  }

  debugError (data, e, alert = false) {
    if (alert) {
      return console.error(data, e)
    }
    this.debug(data, e)
  }

  updateLastSeen () {
    this._lastSeen = Date.now()
  }

  isThingOnline () {
    // if thing is offline for more than lastSeenTimeout seconds, it is considered offline
    return this._lastSeen !== null && Date.now() - this._lastSeen < this.opts.lastSeenTimeout
  }

  validateWriteAction (...params) {
    throw new Error('ERR_NO_IMPL')
  }

  async _prepSnap () {
    throw new Error('ERR_NO_IMPL')
  }

  _handleErrorUpdates (errors) {
    this._errorLog.length = 0
    this._errorLog.push(...errors)
  }

  async getSnap () {
    let snap
    try {
      const data = await this._prepSnap()

      snap = {
        success: true,
        raw_errors: this._errorLog,
        stats: data.stats,
        config: data.config
      }
    } catch (err) {
      this.debugError('getSnap error', err)
      if (this.isThingOnline() && err.message !== 'ERR_OFFLINE') {
        snap = {
          success: false,
          stats: {
            status: 'error',
            errors: [
              {
                msg: err.message,
                timestamp: Date.now()
              }
            ]
          }
        }
      } else {
        snap = {
          success: false,
          stats: {
            status: 'offline'
          }
        }
      }
    }

    this.lastSnap = snap
    return snap
  }

  async getRealtimeData () {
    return this.lastSnap
  }
}

module.exports = Thing
