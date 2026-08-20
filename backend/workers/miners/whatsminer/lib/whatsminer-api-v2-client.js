'use strict'

const { Miner, constants } = require('../../../../core/mdk')
const async = require('async')
const net = require('node:net')
const crypto = require('node:crypto')
const CryptoJS = require('crypto-js')
const hex2a = require('./utils/hex2a.js')
const readFirmware = require('./utils/firmware.js')
const { getErrorMsg } = require('./utils/index.js')
const createLogDownloadResult = require('./utils/log-download')
const normalizeNetworkConfig = require('./utils/network')
const normalizeHostname = require('./utils/hostname')
const {
  MINOR_ERROR_CODES_M56S_M30_SET,
  MINOR_ERROR_CODES_M53_SET,
  MINER_COOLING_TYPE_MAP
} = require('./utils/constants.js')
const { ApiHandlerFactory, API_VERSIONS } = require('./protocols')
const { STATUS, POWER_MODE } = constants
const DEFAULT_MAX_LOG_SIZE = 64 * 1024 * 1024

function isResOK (res) {
  return res?.Code === 131
}

function findJSONObjectEnd (buffer) {
  let depth = 0
  let inString = false
  let escaped = false
  let started = false

  for (let i = 0; i < buffer.length; i++) {
    const char = buffer[i]
    if (!started) {
      if (char !== 0x7b) continue
      started = true
      depth = 1
      continue
    }
    if (inString) {
      if (escaped) escaped = false
      else if (char === 0x5c) escaped = true
      else if (char === 0x22) inString = false
      continue
    }
    if (char === 0x22) inString = true
    else if (char === 0x7b) depth++
    else if (char === 0x7d && --depth === 0) return i + 1
  }
  return -1
}

class WhatsminerApiV2Client extends Miner {
  constructor ({ socketer, apiVersion, ...opts }) {
    super(opts)
    if (ApiHandlerFactory.getMajorVersion(apiVersion) === 3) throw new Error('ERR_USE_API_V3_CLIENT')

    this.rpc = socketer.rpc({
      tcpOpts: {
        host: this.opts.address,
        port: this.opts.port,
        encoding: 'utf-8'
      },
      readStrategy: socketer.readStrategy,
      json: false,
      timeout: this.opts.timeout,
      delay: this.conf.delay || 50
    })

    this.apiVersion = apiVersion || API_VERSIONS.V2
    this.protocolHandler = null
    this._initPromise = null
    this._cachedPrevHashrate = null
    this.cachedShares = { accepted: 0, rejected: 0, stale: 0 }
  }

  async init () {
    this.protocolHandler = ApiHandlerFactory.create(this.apiVersion, {
      rpc: this.rpc,
      password: this.opts.password,
      account: this.opts.account,
      debugError: this.debugError.bind(this)
    })
  }

  // Handler creation is lazy so an unreachable miner keeps surfacing
  // per-request errors instead of failing at connect time.
  _ensureHandler () {
    if (!this._initPromise) {
      this._initPromise = this.init()
    }
    return this._initPromise
  }

  async _execCommand (command) {
    const cmd = { cmd: command }
    const response = await this.rpc.request(JSON.stringify(cmd))
    return JSON.parse(response)
  }

  async close () {
    await this.rpc.stop()
  }

  async _getToken () {
    await this._ensureHandler()
    return this.protocolHandler.authenticate()
  }

  async _refreshToken () {
    await this._ensureHandler()
    try {
      await this.protocolHandler.refreshToken()
    } catch (e) {
      this.debugError('_refreshToken error', e)
      throw e
    }
  }

  get token () {
    return this.protocolHandler?.getTokenInfo()
  }

  set token (value) {
    if (value === undefined && this.protocolHandler) {
      this.protocolHandler.clearToken()
    }
  }

  async _requestMiner (command, json = true) {
    const response = await this.rpc.request(JSON.stringify(command))
    this.updateLastSeen()
    return json ? JSON.parse(response) : response
  }

  async _requestUpdateMiner (command, file, key, platform) {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket()
      const fw = readFirmware(platform, file)
      if (fw === null) {
        reject(new Error('ERR_INVALID_FIRMWARE'))
        return
      }
      let buffer = Buffer.alloc(0)
      let transmitted = false
      let settled = false

      const finish = (error, response) => {
        if (settled) return
        settled = true
        socket.destroy()
        if (error) reject(error)
        else resolve({ response, firmware: fw })
      }

      socket.connect(this.opts.port, this.opts.address, () => {
        socket.write(command)
      })
      socket.setTimeout(this.conf.firmwareUpdateTimeout || 5 * 60 * 1000)

      socket.on('data', (data) => {
        try {
          buffer = Buffer.concat([buffer, data])
          const jsonEnd = findJSONObjectEnd(buffer)
          if (jsonEnd < 0) return
          const decoded = JSON.parse(buffer.subarray(0, jsonEnd).toString('utf8'))
          buffer = buffer.subarray(jsonEnd)
          const decrypted = CryptoJS.AES.decrypt(decoded.enc, CryptoJS.SHA256(key), { mode: CryptoJS.mode.ECB }).toString()
          const resp = JSON.parse(hex2a(decrypted))
          if (!isResOK(resp)) {
            finish(new Error('ERR_FIRMWARE_UPDATE_FAILED'))
          } else if (resp.Msg === 'ready' && !transmitted) {
            const fileSizeInBytes = Buffer.alloc(4)
            fileSizeInBytes.writeUInt32LE(fw.size, 0)
            transmitted = true
            socket.write(fileSizeInBytes)
            socket.write(fw.content)
          } else {
            finish(null, resp)
          }
        } catch (error) {
          finish(error)
        }
      })

      socket.once('timeout', () => finish(new Error(transmitted
        ? 'ERR_FIRMWARE_OUTCOME_UNKNOWN'
        : 'ERR_FIRMWARE_UPDATE_TIMEOUT')))
      socket.once('error', () => finish(new Error(transmitted
        ? 'ERR_FIRMWARE_OUTCOME_UNKNOWN'
        : 'ERR_FIRMWARE_UPDATE_CONNECTION')))
      socket.once('end', () => finish(new Error(transmitted
        ? 'ERR_FIRMWARE_OUTCOME_UNKNOWN'
        : 'ERR_FIRMWARE_UPDATE_CONNECTION')))
    })
  }

  async _requestReadEndpoint (command, additionalParams = {}) {
    await this._ensureHandler()
    const cmd = this.protocolHandler.transformCommand(command)
    const params = { ...additionalParams }
    const statusParam = this.protocolHandler.getStatusParam(command)
    if (statusParam) {
      params.param = statusParam
    }

    const res = await this.protocolHandler.requestRead(cmd, params)
    this.updateLastSeen()
    return this.protocolHandler.parseResponse(res, command)
  }

  async _requestWriteEndpoint (command, additionalParams = {}, json = true, retry = true) {
    await this._ensureHandler()
    const cmd = this.protocolHandler.transformCommand(command)
    const request = retry
      ? this.protocolHandler.requestWrite.bind(this.protocolHandler)
      : this.protocolHandler.requestWriteOnce.bind(this.protocolHandler)
    const res = await request(cmd, additionalParams, json)
    this.updateLastSeen()
    return res ? this.protocolHandler.parseResponse(res, command) : null
  }

  async _requestWriteFirmwareEndpoint (filename) {
    if (this.token === undefined) {
      await this._refreshToken()
    }
    const { sign, key } = this.protocolHandler.getTokenInfo()
    const cmd = JSON.stringify({
      token: sign,
      cmd: this.protocolHandler.transformCommand('update_firmware')
    })
    const data = CryptoJS.AES.encrypt(cmd, CryptoJS.SHA256(key), { mode: CryptoJS.mode.ECB }).toString()
    const encCmd = JSON.stringify({
      enc: 1,
      data
    })

    const version = await this.getVersion()

    const res = await this._requestUpdateMiner(encCmd, filename, key, version.platform.toLowerCase())
    return res
  }

  _requestLogDownload (payload, key) {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection({ host: this.opts.address, port: this.opts.port })
      const maxLogSize = this.conf.maxLogDownloadSize || DEFAULT_MAX_LOG_SIZE
      let buffer = Buffer.alloc(0)
      let expectedLength
      let settled = false

      const finish = (error, data) => {
        if (settled) return
        settled = true
        socket.destroy()
        if (error) reject(error)
        else resolve(data)
      }

      const consume = () => {
        if (expectedLength === undefined) {
          const jsonEnd = findJSONObjectEnd(buffer)
          if (jsonEnd < 0) return

          let encrypted
          let response
          try {
            encrypted = JSON.parse(buffer.subarray(0, jsonEnd).toString('utf8'))
            if (!encrypted.enc) throw new Error(this.protocolHandler._getAPICodeMsg(encrypted))
            const decrypted = CryptoJS.AES.decrypt(encrypted.enc, CryptoJS.SHA256(key), { mode: CryptoJS.mode.ECB }).toString()
            response = JSON.parse(hex2a(decrypted))
          } catch (error) {
            if (error.message?.startsWith('ERR_')) throw error
            throw new Error('ERR_LOG_DOWNLOAD_RESPONSE_INVALID')
          }

          if (!isResOK(response)) throw new Error(this.protocolHandler._getAPICodeMsg(response))
          expectedLength = Number(response.Msg?.logfilelen)
          if (!Number.isSafeInteger(expectedLength) || expectedLength < 0 || expectedLength > maxLogSize) {
            throw new Error('ERR_LOG_DOWNLOAD_SIZE_INVALID')
          }
          buffer = buffer.subarray(jsonEnd)
        }

        if (buffer.length >= expectedLength) finish(null, buffer.subarray(0, expectedLength))
      }

      socket.setTimeout(this.opts.timeout)
      socket.once('connect', () => socket.write(payload))
      socket.on('data', (chunk) => {
        try {
          buffer = Buffer.concat([buffer, chunk])
          consume()
        } catch (error) {
          finish(error)
        }
      })
      socket.once('timeout', () => finish(new Error('ERR_LOG_DOWNLOAD_TIMEOUT')))
      socket.once('error', () => finish(new Error('ERR_LOG_DOWNLOAD_CONNECTION')))
      socket.once('end', () => {
        if (!settled) finish(new Error('ERR_LOG_DOWNLOAD_INCOMPLETE'))
      })
    })
  }

  validateWriteAction (...params) {
    const [action, ...args] = params

    if (action === 'setPowerMode') {
      const [mode] = args
      if (!['low', 'normal', 'high', 'sleep'].includes(mode)) {
        throw new Error('ERR_SET_POWER_MODE_INVALID')
      }
      return 1
    }

    return super.validateWriteAction(...params)
  }

  async getVersion () {
    const res = await this._requestReadEndpoint('get_version')

    return {
      chip: res.Msg.chip,
      platform: res.Msg.platform,
      whatsminer: {
        api: res.Msg.api_ver,
        firmware: res.Msg.fw_ver
      },
      apiVersion: this.apiVersion
    }
  }

  async getMinerStats () {
    const res = await this._requestReadEndpoint('summary')

    if (!res?.SUMMARY?.[0]) {
      throw new Error(`ERR_MINER_STATS_FAILED: ${res?.Msg || 'Unknown error'} (Code: ${res?.Code || 0})`)
    }

    const processedStats = {
      elapsed: res.SUMMARY[0].Elapsed,
      mhs_av: res.SUMMARY[0]['MHS av'],
      mhs_5s: res.SUMMARY[0]['MHS 5s'],
      mhs_1m: res.SUMMARY[0]['MHS 1m'],
      mhs_5m: res.SUMMARY[0]['MHS 5m'],
      mhs_15m: res.SUMMARY[0]['MHS 15m'],
      prev_mhs: this._cachedPrevHashrate,
      hs_rt: res.SUMMARY[0]['HS RT'],
      accepted: res.SUMMARY[0].Accepted,
      rejected: res.SUMMARY[0].Rejected,
      total_mh: res.SUMMARY[0]['Total MH'],
      temperature: res.SUMMARY[0].Temperature ?? res.SUMMARY[0]['Chip Temp Avg'],
      freq_avg: res.SUMMARY[0].freq_avg,
      fan_speed_in: res.SUMMARY[0]['Fan Speed In'],
      fan_speed_out: res.SUMMARY[0]['Fan Speed Out'],
      power: res.SUMMARY[0].Power,
      power_rate: res.SUMMARY[0]['Power Rate'],
      pool_rejected: res.SUMMARY[0]['Pool Rejected%'],
      pool_stale: res.SUMMARY[0]['Pool Stale%'],
      uptime: res.SUMMARY[0].Uptime,
      hash_stable: res.SUMMARY[0]['Hash Stable'],
      hash_stable_cost_seconds: res.SUMMARY[0]['Hash Stable Cost Seconds'],
      hash_deviation: res.SUMMARY[0]['Hash Deviation%'],
      target_freq: res.SUMMARY[0]['Target Freq'],
      target_mhs: res.SUMMARY[0]['Target MHS'],
      env_temp: res.SUMMARY[0]['Env Temp'],
      power_mode: res.SUMMARY[0]['Power Mode'],
      factory_ghs: res.SUMMARY[0]['Factory GHS'],
      power_limit: res.SUMMARY[0]['Power Limit'],
      chip_temp_min: res.SUMMARY[0]['Chip Temp Min'],
      chip_temp_max: res.SUMMARY[0]['Chip Temp Max'],
      chip_temp_avg: res.SUMMARY[0]['Chip Temp Avg'],
      board_temperature: res.SUMMARY[0]['Board Temperature'],
      debug: res.SUMMARY[0].Debug,
      btminer_fast_boot: res.SUMMARY[0]['Btminer Fast Boot']
    }

    this._cachedPrevHashrate = processedStats.mhs_5m

    return processedStats
  }

  async getPools () {
    const res = await this._requestReadEndpoint('pools')

    return res?.POOLS
      ? res.POOLS.map(pool => ({
        index: pool.POOL,
        url: pool.URL,
        status: pool.Status,
        priority: pool.Priority,
        quota: pool.Quota,
        getworks: pool.Getworks,
        accepted: pool.Accepted,
        rejected: pool.Rejected,
        stale: pool.Stale,
        works: pool.Works,
        discarded: pool.Discarded,
        get_failures: pool['Get Failures'],
        remote_failures: pool['Remote Failures'],
        user: pool.User,
        last_share_time: pool['Last Share Time'],
        stratum_active: pool['Stratum Active'],
        stratum_difficulty: pool['Stratum Difficulty'],
        pool_rejected: pool['Pool Rejected%'],
        pool_stale: pool['Pool Stale%'],
        bad_work: pool['Bad Work'],
        current_block_height: pool['Current Block Height'],
        current_block_version: pool['Current Block Version']
      }))
      : []
  }

  async restartMinerSoftware () {
    try {
      const res = await this._requestWriteEndpoint('restart_btminer')
      return { success: isResOK(res) }
    } catch (e) {
      this.debugError(e)
      return { success: false, error_msg: e.message }
    }
  }

  async setPools (pools, appendId = true) {
    let oldPools = await this.getPools()

    oldPools = oldPools.map((pool) => ({
      ...pool,
      username: pool.user
    }))

    while (oldPools.length < 3) {
      oldPools.push({
        url: '',
        username: '',
        worker_password: ''
      })
    }

    pools = this._prepPools(pools, appendId, oldPools)

    if (pools === false) {
      this.debugError('Pools are same, skipping')
      return { success: true, message: 'Pools are same, skipping' }
    }

    const poolsData = {
      pool1: pools[0].url,
      worker1: pools[0].worker_name,
      passwd1: pools[0].worker_password,
      pool2: pools[1].url,
      worker2: pools[1].worker_name,
      passwd2: pools[1].worker_password,
      pool3: pools[2].url,
      worker3: pools[2].worker_name,
      passwd3: pools[2].worker_password
    }

    try {
      const res = await this._requestWriteEndpoint('update_pools', poolsData)
      this.reboot()

      return { success: isResOK(res) }
    } catch (e) {
      this.debugError(e)
      return { success: false, error_msg: e.message }
    }
  }

  async factoryReset () {
    try {
      const res = await this._requestWriteEndpoint('factory_reset')
      return { success: isResOK(res) }
    } catch (e) {
      this.debugError(e)
      return { success: false, error_msg: e.message }
    }
  }

  async updateAdminPassword (newPassword) {
    try {
      const res = await this._requestWriteEndpoint('update_pwd', {
        old: this.opts.password,
        new: newPassword
      })
      this.opts.password = newPassword
      return { success: isResOK(res) }
    } catch (e) {
      this.debugError(e)
      return { success: false, error_msg: e.message }
    }
  }

  async enableWebPools () {
    try {
      const res = await this._requestWriteEndpoint('enable_web_pools')
      return { success: isResOK(res) }
    } catch (e) {
      this.debugError(e)
      return { success: false, error_msg: e.message }
    }
  }

  async disableWebPools () {
    try {
      const res = await this._requestWriteEndpoint('disable_web_pools')
      return { success: isResOK(res) }
    } catch (e) {
      this.debugError(e)
      return { success: false, error_msg: e.message }
    }
  }

  async setHostname (hostname) {
    try {
      const value = normalizeHostname(hostname)
      const res = await this._requestWriteEndpoint('set_hostname', { hostname: value }, true, false)
      return { success: isResOK(res) }
    } catch (e) {
      this.debugError(e)
      return { success: false, error_msg: e.message }
    }
  }

  reboot () {
    this._requestWriteEndpoint('reboot', { respbefore: 'true' }, false).catch(e => this.debugError('reboot_err', e))
    return { success: true }
  }

  async prePowerOn () {
    let res = await this._requestWriteEndpoint('pre_power_on').catch(e => this.debugError('pre_power_on_err', e))
    while (res?.Msg?.complete !== 'true') {
      await new Promise(r => setTimeout(r), 200)
      res = await this._requestWriteEndpoint('pre_power_on').catch(e => this.debugError('pre_power_on_err', e))
    }
    return { success: isResOK(res) }
  }

  async setTempOffset (offset) {
    // UNTESTED
    try {
      const res = await this._requestWriteEndpoint('set_temp_offset', { temp_offset: offset })
      return { success: isResOK(res) }
    } catch (e) {
      this.debugError(e)
      return { success: false, error_msg: e.message }
    }
  }

  async setPowerOffCool (state) {
    // UNTESTED
    try {
      const res = await this._requestWriteEndpoint('set_poweroff_cool', { poweroff_cool: state ? '1' : '0' })
      return { success: isResOK(res) }
    } catch (e) {
      this.debugError(e)
      return { success: false, error_msg: e.message }
    }
  }

  async setFanZeroSpeed (state) {
    // UNTESTED
    try {
      const res = await this._requestWriteEndpoint('set_fan_zero_speed', { fan_zero_speed: state ? '1' : '0' })
      return { success: isResOK(res) }
    } catch (e) {
      this.debugError(e)
      return { success: false, error_msg: e.message }
    }
  }

  async setZone (timezone, zoneName) {
    try {
      await this._requestWriteEndpoint('set_zone', { timezone, zonename: zoneName })
      return { success: true }
    } catch (e) {
      this.debugError(e)
      return { success: false, error_msg: e.message }
    }
  }

  suspendMining () {
    this._requestWriteEndpoint('power_off', { respbefore: 'true' }).catch(e => this.debugError('suspend_err', e))
    return { success: true }
  }

  async resumeMining () {
    try {
      const res = await this._requestWriteEndpoint('power_on')
      return { success: isResOK(res) }
    } catch (e) {
      this.debugError(e)
      return { success: false, error_msg: e.message }
    }
  }

  async setPowerMode (mode) {
    if (['low', 'normal', 'high'].indexOf(mode) > -1) {
      try {
        if (isResOK(await this._requestWriteEndpoint('power_on'))) {
          // no resp, will timeout
          this._requestWriteEndpoint(`set_${mode}_power`).catch(e => this.debugError('set_powermode_err', e))
        }
      } catch (e) {
        this.debugError('set_powermode_err', e)
      }
      return { success: true }
    } else if (mode === POWER_MODE.SLEEP) {
      return this.suspendMining()
    } else {
      throw new Error('ERR_INVALID_MODE')
    }
  }

  async setFrequency (percent) {
    try {
      const res = await this._requestWriteEndpoint('set_target_freq', { percent })
      return { success: isResOK(res) }
    } catch (e) {
      this.debugError(e)
      return { success: false, error_msg: e.message }
    }
  }

  async enableFastBoot () {
    try {
      const res = await this._requestWriteEndpoint('enable_btminer_fast_boot')
      return { success: isResOK(res) }
    } catch (e) {
      this.debugError(e)
      return { success: false, error_msg: e.message }
    }
  }

  async disableFastBoot () {
    try {
      const res = await this._requestWriteEndpoint('disable_btminer_fast_boot')
      return { success: isResOK(res) }
    } catch (e) {
      this.debugError(e)
      return { success: false, error_msg: e.message }
    }
  }

  async setPowerLimit (power) {
    try {
      const res = await this._requestWriteEndpoint('adjust_power_limit', { power_limit: power.toString() })
      return { success: isResOK(res) }
    } catch (e) {
      this.debugError(e)
      return { success: false, error_msg: e.message }
    }
  }

  async setPowerPct (pct) {
    try {
      const minerType = this.opts.type.split('-').pop()

      const liquidCooledTypes = [...MINER_COOLING_TYPE_MAP.HYDRO, ...MINER_COOLING_TYPE_MAP.IMMERSION]

      if (Number(pct) > 200) {
        return { success: false, error_msg: 'ERR_POWER_PCT_NOT_SUPPORTED: Power percentage of higher than 200% is not supported' }
      }

      if (Number(pct) > 100 && !liquidCooledTypes.includes(minerType)) {
        return { success: false, error_msg: 'ERR_POWER_PCT_NOT_SUPPORTED: Power percentage of higher than 100% is only supported for liquid-cooled miners' }
      }

      const res = await this._requestWriteEndpoint('set_power_pct_v2', { percent: pct.toString() })
      return { success: isResOK(res) }
    } catch (e) {
      this.debugError(e)
      return { success: false, error_msg: e.message }
    }
  }

  async setLED (enabled) {
    if (typeof enabled !== 'boolean') throw new Error('ERR_INVALID_ARG_TYPE')
    try {
      if (enabled) {
        const res = await this._requestWriteEndpoint('set_led', {
          color: 'red',
          period: 200,
          duration: 100,
          start: 0
        })
        const res2 = await this._requestWriteEndpoint('set_led', {
          color: 'green',
          period: 200,
          duration: 100,
          start: 0
        })
        setTimeout(() => {
          this.setLED(false)
        }, 2 * 60 * 1000)
        return { success: isResOK(res) && isResOK(res2) }
      } else {
        const res = await this._requestWriteEndpoint('set_led', { param: 'auto' })
        return { success: isResOK(res) }
      }
    } catch (e) {
      this.debugError(e)
      return { success: false, error_msg: e.message }
    }
  }

  async getDevices () {
    const res = await this._requestReadEndpoint('edevs')

    return (res?.DEVS || []).map(device => ({
      index: device.ASC,
      slot: device.Slot,
      enabled: device.Enabled,
      status: device.Status,
      temperature: device.Temperature,
      chip_frequency: device['Chip Frequency'],
      mhs_av: device['MHS av'],
      mhs_5s: device['MHS 5s'],
      mhs_1m: device['MHS 1m'],
      mhs_5m: device['MHS 5m'],
      mhs_15m: device['MHS 15m'],
      hs_rt: device['HS RT'],
      factory_ghs: device['Factory GHS'],
      upfreq_complete: device['Upfreq Complete'],
      effective_chips: device['Effective Chips'],
      pcb_sn: device['PCB SN'],
      chip_data: device['Chip Data'],
      chip_temp_min: device['Chip Temp Min'],
      chip_temp_max: device['Chip Temp Max'],
      chip_temp_avg: device['Chip Temp Avg'],
      chip_vol_diff: device.chip_vol_diff
    }))
  }

  async getDevicesInfo () {
    const res = await this._requestReadEndpoint('devdetails')

    return (res?.DEVDETAILS || []).map(device => ({
      index: device.DEVDETAILS,
      name: device.Name,
      id: device.ID,
      driver: device.Driver,
      kernel: device.Kernel,
      model: device.Model
    }))
  }

  async getPSUInformation () {
    const res = await this._requestReadEndpoint('get_psu')

    return {
      name: res.Msg.name,
      version: {
        hardware: res.Msg.hw_version,
        software: res.Msg.sw_version
      },
      model: res.Msg.model,
      fanSpeed: res.Msg.fan_speed,
      powerInput: {
        current: res.Msg.iin,
        voltage: res.Msg.vin
      },
      serialNumber: res.Msg.serial_no,
      vendor: res.Msg.vendor ?? res.Msg.vender
    }
  }

  async updateFirmware (firmware) {
    try {
      const { response, firmware: selected } = await this._requestWriteFirmwareEndpoint(firmware)
      return {
        success: true,
        size: selected.size,
        sha256: crypto.createHash('sha256').update(selected.content).digest('hex'),
        message: response.Msg
      }
    } catch (e) {
      this.debugError(e)
      return { success: false, error_msg: e.message }
    }
  }

  async getErrors () {
    const res = await this._requestReadEndpoint('get_error_code')

    return (res?.Msg?.error_code || []).map(data => {
      const code = Object.keys(data)[0]

      return {
        name: getErrorMsg(code),
        message: `Error code ${code}`,
        code
      }
    })
  }

  async setNetworkInformation (network) {
    try {
      const config = normalizeNetworkConfig(network)
      const res = await this._requestWriteEndpoint('net_config',
        config.dhcp
          ? {
              param: 'dhcp'
            }
          : {
              ip: config.ip,
              mask: config.netmask,
              gate: config.gateway,
              dns: config.dns,
              host: ''
            },
        true,
        false
      )
      return { success: isResOK(res) }
    } catch (e) {
      this.debugError(e)
      return {
        success: false,
        error_msg: e.message?.startsWith('ERR_') ? e.message : 'ERR_NETWORK_OUTCOME_UNKNOWN'
      }
    }
  }

  async downloadLogs () {
    try {
      await this._ensureHandler()
      if (this.token === undefined) await this._refreshToken()
      const { sign, key } = this.protocolHandler.getTokenInfo()
      const command = JSON.stringify({ token: sign, cmd: 'download_logs' })
      const data = CryptoJS.AES.encrypt(command, CryptoJS.SHA256(key), { mode: CryptoJS.mode.ECB }).toString()
      const archive = await this._requestLogDownload(JSON.stringify({ enc: 1, data }), key)
      this.updateLastSeen()
      return createLogDownloadResult(archive)
    } catch (error) {
      if (error.message === 'ERR_TOKEN_EXPIRED') this.token = undefined
      return { success: false, error_msg: error.message }
    }
  }

  async getMinerInfo () {
    const res = await this._requestReadEndpoint('get_miner_info')
    return res?.Msg
  }

  checkIfAllErrorsAreMinor (errors) {
    const minerType = this.opts.type
    if (minerType.includes('m56s') || minerType.includes('m30')) {
      return errors.every(error => MINOR_ERROR_CODES_M56S_M30_SET.has(error))
    } else if (minerType.includes('m53')) {
      return errors.every(error => MINOR_ERROR_CODES_M53_SET.has(error))
    }
    return false
  }

  async _prepSnap () {
    const data = await async.parallelLimit({
      stats: this.getMinerStats.bind(this),
      pools: this.getPools.bind(this),
      devices: this.getDevices.bind(this),
      errors: this.getErrors.bind(this),
      miner_info: this.getMinerInfo.bind(this),
      version: this.getVersion.bind(this)
    }, 3)

    this._handleErrorUpdates(data.errors)

    const isErrored = data.errors.length > 0
    const chipTemperatures = data.devices.flatMap((device, index) => {
      const max = parseFloat(device.chip_temp_max)
      const min = parseFloat(device.chip_temp_min)
      const avg = parseFloat(device.chip_temp_avg)
      if (![max, min, avg].every(Number.isFinite)) return []
      return [{ index, max, min, avg }]
    })
    const boardTemperatures = Array.isArray(data.stats.board_temperature)
      ? data.stats.board_temperature
      : data.devices.map(device => device.temperature)
    const pcbTemperatures = boardTemperatures.flatMap((temperature, index) => {
      const current = parseFloat(temperature)
      return Number.isFinite(current) ? [{ index, current }] : []
    })
    const summaryChipMax = parseFloat(data.stats.chip_temp_max)
    const summaryChipAvg = parseFloat(data.stats.chip_temp_avg)
    const chipMax = Number.isFinite(summaryChipMax)
      ? summaryChipMax
      : chipTemperatures.length > 0 ? Math.max(...chipTemperatures.map(item => item.max)) : 0
    const chipAvg = Number.isFinite(summaryChipAvg)
      ? summaryChipAvg
      : chipTemperatures.length > 0
        ? chipTemperatures.reduce((total, item) => total + item.avg, 0) / chipTemperatures.length
        : 0

    return {
      stats: {
        status: this._getStatus(isErrored, data.stats),
        errors: isErrored ? data.errors : undefined,
        are_all_errors_minor: data?.errors?.length ? this.checkIfAllErrorsAreMinor(data.errors) : false,
        power_w: this._calcPowerW(data.stats),
        efficiency_w_ths: this._calcEfficiency(data.stats),
        nominal_efficiency_w_ths: this.opts.nominalEfficiencyWThs || 0,
        pool_status: data.pools.map((pool) => ({
          pool: pool.url,
          accepted: parseInt(pool.accepted),
          rejected: parseInt(pool.rejected),
          stale: parseInt(pool.stale)
        })),
        all_pools_shares: this._calcNewShares(data.pools),
        uptime_ms: parseFloat(data.stats.elapsed) * 1000,
        hashrate_mhs: this._calcHashrates(data.stats),
        frequency_mhz: {
          avg: Math.floor(parseFloat(data.stats.freq_avg) * 100) / 100,
          target: parseFloat(data.stats.target_freq),
          chips: data.devices.map((device, index) => ({
            index,
            current: Math.floor(parseFloat(device.chip_frequency) * 100) / 100
          }))
        },
        temperature_c: {
          ambient: Math.floor(parseFloat(data.stats.env_temp) * 100) / 100,
          max: Math.floor(chipMax * 100) / 100,
          avg: Math.floor(chipAvg * 100) / 100,
          chips: chipTemperatures.map(item => ({
            index: item.index,
            max: Math.floor(item.max * 100) / 100,
            min: Math.floor(item.min * 100) / 100,
            avg: Math.floor(item.avg * 100) / 100
          })),
          pcb: pcbTemperatures.map(item => ({
            index: item.index,
            current: Math.floor(item.current * 100) / 100
          }))
        },
        miner_specific: {
          upfreq_speed: data.miner_info.upfreq_speed ? parseFloat(data.miner_info.upfreq_speed) : undefined
        }
      },
      config: {
        network_config: {
          mode: data.miner_info.proto,
          ip_address: data.miner_info.ip,
          dns: data.miner_info.dns.split(' '),
          ip_gw: data.miner_info.gateway,
          ip_netmask: data.miner_info.netmask
        },
        pool_config: data.pools.map((pool) => ({
          url: pool.url,
          username: pool.user
        })),
        power_mode: this._getPowerMode(data.stats),
        suspended: this._isSuspended(data.stats),
        led_status: data.miner_info.ledstat !== 'auto',
        firmware_ver: data.version.whatsminer.firmware
      }
    }
  }

  _getStatus (isErrored, stats) {
    if (isErrored) return STATUS.ERROR
    const currentHashrate = parseFloat(stats.mhs_av) || 0
    return currentHashrate > 0 ? STATUS.MINING : STATUS.SLEEPING
  }

  _isSuspended (stats) {
    return parseFloat(stats.mhs_av) === 0
  }

  _calcPowerW (stats) {
    return Math.floor(parseFloat(stats.power) * 100) / 100
  }

  _calcAvgTemp (devices) {
    return Math.floor(devices.reduce((acc, device) =>
      acc + parseFloat(device.chip_temp_avg), 0) / devices.length * 100) / 100
  }

  _getPowerMode (stats) {
    if (parseFloat(stats.mhs_av) === 0) return POWER_MODE.SLEEP
    return stats.power_mode?.toLowerCase()
  }

  _calcEfficiency (stats) {
    return Math.floor(parseFloat(stats.power_rate) * 100) / 100
  }

  _calcHashrates (stats) {
    return {
      avg: Math.floor(parseFloat(stats.mhs_av) * 100) / 100,
      t_5s: Math.floor(parseFloat(stats.mhs_5s) * 100) / 100,
      t_1m: Math.floor(parseFloat(stats.mhs_1m) * 100) / 100,
      t_5m: Math.floor(parseFloat(stats.mhs_5m) * 100) / 100,
      t_15m: Math.floor(parseFloat(stats.mhs_15m) * 100) / 100
    }
  }
}

module.exports = WhatsminerApiV2Client
