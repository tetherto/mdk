'use strict'

const { parallelLimit } = require('async')
const Miner = require('../../../tpls/tpl-lib-miner/lib/miner.js')
const { ErrorMap } = require('./utils/errors.js')
const { STATUS, POWER_MODE } = require('../../../tpls/tpl-lib-miner/lib/utils/constants.js')

class Antminer extends Miner {
  constructor (opts = {}) {
    super(opts)
    this.opts.errPort = this.opts.errPort ? this.opts.errPort : 6060

    this._setupClient()
    this._cachedPrevHashrate = null
  }

  async _setupClient () {
    const DigestClient = (await import('digest-fetch')).default
    this._digestClient = new DigestClient(this.opts.username, this.opts.password)
    this.client = {
      fetch: async (resource, opts) => {
        const controller = new AbortController()
        const id = setTimeout(() => {
          this.debugError(`Request timed out after ${this.opts.timeout}ms`)
          controller.abort()
        }, this.opts.timeout)
        const r = await this._digestClient.fetch(resource, {
          ...opts,
          signal: controller.signal
        })
        clearTimeout(id)
        this.updateLastSeen()
        return r
      }
    }
  }

  validateWriteAction (...params) {
    const [action, ...args] = params

    if (action === 'setPowerMode') {
      const [mode] = args
      if (![POWER_MODE.SLEEP, POWER_MODE.NORMAL].includes(mode)) {
        throw new Error('ERR_SET_POWER_MODE_INVALID')
      }
      return 1
    }

    return super.validateWriteAction(...params)
  }

  async getVersion () {
    try {
      const resp = await this.client.fetch(`http://${this.opts.address}:${this.opts.port}/cgi-bin/miner_type.cgi`)
      const version = await resp.json()

      return {
        success: true,
        platform: version.miner_type,
        antminer: {
          firmware: version.fw_version
        }
      }
    } catch (err) {
      return {
        success: false,
        error: err.message
      }
    }
  }

  async getSummary () {
    try {
      const resp = await this.client.fetch(`http://${this.opts.address}:${this.opts.port}/cgi-bin/summary.cgi`)
      const summary = await resp.json()

      const summaryData = summary.SUMMARY[0]
      return {
        success: true,
        mhs_av: summaryData.rate_avg * 1000,
        mhs_5s: summaryData.rate_5s * 1000,
        mhs_30m: summaryData.rate_30m * 1000,
        elapsed: summaryData.elapsed,
        best_share: summaryData.bestshare
      }
    } catch (err) {
      return {
        success: false,
        error: 'ERR_NO_DATA',
        mhs_av: 0,
        mhs_5s: 0,
        mhs_30m: 0,
        elapsed: 0,
        best_share: 0
      }
    }
  }

  async getMinerStats () {
    try {
      const resp = await this.client.fetch(`http://${this.opts.address}:${this.opts.port}/cgi-bin/stats.cgi`)
      const stats = await resp.json()

      const statsData = stats.STATS[0]
      const processedStats = {
        success: true,
        boards: Array.isArray(statsData.chain)
          ? statsData.chain.map(board => ({
            freq_avg: board.freq_avg,
            ghs_av: board.rate_real || 0,
            ghs_target: board.rate_ideal,
            hw_errors: board.hw,
            temp: {
              outlet: this.opts.type === 's19xp' ? Math.max(board.temp_pic[0], board.temp_pic[1]) : board.temp_pic[1],
              inlet: this.opts.type === 's19xp' ? Math.max(board.temp_pic[2], board.temp_pic[3]) : board.temp_pic[2]
            },
            raw_temps: {
              pic: board.temp_pic,
              pcb: board.temp_pcb,
              chip: board.temp_chip
            }
          }))
          : [],
        minerMode: parseInt(statsData['miner-mode']),
        mhs_av: statsData.rate_avg * 1000,
        mhs_5s: statsData.rate_5s * 1000,
        mhs_30m: statsData.rate_30m * 1000,
        prev_mhs: this._cachedPrevHashrate
      }

      this._cachedPrevHashrate = processedStats.mhs_av

      return processedStats
    } catch (err) {
      this.debugError('stats_err', err)
      return {
        success: false,
        error: 'ERR_NO_DATA',
        boards: [0, 1, 2].map(b => ({
          freq_avg: 0,
          ghs_av: 0,
          ghs_target: 0,
          hw_errors: 0,
          temp: {
            pcbInlet: '0-0',
            pcbOutlet: '0-0'
          },
          raw_temps: {
            pic: [],
            pcb: [],
            chip: []
          }
        })),
        minerMode: 1,
        mhs_av: 0,
        mhs_5s: 0,
        mhs_30m: 0
      }
    }
  }

  async getErrors () {
    try {
      const resp = await this.client.fetch(`http://${this.opts.address}:${this.opts.errPort}/warning`)
      if (!resp.ok) throw new Error('ERR_NO_DATA')
      const txt = await resp.text()

      if (txt === 'error 6060 cmd') throw new Error('ERR_OLD_API')
      const json = JSON.parse(txt)

      if (Object.keys(json).length === 1 && Object.keys(ErrorMap).includes(json.error_message)) {
        return {
          success: true,
          errors: [{
            name: ErrorMap[json.error_message],
            message: ErrorMap[json.error_message],
            code: json.error_message
          }]
        }
      } else if (Object.keys(json).length === 1 && json.error_message === 'None') {
        return {
          success: true,
          errors: []
        }
      }
    } catch (err) {
      this.debugError('error_err', err)
      return {
        success: false,
        errors: []
      }
    }
  }

  async getPools () {
    try {
      const resp = await this.client.fetch(`http://${this.opts.address}:${this.opts.port}/cgi-bin/pools.cgi`)
      const poolData = await resp.json()

      return poolData && Array.isArray(poolData.POOLS)
        ? poolData.POOLS.map(pool => ({
          index: pool.index,
          url: pool.url,
          username: pool.user,
          status: pool.status,
          priority: pool.priority,
          getworks: pool.getworks,
          accepted: pool.accepted,
          rejected: pool.rejected,
          discarded: pool.discarded,
          stale: pool.stale,
          difficulty: pool.diff,
          diff1: pool.diff1,
          difficulty_accepted: pool.diffa,
          difficulty_rejected: pool.diffr,
          difficulty_stale: pool.diffs,
          last_share_difficulty: pool.lsdiff,
          last_share_time: pool.lstime
        }))
        : []
    } catch (err) {
      this.debugError('pools_err', err)
      return []
    }
  }

  async getDeviceConfiguration () {
    try {
      const resp = await this.client.fetch(`http://${this.opts.address}:${this.opts.port}/cgi-bin/get_miner_conf.cgi`)
      const response = await resp.json()

      return {
        success: true,
        api_enabled: response['api-listen'],
        api_network_enabled: response['api-network'],
        api_groups: response['api-groups'],
        api_allow: response['api-allow'],
        fan_control: response['bitmain-fan-ctrl'],
        fan_speed: parseInt(response['bitmain-fan-pwm']),
        use_vil: response['bitmain-use-vil'],
        frequency: parseInt(response['bitmain-freq']),
        voltage: parseInt(response['bitmain-voltage']),
        cc_delay: parseInt(response['bitmain-ccdelay']),
        work_mode: parseInt(response['bitmain-work-mode']),
        frequency_level: parseInt(response['bitmain-freq-level'])
      }
    } catch (err) {
      this.debugError('device_err', err)
      return {
        success: false,
        error: err.message
      }
    }
  }

  async _getMinerConf () {
    try {
      const resp = await this.client.fetch(`http://${this.opts.address}:${this.opts.port}/cgi-bin/get_miner_conf.cgi`)
      const response = await resp.json()
      return {
        pools: Array.isArray(response.pools) ? response.pools : [],
        'bitmain-fan-ctrl': response['bitmain-fan-ctrl'],
        'bitmain-fan-pwm': response['bitmain-fan-pwm'],
        'miner-mode': response['bitmain-work-mode'],
        'freq-level': response['bitmain-freq-level']
      }
    } catch (err) {
      this.debugError('miner_conf_err', err)
      return {
        success: false,
        error: err.message
      }
    }
  }

  async getFrequency () {
    try {
      const resp = await this.client.fetch(`http://${this.opts.address}:${this.opts.port}/cgi-bin/get_miner_conf.cgi`)
      const response = await resp.json()

      return parseFloat(response['bitmain-freq'])
    } catch (err) {
      return 0.0
    }
  }

  async setPowerMode (mode) {
    try {
      if ([POWER_MODE.SLEEP, POWER_MODE.NORMAL].includes(mode)) {
        const baseData = await this._getMinerConf()
        baseData['miner-mode'] = mode === POWER_MODE.SLEEP ? 1 : 0
        this.client.fetch(`http://${this.opts.address}:${this.opts.port}/cgi-bin/set_miner_conf.cgi`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(baseData)
        }).catch(err => {
          this.debugError('set_power_err', err)
        })
        return { success: true }
      } else {
        throw new Error('ERR_INVALID_MODE')
      }
    } catch (err) {
      this.debugError('set_power_err', err)
      return { success: false, error: err.message }
    }
  }

  async setFan (state) {
    try {
      const baseData = await this._getMinerConf()
      baseData['bitmain-fan-ctrl'] = state
      const request = await this.client.fetch(`http://${this.opts.address}:${this.opts.port}/cgi-bin/set_miner_conf.cgi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(baseData)
      })
      return { success: request.ok }
    } catch (err) {
      this.debugError('set_fan_err', err)
      return { success: false, error: err.message }
    }
  }

  async setFanSpeed (speed) {
    try {
      const baseData = await this._getMinerConf()
      baseData['bitmain-fan-pwn'] = speed.toString()

      const request = await this.client.fetch(`http://${this.opts.address}:${this.opts.port}/cgi-bin/set_miner_conf.cgi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(baseData)
      })
      return { success: request.ok }
    } catch (err) {
      this.debugError('set_fan_speed_err', err)
      return { success: false, error: err.message }
    }
  }

  async getPowerValue () {
    const POWER_SUPPORTED_MINER_TYPES = ['s19xp_h', 's21', 's21pro']
    if (POWER_SUPPORTED_MINER_TYPES.includes(this.opts.type)) {
      try {
        const resp = await this.client.fetch(`http://${this.opts.address}:${this.opts.errPort}/miner_power`)
        const response = await resp.text()
        const power = response.split(':')[1]
        return {
          success: true,
          power: parseInt(power)
        }
      } catch (err) {
        this.debugError('get_power_err', err)
        return { success: false, error: err.message }
      }
    } else {
      return {
        success: true,
        power: undefined
      }
    }
  }

  async getNetworkInformation () {
    try {
      const request = await this.client.fetch(`http://${this.opts.address}:${this.opts.port}/cgi-bin/get_network_info.cgi`)
      const response = await request.json()

      return {
        success: true,
        type: response.nettype === 'DHCP' ? 'dhcp' : 'static',
        network: {
          ip: response.ipaddress,
          mac: response.macaddr,
          hostname: response.conf_hostname,
          mask: response.netmask,
          gateway: response.nettype === 'DHCP' ? undefined : response.conf_gateway,
          dns: response.nettype === 'DHCP' ? undefined : response.conf_dnsservers.split(',')
        }
      }
    } catch (err) {
      this.debugError('network_err', err)
      return { success: false, error: err.message }
    }
  }

  async setNetworkInformation (networkSettings) {
    try {
      const baseData = {
        ipHost: networkSettings.network.hostname,
        ipPro: networkSettings.type === 'static' ? 2 : 1,
        ipAddress: networkSettings.type === 'static' ? networkSettings.network.ip : '',
        ipSub: networkSettings.type === 'static' ? networkSettings.network.mask : '',
        ipGateway: networkSettings.type === 'static' ? networkSettings.network.gateway : '',
        ipDns: networkSettings.type === 'static' ? networkSettings.network.dns.join(',') : ''
      }

      const request = await this.client.fetch(`http://${this.opts.address}:${this.opts.port}/cgi-bin/set_network_conf.cgi`, {
        method: 'POST',
        body: JSON.stringify(baseData)
      })
      return { success: request.ok }
    } catch (err) {
      this.debugError('set_network_err', err)
      return { success: false, error: err.message }
    }
  }

  async setPools (pools, appendId = true) {
    try {
      const oldPools = await this.getPools()

      this.debugError('Old pools', oldPools)

      pools = this._prepPools(pools, appendId, oldPools)

      if (pools === false) {
        this.debugError('Pools are same, skipping')

        return { success: true, message: 'Pools are same, skipping' }
      }

      if (!Array.isArray(pools)) {
        this.debugError('ERR_INVALID_POOLS')
        throw new Error('ERR_INVALID_POOLS')
      }

      const baseData = await this._getMinerConf()

      baseData.pools = pools.map(pool => ({
        url: pool.url,
        user: pool.worker_name,
        pass: pool.worker_password
      }))

      const request = await this.client.fetch(`http://${this.opts.address}:${this.opts.port}/cgi-bin/set_miner_conf.cgi`, {
        method: 'POST',
        body: JSON.stringify(baseData)
      })

      this.reboot()

      return { success: request.ok }
    } catch (err) {
      this.debugError('set_pools_err', err)
      return { success: false, error: err.message }
    }
  }

  reboot () {
    this.client.fetch(`http://${this.opts.address}:${this.opts.port}/cgi-bin/reboot.cgi`)
      .catch(err => { this.debugError('reboot_err', err) })
    return { success: true }
  }

  async setFrequency (frequency) {
    try {
      const baseData = await this._getMinerConf()

      baseData['bitmain-freq'] = frequency.toString()

      const request = await this.client.fetch(`http://${this.opts.address}:${this.opts.port}/cgi-bin/set_miner_conf.cgi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(baseData)
      })
      return { success: request.ok }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  async setLED (state) {
    try {
      const response = await this.client.fetch(`http://${this.opts.address}:${this.opts.port}/cgi-bin/blink.cgi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          blink: state
        })
      })

      if (state) {
        setTimeout(() => {
          this.setLED(false)
        }, 2 * 60 * 1000)
      }

      return { success: response.ok }
    } catch (err) {
      this.debugError('set_led_err', err)
      return { success: false, error: err.message }
    }
  }

  async getLED () {
    try {
      const response = await this.client.fetch(`http://${this.opts.address}:${this.opts.port}/cgi-bin/get_blink_status.cgi`)
      return await response.json()
    } catch (err) {
      this.debugError('get_led_err', err)
      return { success: false, error: err.message }
    }
  }

  async updateFirmware (firmware) {
    throw new Error('ERR_NOT_IMPL')
  }

  async updateAdminPassword (newPassword) {
    try {
      const response = await this.client.fetch(`http://${this.opts.address}:${this.opts.port}/cgi-bin/passwd.cgi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          curPwd: this.opts.password,
          newPwd: newPassword,
          confirmPwd: newPassword
        })
      })
      const respData = await response.json()

      if (respData.code === 'P000') {
        this.opts.password = newPassword
        return { success: true }
      } else {
        return { success: false, error: respData.code }
      }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  _prepErrors (data) {
    const errors = []
    if (data.pools.every(p => p.status === 'Dead')) {
      errors.push({
        name: 'all_pools_dead'
      })
    }

    errors.push(...data.errors.errors)
    this._handleErrorUpdates(errors)

    return {
      isErrored: this._errorLog.length > 0,
      errors: this._errorLog
    }
  }

  async _prepSnap () {
    const data = await parallelLimit({
      summary: this.getSummary.bind(this),
      stats: this.getMinerStats.bind(this),
      pools: this.getPools.bind(this),
      device: this.getDeviceConfiguration.bind(this),
      network: this.getNetworkInformation.bind(this),
      miner_info: this._getMinerConf.bind(this),
      ledstat: this.getLED.bind(this),
      version: this.getVersion.bind(this),
      errors: this.getErrors.bind(this),
      power: this.getPowerValue.bind(this)
    }, 3)

    const { isErrored, errors } = this._prepErrors(data)

    return {
      stats: {
        status: this._getStatus(isErrored, data.stats),
        errors: isErrored ? errors : undefined,
        uptime_ms: data.summary.elapsed * 1000,
        power_w: data?.power?.power,
        efficiency_w_ths: this._calcEfficiency(data.power, data.summary),
        nominal_efficiency_w_ths: this.opts.nominalEfficiencyWThs || 0,
        all_pools_shares: this._calcNewShares(data.pools),
        pool_status: Array.isArray(data.pools)
          ? data.pools.map((pool) => ({
            pool: pool.url,
            accepted: parseInt(pool.accepted),
            rejected: parseInt(pool.rejected),
            stale: parseInt(pool.stale)
          }))
          : [],
        hashrate_mhs: {
          avg: Math.floor(data.summary.mhs_av * 100) / 100,
          t_5s: Math.floor(data.summary.mhs_5s * 100) / 100,
          t_5m: Math.floor(data.summary.mhs_30m * 100) / 100,
          t_30m: Math.floor(data.summary.mhs_30m * 100) / 100
        },
        frequency_mhz: {
          avg: Math.floor(data.stats.boards.reduce((acc, board) => acc + board.freq_avg, 0) / data.stats.boards.length * 100) / 100,
          chips: data.stats.boards.map((device, index) => ({
            index,
            current: Math.floor(device.freq_avg * 100) / 100
          }))
        },
        temperature_c: {
          ambient: Math.floor(data.stats.boards.reduce((acc, board) => acc + board.raw_temps.pcb[0], 0) / data.stats.boards.length * 100) / 100,
          max: Math.floor(Math.max(...data.stats.boards.map(b => b.raw_temps.chip[0])) * 100) / 100,
          avg: this._calcAvgTemp(data.stats),
          chips: data.stats.boards.map((board, index) => ({
            index,
            max: Math.floor(board.raw_temps.chip[0] * 100) / 100,
            avg: Math.floor(board.raw_temps.chip[0] * 100) / 100
          })),
          temp: data.stats.boards.map((board, index) => ({
            index,
            pcbInlet: board.temp.inlet,
            pcbOutlet: board.temp.outlet
          })),
          raw_temps: data.stats.boards.map((board, index) => ({
            index,
            pic: board.raw_temps.pic,
            pcb: board.raw_temps.pcb,
            chip: board.raw_temps.chip
          }))
        }
      },
      config: {
        network_config: {
          mode: data.network.type,
          ip_address: data.network.network?.ip,
          dns: data.network.network?.dns,
          ip_gw: data.network.network?.gateway,
          ip_netmask: data.network.network?.mask
        },
        pool_config: data.miner_info.pools.map((pool) => ({
          url: pool.url,
          username: pool.user
        })),
        power_mode: this._getPowerMode(data.stats),
        suspended: this._isSuspended(data.stats),
        led_status: data.ledstat.blink,
        firmware_ver: data.version.antminer.firmware
      }
    }
  }

  _getStatus (isErrored, stats) {
    if (isErrored) return STATUS.ERROR
    return stats.minerMode === 0 ? STATUS.MINING : STATUS.SLEEPING
  }

  _isSuspended (stats) {
    return stats.minerMode === 1
  }

  _calcPowerW (stats) {
    return Math.floor(parseFloat(stats.power) * 100) / 100
  }

  _calcAvgTemp (stats) {
    return Math.floor(stats.boards.reduce((acc, board) => acc + board.raw_temps.chip[0], 0) / stats.boards.length * 100) / 100
  }

  _getPowerMode (stats) {
    return stats.minerMode === 1 ? POWER_MODE.SLEEP : POWER_MODE.NORMAL
  }

  _calcEfficiency (power, summary) {
    if (this.opts.type !== 's19xp_h') return undefined

    const hashrate = summary.mhs_av

    if (hashrate === 0) return 0

    const efficiency = power.power / hashrate * 1000000

    return isNaN(efficiency) ? undefined : efficiency.toFixed(2)
  }

  _calcHashrates (summary) {
    return {
      avg: Math.floor(summary.mhs_av * 100) / 100,
      t_5s: Math.floor(summary.mhs_5s * 100) / 100,
      t_5m: Math.floor(summary.mhs_30m * 100) / 100,
      t_30m: Math.floor(summary.mhs_30m * 100) / 100
    }
  }
}

module.exports = Antminer
