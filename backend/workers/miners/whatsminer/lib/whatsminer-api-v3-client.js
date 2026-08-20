'use strict'

const EventEmitter = require('node:events')
const debug = require('debug')('mdk:worker:whatsminer:api-v3')
const WMApiV3 = require('./protocols/wm-api-v3')
const { WMApiV3Transport } = require('./protocols/wm-api-v3-transport')
const { API_VERSIONS } = require('./protocols/constants')
const { getErrorMsg } = require('./utils')
const createLogDownloadResult = require('./utils/log-download')
const normalizeNetworkConfig = require('./utils/network')
const normalizeHostname = require('./utils/hostname')
const readFirmware = require('./utils/firmware')
const crypto = require('node:crypto')
const {
  MINOR_ERROR_CODES_M56S_M30_SET,
  MINOR_ERROR_CODES_M53_SET,
  MINER_COOLING_TYPE_MAP
} = require('./utils/constants')
const { STATUS, POWER_MODE } = require('../../../../core/mdk').constants

const toMhs = (ths) => (Number(ths) || 0) * 1000000
const floor2 = (value) => Math.floor((Number(value) || 0) * 100) / 100

class WhatsminerApiV3Client {
  constructor (opts) {
    this.opts = {
      timeout: opts.conf?.timeout || 10000,
      ...opts
    }
    this.conf = opts.conf || {}
    this.apiVersion = opts.apiVersion || API_VERSIONS.V3
    this.events = new EventEmitter()
    this.deviceDataCache = {}
    this.lastSnap = null
    this._lastSeen = null
    this.rpc = new WMApiV3Transport({
      host: this.opts.address,
      port: this.opts.port || 4433,
      timeout: this.opts.timeout
    })
    this.protocol = new WMApiV3({
      rpc: this.rpc,
      password: this.opts.password,
      account: this.opts.account,
      debugError: (...args) => debug(...args)
    })
  }

  on (...args) { this.events.on(...args); return this }
  emit (...args) { return this.events.emit(...args) }
  listenerCount (...args) { return this.events.listenerCount(...args) }

  async close () {
    await this.rpc.stop()
  }

  updateLastSeen () {
    this._lastSeen = Date.now()
  }

  async fetchDeviceData (fn, cacheTime = 5000) {
    const lastFetched = this.deviceDataCache[fn.name]?.lastFetch
    if (!lastFetched || lastFetched < Date.now() - cacheTime) {
      this.deviceDataCache[fn.name] = {
        data: await fn.call(this),
        lastFetch: Date.now()
      }
    }
    return this.deviceDataCache[fn.name].data
  }

  async _read (command, param) {
    const params = param === undefined ? {} : { param }
    const response = await this.protocol.requestRead(command, params)
    this.updateLastSeen()
    return response.msg
  }

  async _write (command, param, includeParam = true) {
    const params = includeParam ? { param } : {}
    const response = await this.protocol.requestWrite(command, params)
    this.updateLastSeen()
    return response
  }

  async getVersion () {
    const msg = await this._read('get.device.info', 'system')
    const system = msg.system || msg
    return {
      chip: system['control-board-version'],
      platform: system.platform,
      whatsminer: {
        api: system.api,
        firmware: system.fwversion
      },
      apiVersion: this.apiVersion
    }
  }

  async getMinerStats () {
    const [statusMsg, setting] = await Promise.all([
      this._read('get.miner.status', 'summary+pools'),
      this._read('get.miner.setting')
    ])
    const summary = statusMsg.summary || statusMsg
    const pools = statusMsg.pools || []
    const accepted = pools.some(pool => pool.accepted !== undefined)
      ? pools.reduce((total, pool) => total + (Number(pool.accepted) || 0), 0)
      : undefined
    const rejected = pools.some(pool => pool.rejected !== undefined)
      ? pools.reduce((total, pool) => total + (Number(pool.rejected) || 0), 0)
      : undefined

    return {
      elapsed: summary.elapsed || 0,
      uptime: summary['bootup-time'] || 0,
      mhs_av: toMhs(summary['hash-average']),
      mhs_1m: toMhs(summary['hash-1min']),
      mhs_15m: toMhs(summary['hash-15min']),
      hs_rt: toMhs(summary['hash-realtime']),
      freq_avg: summary['freq-avg'] || 0,
      target_freq: summary['target-freq'] || 0,
      factory_ghs: (Number(summary['factory-hash']) || 0) * 1000,
      power: summary['power-5min'] || summary['power-realtime'] || 0,
      power_rate: summary['power-rate'] || 0,
      env_temp: summary['environment-temperature'] || 0,
      temperature: summary['chip-temp-avg'] || 0,
      board_temperature: summary['board-temperature'] || [],
      chip_temp_min: summary['chip-temp-min'],
      chip_temp_avg: summary['chip-temp-avg'],
      chip_temp_max: summary['chip-temp-max'],
      fan_speed_in: summary['fan-speed-in'] || 0,
      fan_speed_out: summary['fan-speed-out'] || 0,
      accepted,
      rejected,
      power_mode: setting['power-mode'] || 'normal'
    }
  }

  async getPools () {
    let msg
    try {
      msg = await this._read('get.miner.status', 'pools')
    } catch (err) {
      // Idle firmware can reject the pools-only view while still returning a
      // valid combined status with the pools field omitted.
      if (err.message !== 'ERR_FAIL') throw err
      msg = await this._read('get.miner.status', 'summary+pools')
    }
    const pools = msg.pools || (Array.isArray(msg) ? msg : [])
    return pools.map(pool => ({
      index: pool.id || 0,
      url: pool.url || '',
      status: pool.status || 'alive',
      user: pool.account || '',
      accepted: pool.accepted,
      rejected: pool.rejected,
      stale: pool.stale,
      stratum_active: pool['stratum-active'] || false,
      stratum_difficulty: pool['stratum-diff'] || 0,
      last_share_time: pool['last-share-time'],
      pool_rejected: pool['reject-percent'] || 0
    }))
  }

  async getDevices () {
    const msg = await this._read('get.miner.status', 'edevs')
    const devices = msg.edevs || (Array.isArray(msg) ? msg : [])
    return devices.map(device => ({
      index: device.id || 0,
      slot: device.slot || 0,
      chip_frequency: device.freq || 0,
      mhs_av: toMhs(device['hash-average']),
      factory_ghs: (Number(device['factory-hash']) || 0) * 1000,
      effective_chips: device['effective-chips'] || 0,
      chip_temp_min: device['chip-temp-min'],
      chip_temp_avg: device['chip-temp-avg'],
      chip_temp_max: device['chip-temp-max']
    }))
  }

  async getErrors () {
    const msg = await this._read('get.device.info', 'error-code')
    const errors = msg['error-code'] || []
    return errors.map(data => {
      const code = String(Object.keys(data)[0])
      return { name: getErrorMsg(code), message: `Error code ${code}`, code }
    })
  }

  async getMinerInfo () {
    const [msg, setting] = await Promise.all([
      this._read('get.device.info'),
      this._read('get.miner.setting')
    ])
    const network = msg.network || {}
    const miner = msg.miner || {}
    const system = msg.system || {}
    const power = msg.power || {}
    return {
      ...miner,
      type: miner.type,
      proto: network.proto,
      ip: network.ip,
      dns: network.dns || '',
      gateway: network.gateway,
      netmask: network.netmask,
      hostname: network.hostname,
      mac: network.mac,
      ledstat: system.ledstatus,
      led_mode: system.ledstatus,
      minersn: miner['miner-sn'],
      powersn: power.sn,
      upfreq_speed: setting['upfreq-speed'] ?? miner.UpfreqSpeed
    }
  }

  async getPSUInformation () {
    const msg = await this._read('get.device.info', 'power')
    const power = msg.power || msg
    return {
      name: power.type,
      version: { hardware: power.hwversion, software: power.swversion },
      model: power.model,
      fanSpeed: power.fanspeed,
      powerInput: { current: power.iin, voltage: power.vin },
      serialNumber: power.sn,
      vendor: power.vendor
    }
  }

  async setLED (enabled) {
    if (typeof enabled !== 'boolean') throw new Error('ERR_INVALID_ARG_TYPE')
    try {
      const param = enabled
        ? [
            { color: 'red', period: 200, duration: 100, start: 0 },
            { color: 'green', period: 200, duration: 100, start: 0 }
          ]
        : 'auto'
      await this._write('set.system.led', param)
      if (enabled) {
        const timer = setTimeout(() => this.setLED(false).catch(error => debug(error)), 2 * 60 * 1000)
        timer.unref?.()
      }
      return { success: true }
    } catch (error) {
      return { success: false, error_msg: error.message }
    }
  }

  async setPowerMode (mode) {
    if (!['low', 'normal', 'high', POWER_MODE.SLEEP].includes(mode)) throw new Error('ERR_INVALID_MODE')
    try {
      if (mode === POWER_MODE.SLEEP) await this._write('set.miner.service', 'stop')
      else {
        await this._write('set.miner.service', 'start')
        await this._write('set.miner.power_mode', mode)
      }
      return { success: true }
    } catch (error) {
      return { success: false, error_msg: error.message }
    }
  }

  async setPowerPct (pct) {
    const value = Number(pct)
    const minerType = String(this.opts.type || '').split('-').pop()
    const liquidCooledTypes = [...MINER_COOLING_TYPE_MAP.HYDRO, ...MINER_COOLING_TYPE_MAP.IMMERSION]
    if (value > 200 || (value > 100 && !liquidCooledTypes.includes(minerType))) {
      return { success: false, error_msg: 'ERR_POWER_PCT_NOT_SUPPORTED' }
    }
    try {
      await this._write('set.miner.power_percent', {
        // Firmware reads cJSON.valuestring even though its docs say Number.
        percent: String(value),
        mode: 'normal'
      })
      return { success: true }
    } catch (error) {
      return { success: false, error_msg: error.message }
    }
  }

  async setPools (pools, appendId = true) {
    if (!Array.isArray(pools)) throw new Error('ERR_INVALID_ARG_TYPE')
    const param = pools.slice(0, 3).map(pool => ({
      pool: pool.url,
      worker: appendId ? `${pool.worker_name}.${this.opts.id}` : pool.worker_name,
      passwd: pool.worker_password || ''
    }))
    try {
      await this._write('set.miner.pools', param)
      return { success: true }
    } catch (error) {
      return { success: false, error_msg: error.message }
    }
  }

  async setupPools () {
    try {
      return await this.setPools(this.conf.pools, true)
    } catch (error) {
      return { success: false, error_msg: error.message }
    }
  }

  async reboot () {
    try {
      await this._write('set.system.reboot', undefined, false)
      return { success: true }
    } catch (error) {
      return { success: false, error_msg: error.message }
    }
  }

  async downloadLogs () {
    try {
      const archive = await this.protocol.requestDownload('get.log.download')
      this.updateLastSeen()
      return createLogDownloadResult(archive)
    } catch (error) {
      return { success: false, error_msg: error.message }
    }
  }

  async setNetworkInformation (network) {
    try {
      const config = normalizeNetworkConfig(network)
      const param = config.dhcp
        ? 'dhcp'
        : {
            ip: config.ip,
            netmask: config.netmask,
            gateway: config.gateway,
            dns: config.dns
          }
      await this._write('set.system.net_config', param)
      return { success: true }
    } catch (error) {
      return { success: false, error_msg: error.message }
    }
  }

  async setHostname (hostname) {
    try {
      const value = normalizeHostname(hostname)
      await this._write('set.system.hostname', { hostname: value })
      return { success: true }
    } catch (error) {
      return { success: false, error_msg: error.message }
    }
  }

  async updateFirmware (firmware) {
    try {
      const version = await this.getVersion()
      const selected = readFirmware(String(version.platform || '').toLowerCase(), firmware)
      if (!selected) throw new Error('ERR_INVALID_FIRMWARE')
      const response = await this.protocol.requestFirmwareUpload(
        'set.system.update_firmware',
        selected.content,
        this.conf.firmwareUpdateTimeout || 5 * 60 * 1000
      )
      this.updateLastSeen()
      return {
        success: true,
        size: selected.size,
        sha256: crypto.createHash('sha256').update(selected.content).digest('hex'),
        message: response.msg
      }
    } catch (error) {
      return { success: false, error_msg: error.message }
    }
  }

  validateWriteAction (action, value) {
    if (action === 'setLED' && typeof value !== 'boolean') throw new Error('ERR_SET_LED_ENABLED_INVALID')
    if (action === 'setPowerMode' && !['low', 'normal', 'high', 'sleep'].includes(value)) {
      throw new Error('ERR_SET_POWER_MODE_INVALID')
    }
    return 1
  }

  checkIfAllErrorsAreMinor (errors) {
    const type = String(this.opts.type || '')
    if (type.includes('m56s') || type.includes('m30')) {
      return errors.every(error => MINOR_ERROR_CODES_M56S_M30_SET.has(error.code))
    }
    if (type.includes('m53')) return errors.every(error => MINOR_ERROR_CODES_M53_SET.has(error.code))
    return false
  }

  async getSnap () {
    try {
      const [stats, pools, devices, errors, minerInfo, version] = await Promise.all([
        this.getMinerStats(),
        this.getPools(),
        this.getDevices(),
        this.getErrors(),
        this.getMinerInfo(),
        this.getVersion()
      ])
      const chipTemperatures = devices.flatMap((device, index) => {
        const max = Number(device.chip_temp_max)
        const min = Number(device.chip_temp_min)
        const avg = Number(device.chip_temp_avg)
        return [max, min, avg].every(Number.isFinite) ? [{ index, max, min, avg }] : []
      })
      const chipMax = Number.isFinite(Number(stats.chip_temp_max))
        ? Number(stats.chip_temp_max)
        : Math.max(0, ...chipTemperatures.map(item => item.max))
      const chipAvg = Number.isFinite(Number(stats.chip_temp_avg))
        ? Number(stats.chip_temp_avg)
        : chipTemperatures.length
          ? chipTemperatures.reduce((total, item) => total + item.avg, 0) / chipTemperatures.length
          : 0
      const mining = (Number(stats.mhs_av) || 0) > 0
      const dns = Array.isArray(minerInfo.dns) ? minerInfo.dns : String(minerInfo.dns || '').split(' ').filter(Boolean)

      const snap = {
        success: true,
        raw_errors: errors,
        stats: {
          status: errors.length ? STATUS.ERROR : mining ? STATUS.MINING : STATUS.SLEEPING,
          errors: errors.length ? errors : undefined,
          are_all_errors_minor: errors.length ? this.checkIfAllErrorsAreMinor(errors) : false,
          power_w: floor2(stats.power),
          efficiency_w_ths: floor2(stats.power_rate),
          nominal_efficiency_w_ths: this.opts.nominalEfficiencyWThs || 0,
          pool_status: pools.map(pool => ({
            pool: pool.url,
            accepted: Number(pool.accepted) || 0,
            rejected: Number(pool.rejected) || 0,
            stale: Number(pool.stale) || 0
          })),
          all_pools_shares: { accepted: 0, rejected: 0, stale: 0 },
          uptime_ms: (Number(stats.elapsed) || 0) * 1000,
          hashrate_mhs: {
            avg: floor2(stats.mhs_av),
            t_1m: floor2(stats.mhs_1m),
            t_15m: floor2(stats.mhs_15m)
          },
          frequency_mhz: {
            avg: floor2(stats.freq_avg),
            target: Number(stats.target_freq) || 0,
            chips: devices.map((device, index) => ({ index, current: floor2(device.chip_frequency) }))
          },
          temperature_c: {
            ambient: floor2(stats.env_temp),
            max: floor2(chipMax),
            avg: floor2(chipAvg),
            chips: chipTemperatures.map(item => ({
              index: item.index,
              max: floor2(item.max),
              min: floor2(item.min),
              avg: floor2(item.avg)
            })),
            pcb: (stats.board_temperature || []).map((current, index) => ({ index, current: floor2(current) }))
          },
          miner_specific: { upfreq_speed: Number(minerInfo.upfreq_speed) || 0 }
        },
        config: {
          network_config: {
            mode: minerInfo.proto,
            ip_address: minerInfo.ip,
            dns,
            ip_gw: minerInfo.gateway,
            ip_netmask: minerInfo.netmask
          },
          pool_config: pools.map(pool => ({ url: pool.url, username: pool.user })),
          power_mode: mining ? String(stats.power_mode || '').toLowerCase() : POWER_MODE.SLEEP,
          suspended: !mining,
          led_status: minerInfo.ledstat !== 'auto',
          firmware_ver: version.whatsminer.firmware
        }
      }
      this.lastSnap = snap
      return snap
    } catch (error) {
      debug('getSnap error: %s', error.message)
      return { success: false, stats: { status: 'error', errors: [{ msg: error.message, timestamp: Date.now() }] } }
    }
  }
}

module.exports = WhatsminerApiV3Client
