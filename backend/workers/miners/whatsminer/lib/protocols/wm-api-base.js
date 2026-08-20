'use strict'

/**
 * Abstract base defining the protocol interface for Whatsminer API handlers.
 */
class WMApiBase {
  constructor (opts) {
    if (new.target === WMApiBase) {
      throw new Error('WMApiBase is an abstract class and cannot be instantiated directly')
    }
    this.opts = opts
    this.rpc = opts.rpc
    this.password = opts.password
    this.account = opts.account || 'super'
    this.debugError = opts.debugError || (() => {})
  }

  static get VERSION () {
    throw new Error('VERSION must be implemented by subclass')
  }

  static get DEFAULT_PORT () {
    throw new Error('DEFAULT_PORT must be implemented by subclass')
  }

  async authenticate () {
    throw new Error('authenticate must be implemented by subclass')
  }

  async requestRead (command, params = {}) {
    throw new Error('requestRead must be implemented by subclass')
  }

  async requestWrite (command, params = {}, json = true) {
    throw new Error('requestWrite must be implemented by subclass')
  }

  /**
   * Transforms a command from v2 format to the format this handler speaks.
   */
  transformCommand (command) {
    return command
  }

  /**
   * Normalizes a raw miner response to the legacy v2 shape the parsers expect.
   */
  parseResponse (response, originalCommand) {
    return response
  }

  getAuthCommand () {
    throw new Error('getAuthCommand must be implemented by subclass')
  }

  /**
   * Success check supporting both V2 (Code: 131) and V3 (code: 0) formats.
   */
  isResponseOK (response) {
    if (response?.code !== undefined) {
      return response.code === 0
    }
    return response?.Code === 131
  }
}

module.exports = WMApiBase
