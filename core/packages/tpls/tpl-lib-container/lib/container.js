'use strict'

const Thing = require('../../../tpls/tpl-lib-thing/lib/thing')

class Container extends Thing {
  constructor (opts = {}) {
    super('container', opts)
  }

  // Miner write action validator
  validateWriteAction (...params) {
    const [action, ...args] = params

    if (action === 'switchContainer') {
      const [enabled] = args
      if (typeof enabled !== 'boolean') {
        throw new Error('ERR_SWITCH_CONTAINER_ENABLED_INVALID')
      }
    }

    if (action === 'switchSocket') {
      if (Array.isArray(args[0])) {
        args[0].forEach((arg) => {
          const [pduIndex, socketIndex, enabled] = arg

          if (typeof pduIndex !== 'string') {
            throw new Error('ERR_SWITCH_SOCKET_PDU_INDEX_INVALID')
          }
          if (typeof socketIndex !== 'string') {
            throw new Error('ERR_SWITCH_SOCKET_SOCKET_INDEX_INVALID')
          }
          if (typeof enabled !== 'boolean') {
            throw new Error('ERR_SWITCH_SOCKET_ENABLED_INVALID')
          }
        })
      } else {
        throw new Error('ERR_SWITCH_SOCKET_ARGS_INVALID')
      }
    }

    if (action === 'switchCoolingSystem') {
      const [enabled] = args
      if (typeof enabled !== 'boolean') {
        throw new Error('ERR_SWITCH_COOLING_SYSTEM_ENABLED_INVALID')
      }
    }

    return 1
  }

  async turnOnContainer (cooling, devices) {
    throw new Error('ERR_NO_IMPL')
  }

  async turnOffContainer () {
    throw new Error('ERR_NO_IMPL')
  }

  async switchContainer (enabled) {
    throw new Error('ERR_NO_IMPL')
  }

  async switchCoolingSystem (enabled) {
    throw new Error('ERR_NO_IMPL')
  }

  async switchSocket (args) {
    throw new Error('ERR_NO_IMPL')
  }

  async turnOnCoolingSystem () {
    throw new Error('ERR_NO_IMPL')
  }

  async turnOffCoolingSystem () {
    throw new Error('ERR_NO_IMPL')
  }

  async resetAlarm () {
    throw new Error('ERR_NO_IMPL')
  }
}

module.exports = Container
