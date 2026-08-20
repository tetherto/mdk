'use strict'

const CryptoJS = require('crypto-js')
const WMApiBase = require('./wm-api-base')
const { API_VERSIONS, API_DEFAULTS, RESPONSE_CODES_V3 } = require('./constants')

const SENSITIVE_PARAM_COMMANDS = new Set([
  'set.miner.pools',
  'set.user.change_passwd'
])

/**
 * Whatsminer API v3 handler. Key differences from v2:
 * - Token generated per-command: SHA256(cmd + password + salt + ts).base64.substring(0, 8)
 * - Response format: {code, when, msg, desc} instead of {STATUS, When, Code, Msg}
 * - Response codes: 0=Success, -1=Fail, -2=Invalid command, -4=No permission
 * - Dot notation commands (get.miner.status with param)
 */
class WMApiV3 extends WMApiBase {
  constructor (opts) {
    super(opts)
    // Salt from get.device.info, used for per-command token generation
    this.salt = undefined
  }

  static get VERSION () {
    return API_VERSIONS.V3
  }

  static get DEFAULT_PORT () {
    return API_DEFAULTS[API_VERSIONS.V3].port
  }

  getAuthCommand () {
    return API_DEFAULTS[API_VERSIONS.V3].authCommand
  }

  async authenticate () {
    const res = await this._requestMiner({ cmd: this.getAuthCommand(), param: 'salt' })

    if (res?.code === RESPONSE_CODES_V3.NO_PERMISSION) {
      throw new Error('ERR_TOKEN_FETCH_IP_LIMIT')
    }

    if (res?.code !== RESPONSE_CODES_V3.SUCCESS) {
      throw new Error('ERR_AUTH_FAILED')
    }

    const salt = res.msg?.salt

    if (!salt) {
      throw new Error('ERR_INVALID_AUTH_RESPONSE')
    }

    this.salt = salt

    return { salt }
  }

  async refreshToken () {
    try {
      await this.authenticate()
    } catch (e) {
      this.debugError('refreshToken error', e)
      throw e
    }
  }

  /**
   * Derive the per-request token and AES key exactly as the vendor's v3 API
   * specifies: `SHA256(command + password + salt + timestamp)`, the first 8
   * Base64 characters as the request token, and the full digest as the
   * AES-256-ECB key. `salt` comes from the device's auth response and
   * `timestamp` changes per request.
   *
   * This is a **wire-protocol implementation, not password storage.** Static
   * analysis flags the single fast hash of a password here and recommends a
   * slow KDF (bcrypt/scrypt/PBKDF2) — that guidance does not apply: the miner
   * firmware computes the same digest to verify the request, so substituting a
   * KDF (or a different construction) makes every authenticated call fail. The
   * v2 handler has the same shape for the same reason (`md5.crypt` + AES-ECB).
   *
   * Residual risk we cannot remove client-side: because the derivation is a
   * single SHA256 rather than a KDF, an attacker who captures traffic can brute
   * force the device password offline more cheaply than a KDF would allow, and
   * AES-ECB leaks block-level structure. Both are dictated by the vendor
   * protocol. Mitigate at the network layer — keep miner control interfaces on
   * a management VLAN that is not reachable from untrusted networks.
   */
  _generateToken (command, timestamp) {
    const tokenInput = `${command}${this.password}${this.salt}${timestamp}`
    const tokenHash = CryptoJS.SHA256(tokenInput)
    const tokenBase64 = tokenHash.toString(CryptoJS.enc.Base64)
    const token = tokenBase64.substring(0, 8)
    const key = tokenHash

    return { token, key }
  }

  async requestRead (command, params = {}) {
    const cmd = {
      cmd: command,
      ...params
    }
    this.debugError(`Sending command ${JSON.stringify(cmd)}`)
    try {
      const res = await this._requestMiner(cmd)
      if (res?.code !== RESPONSE_CODES_V3.SUCCESS) {
        throw new Error(this._getAPICodeMsg(res))
      }
      this.debugError(`Received response ${JSON.stringify(res)}`)
      return res
    } catch (error) {
      this.debugError(error)
      if (error.message?.startsWith('ERR_')) throw error
      throw new Error('ERR_READ_FAILED')
    }
  }

  async requestWrite (command, params = {}) {
    if (this.salt === undefined) {
      await this.refreshToken()
    }

    const ts = Math.floor(Date.now() / 1000)
    const { token, key } = this._generateToken(command, ts)
    const cmd = {
      cmd: command,
      ts,
      token,
      account: this.account,
      ...params
    }

    if (SENSITIVE_PARAM_COMMANDS.has(command)) {
      const param = Object.hasOwn(params, 'param') ? params.param : params
      cmd.param = CryptoJS.AES.encrypt(JSON.stringify(param), key, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7
      }).toString()
      for (const name of Object.keys(params)) {
        if (name !== 'param') delete cmd[name]
      }
    }

    this.debugError(`Sending command ${JSON.stringify(cmd)}`)
    const res = await this._requestMiner(cmd)
    if (res?.code === RESPONSE_CODES_V3.NO_PERMISSION) this.salt = undefined
    if (res?.code !== RESPONSE_CODES_V3.SUCCESS) {
      throw new Error(this._getAPICodeMsg(res))
    }
    this.debugError(`Received response ${JSON.stringify(res)}`)
    return res
  }

  async requestDownload (command) {
    const { data } = await this.rpc.requestBinary(JSON.stringify({ cmd: command }), (raw) => {
      let response
      try {
        response = JSON.parse(raw)
      } catch (error) {
        throw new Error('ERR_API_RESPONSE_INVALID')
      }

      if (response?.code !== RESPONSE_CODES_V3.SUCCESS) {
        throw new Error(this._getAPICodeMsg(response))
      }

      return response.msg?.logsize
    })
    return data
  }

  async requestFirmwareUpload (command, data, timeout) {
    if (!Buffer.isBuffer(data) || data.length === 0) throw new Error('ERR_FIRMWARE_SIZE_INVALID')
    if (this.salt === undefined) await this.refreshToken()

    const ts = Math.floor(Date.now() / 1000)
    const { token } = this._generateToken(command, ts)
    const payload = JSON.stringify({ cmd: command, ts, token, account: this.account })
    const raw = await this.rpc.requestUpload(payload, data, (readyRaw) => {
      let ready
      try {
        ready = JSON.parse(readyRaw)
      } catch (error) {
        throw new Error('ERR_API_RESPONSE_INVALID')
      }
      if (ready?.code === RESPONSE_CODES_V3.NO_PERMISSION) this.salt = undefined
      if (ready?.code !== RESPONSE_CODES_V3.SUCCESS) throw new Error(this._getAPICodeMsg(ready))
      if (ready.msg !== 'ready') throw new Error('ERR_FIRMWARE_READY_INVALID')
    }, timeout)

    let response
    try {
      response = JSON.parse(raw)
    } catch (error) {
      throw new Error('ERR_API_RESPONSE_INVALID')
    }
    if (response?.code !== RESPONSE_CODES_V3.SUCCESS) throw new Error(this._getAPICodeMsg(response))
    return response
  }

  async _requestMiner (command) {
    const response = await this.rpc.request(JSON.stringify(command))
    try {
      return JSON.parse(response)
    } catch (error) {
      throw new Error('ERR_API_RESPONSE_INVALID')
    }
  }

  _getAPICodeMsg (res) {
    const code = res?.code !== undefined ? res.code : res?.Code

    const v3CodeMessages = {
      0: 'OK',
      [-1]: 'ERR_FAIL',
      [-2]: 'ERR_INVALID_CMD',
      [-4]: 'ERR_NO_PERMISSION'
    }

    return v3CodeMessages[code] || 'ERR_UNKNOWN_API_CODE'
  }

  /**
   * V3 tokens are per-command, so token info is just the salt.
   */
  getTokenInfo () {
    if (!this.salt) return undefined
    return { salt: this.salt }
  }

  generateTokenInfo (command) {
    if (!this.salt) return undefined
    const ts = Math.floor(Date.now() / 1000)
    const { token, key } = this._generateToken(command, ts)
    return { token, key, salt: this.salt, ts }
  }

  clearToken () {
    this.salt = undefined
  }
}

module.exports = WMApiV3
