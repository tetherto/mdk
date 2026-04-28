'use strict'

const Miner = require('../../../tpls/tpl-lib-miner/lib/miner.js')
const utils = require('./utils')
const async = require('async')
const assert = require('assert')
const { STATUS, POWER_MODE } = require('../../../tpls/tpl-lib-miner/lib/utils/constants.js')

function isResOk (res) {
  return res.Code === '119' || res.Code === '118'
}

class AvalonMiner extends Miner {
  constructor ({ socketer = null, ...opts }) {
    super(opts)

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

    this._cachedPrevHashrate = null
  }

  async close () {
    await this.rpc.stop()
  }

  async _sendCommand (command) {
    try {
      const res = await this.rpc.request(command)
      this.debugError(`Received response: ${res}`)
      this.updateLastSeen()
      return res
    } catch (err) {
      this.debugError(err)
      throw err
    }
  }

  validateWriteAction (...params) {
    const [action, ...args] = params

    if (action === 'setPowerMode') {
      const [mode] = args
      if (![POWER_MODE.SLEEP, POWER_MODE.NORMAL, POWER_MODE.HIGH].includes(mode)) {
        throw new Error('ERR_SET_POWER_MODE_INVALID')
      }
      return 1
    }

    return super.validateWriteAction(...params)
  }

  async getWorkingMode () {
    const response = await this._sendCommand('ascset|0,workmode,255')
    // 1 - High Power Mode
    // 0 - Normal Mode
    // 2 - Power Mode ?? (0-4 scale?)
    const parsedData = utils.parseAvalonResponseString(response)
    const powerMode = parseInt(utils.extractValueBetweenBrackets(parsedData.Msg, 'WORKMODE'))
    return powerMode
  }

  async setFanSpeed (speed) {
    // send fan-spd command
    // could not test, miner fan removed
    const response = await this._sendCommand(`ascset|0,fan-spd,${speed}`)
    const parsedData = utils.parseAvalonResponseString(response)

    return {
      success: isResOk(parsedData)
    }
  }

  async factoryReset () {
    // send `ascset|0,restore` command
    const response = await this._sendCommand('ascset|0,restore')
    const parsedData = utils.parseAvalonResponseString(response)

    return {
      success: isResOk(parsedData)
    }
  }

  async reasonForReboot () {
    // ascset|0,bootby
    const response = await this._sendCommand('ascset|0,bootby')
    const parsedData = utils.parseAvalonResponseString(response)
    return utils.extractValueBetweenBrackets(parsedData.Msg, 'BOOTBY')
  }

  async setLED (enabled) {
    if (typeof enabled !== 'boolean') throw new Error('ERR_INVALID_ARG_TYPE')
    const response = await this._sendCommand(`ascset|0,led,0-${enabled ? '1' : '0'}`)
    const parsedData = utils.parseAvalonResponseString(response)

    if (enabled) {
      setTimeout(() => {
        this.setLED(false)
      }, 2 * 60 * 1000).unref()
    }

    return {
      success: isResOk(parsedData)
    }
  }

  async suspendMining () {
    // ascset|0,softoff
    // not sure how to test, need miner running
    const response = await this._sendCommand('ascset|0,softoff')
    const parsedData = utils.parseAvalonResponseString(response)

    return {
      success: isResOk(parsedData)
    }
  }

  async restoreLogin () {
    // ascset|0,password,default
    const response = await this._sendCommand('ascset|0,password,default')
    const parsedData = utils.parseAvalonResponseString(response)

    return {
      success: isResOk(parsedData)
    }
  }

  async updateAdminPassword (newPassword) {
    // ascset|0,password,<old>,<new>
    const response = await this._sendCommand(`ascset|0,password,${this.opts.password},${newPassword}`)
    const parsedData = utils.parseAvalonResponseString(response)
    if (isResOk(parsedData)) {
      this.opts.password = newPassword
      return {
        success: true
      }
    } else {
      return {
        success: false
      }
    }
  }

  async getVersion () {
    // send `version` command
    const response = await this._sendCommand('version')
    const parsedData = utils.parseAvalonResponseString(response)

    return {
      success: true,
      model: parsedData.MODEL,
      version: parsedData.VERSION,
      hardware_version: parsedData.HWTYPE,
      software_version: parsedData.SWTYPE,
      cgminer: {
        version: parsedData.CGMiner,
        api: parsedData.API
      },
      mac: parsedData.MAC
    }
  }

  async setPools (pools, appendId = true) {
    let oldPools = await this.getPools()

    oldPools = oldPools.map((pool) => ({
      ...pool,
      username: pool.user
    }))

    // placeholder pools if less than 3
    const dummyPool = 'dummy'
    while (pools.length < 3) {
      pools.push({
        url: `stratum+tcp://${dummyPool}`,
        worker_name: dummyPool,
        worker_password: dummyPool
      })
    }

    pools = this._prepPools(pools, appendId, oldPools)

    if (pools === false) {
      this.debugError('Pools are same, skipping')

      return { success: true, message: 'Pools are same, skipping' }
    }

    const instance = this
    const responses = await async.parallelLimit(
      pools.map((pool, index) => {
        return async () => {
          const response = await instance._sendCommand(`ascset|0,setpool,${instance.username},${instance.password},${index},${pool.url},${pool.worker_name},${pool.worker_password}`)
          return utils.parseAvalonResponseString(response)
        }
      }),
      3
    )

    this.debugError(`setPools allOk: ${responses.every(isResOk)}`)
    await this.reboot()

    return { success: responses.every(isResOk) }
  }

  async getStats () {
    // send `summary` command
    const response = await this._sendCommand('summary')
    const parsedData = utils.parseAvalonResponseString(response)

    const processedStats = {
      success: true,
      elapsed: parsedData.Elapsed,
      mhs_av: parsedData['MHS av'],
      mhs_30s: parsedData['MHS 30s'],
      mhs_1m: parsedData['MHS 1m'],
      mhs_5m: parsedData['MHS 5m'],
      mhs_15m: parsedData['MHS 15m'],
      hs_rt: parsedData['HS RT'],
      accepted: parsedData.Accepted,
      rejected: parsedData.Rejected,
      total_mh: parsedData['Total MH'],
      pool_rejected: parsedData['Pool Rejected%'],
      pool_stale: parsedData['Pool Stale%'],
      device_rejected: parsedData['Device Rejected%'],
      device_hardware: parsedData['Device Hardware%'],
      best_share: parsedData['Best Share'],
      last_getwork: parsedData['Last getwork'],
      prev_mhs: this._cachedPrevHashrate
    }

    this._cachedPrevHashrate = parsedData['MHS 5m']

    return processedStats
  }

  async getEStats () {
    // send `estats` command
    const response = await this._sendCommand('estats')
    const parsedData = {
      success: true,
      serial: utils.extractValueBetweenBrackets(response, 'DNA'),
      free_memory: utils.extractValueBetweenBrackets(response, 'MEMFREE'),
      net_fail: utils.extractValueBetweenBrackets(response, 'NETFAIL'),
      system_status: utils.extractValueBetweenBrackets(response, 'SYSTEMSTATU'),
      boot_by: utils.extractValueBetweenBrackets(response, 'BOOTBY'),
      local_work: utils.extractValueBetweenBrackets(response, 'LW'),
      miner_hash_faults: utils.extractValueBetweenBrackets(response, 'MH'),
      hardware_errors: utils.extractValueBetweenBrackets(response, 'HW'),
      average_calculation_error_ratio: utils.extractValueBetweenBrackets(response, 'DH'),
      temperature: utils.extractValueBetweenBrackets(response, 'Temp'),
      temperature_max: utils.extractValueBetweenBrackets(response, 'TMax'),
      temperature_avg: utils.extractValueBetweenBrackets(response, 'TAvg'),
      fan1: utils.extractValueBetweenBrackets(response, 'Fan1'),
      fan2: utils.extractValueBetweenBrackets(response, 'Fan2'),
      fan_speed_ratio: utils.extractValueBetweenBrackets(response, 'FanR'),
      average_voltage: utils.extractValueBetweenBrackets(response, 'Vo'),
      power_status: utils.extractValueBetweenBrackets(response, 'PS').split(' '),
      PLL: [0, 1, 2].map((index) => utils.extractValueBetweenBrackets(response, `PLL${index}`).split(' ')),
      theoretical_hash_rate: utils.extractValueBetweenBrackets(response, 'GHSspd'),
      logical_hash_rate: utils.extractValueBetweenBrackets(response, 'GHSmm'),
      ghs_avg: utils.extractValueBetweenBrackets(response, 'GHSavg'),
      frequency: utils.extractValueBetweenBrackets(response, 'Freq'),
      led: utils.extractValueBetweenBrackets(response, 'Led'),
      miner_ghs: utils.extractValueBetweenBrackets(response, 'MGHS').split(' '),
      max_chip_temperature: utils.extractValueBetweenBrackets(response, 'MTmax').split(' '),
      avg_chip_temperature: utils.extractValueBetweenBrackets(response, 'MTavg').split(' '),
      chip_count: utils.extractValueBetweenBrackets(response, 'TA'),
      ping: utils.extractValueBetweenBrackets(response, 'PING'),
      core: utils.extractValueBetweenBrackets(response, 'Core'),
      psu_status: utils.extractValueBetweenBrackets(response, 'POWS'),
      EEPROM: utils.extractValueBetweenBrackets(response, 'EEPROM').split(' '),
      hash_board_status: utils.extractValueBetweenBrackets(response, 'HASHS').split(' '),
      pool_status: utils.extractValueBetweenBrackets(response, 'POOLS'),
      soft_off: utils.extractValueBetweenBrackets(response, 'SoftOFF'),
      error_code: utils.extractValueBetweenBrackets(response, 'ECHU').split(' '),
      mm_board_status_mark: utils.extractValueBetweenBrackets(response, 'ECMM'),
      frequency_config: [0, 1, 2].map((index) => ({
        index,
        frequencies: utils.extractValueBetweenBrackets(response, `SF${index}`).split(' ')
      })),
      chip_temperatures: [0, 1, 2].map((index) => ({
        index,
        temperatures: utils.extractValueBetweenBrackets(response, `PVT_T${index}`)
      })),
      chip_voltages: [0, 1, 2].map((index) => ({
        index,
        voltages: utils.extractValueBetweenBrackets(response, `PVT_V${index}`)
      })),
      nonce_values: [0, 1, 2].map((index) => ({
        index,
        nonce: utils.extractValueBetweenBrackets(response, `MW${index}`).split(' ')
      })),
      communication_errors: utils.extractValueBetweenBrackets(response, 'CRC').split(' '),
      FACOPTS: [0, 1, 2].map((index) => ({
        index,
        options: utils.extractValueBetweenBrackets(response, `FACOPTS${index}`)
      })),
      ATABD: [0, 1, 2].map((index) => utils.extractValueBetweenBrackets(response, `ATABD${index}`).split(' ')
      ),
      aging: utils.extractValueBetweenBrackets(response, 'ADJ'),
      COP: utils.extractValueBetweenBrackets(response, 'COP').split(' '),
      object_power_consumption: utils.extractValueBetweenBrackets(response, 'MPO'),
      voltage_upper_limit: utils.extractValueBetweenBrackets(response, 'MVL'),
      work_mode: utils.extractValueBetweenBrackets(response, 'WORKMODE')

    }
    return parsedData
  }

  async getPools () {
    try {
      // send `pools` command
      const response = await this._sendCommand('pools')
      const parsedData = utils.parseAvalonPoolData(response)

      return parsedData
        ? parsedData.map((pool) => ({
          index: pool.POOL,
          url: pool.URL,
          status: pool.Status,
          priority: pool.Priority,
          quota: pool.Quota,
          getworks: pool.Getworks,
          accepted: pool.Accepted,
          rejected: pool.Rejected,
          works: pool.Works,
          discarded: pool.Discarded,
          stale: pool.Stale,
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
    } catch (err) {
      this.debugError('getPools error', err)
      return []
    }
  }

  async setNetworkConfiguration (network) {
    if (network.type === 'static') {
      // ascset|0,ip,static,<ip>,<mask>,<gw>
      const response = await this._sendCommand(`ascset|0,ip,static,${network.network.ip},${network.network.mask},${network.network.gateway}`)
      const parsedData = utils.parseAvalonResponseString(response)
      assert(isResOk(parsedData), 'Failed to set static IP')
    } else {
      // ascset|0,ip,dhcp
      const response = await this._sendCommand('ascset|0,ip,dhcp')
      const parsedData = utils.parseAvalonResponseString(response)
      assert(isResOk(parsedData), 'Failed to set DHCP')
    }

    // set dns
    // ascset|0,dns,<dns1>,<dns2>
    const dnsString = network.network.dns.slice(0, 2).join(',')
    const response = await this._sendCommand(`ascset|0,dns,${dnsString}`)
    const parsedData = utils.parseAvalonResponseString(response)
    assert(isResOk(parsedData), 'Failed to set DNS')
    return {
      success: true
    }
  }

  async reboot () {
    // send `ascset|0,reboot,0` command
    try {
      await this._sendCommand('ascset|0,reboot,0')
    } catch (e) {}
    return {
      success: true
    }
  }

  async setPowerMode (mode) {
    // send `ascset|0,workmode,` command
    let command
    switch (mode) {
      case 'sleep':
        command = 'ascset|0,softoff'
        break
      case 'normal':
        command = 'ascset|0,workmode,0'
        break
      case 'high':
        command = 'ascset|0,workmode,1'
        break
      default:
        throw new Error('ERR_INVALID_MODE')
    }

    this._sendCommand(command)
      .then(async response => {
        const parsedData = utils.parseAvalonResponseString(response)
        if (!isResOk(parsedData)) {
          return this.debugError('setPowerMode failed', parsedData)
        }
        if (mode !== 'sleep') await this.reboot()
      })
      .catch(e => this.debugError('setPowerMode failed', e))

    return { success: true }
  }

  async getHashPowerStatus () {
    // ascset|0,hashpower
    const response = await this._sendCommand('ascset|0,hashpower')
    const parsedData = utils.extractValueBetweenBrackets(response, 'PS').split(' ')
    return parsedData.map((value) => parseInt(value, 10))
  }

  _prepErrors (data) {
    const errors = []
    if (data.pools.every(p => p.status === 'Dead')) {
      errors.push({
        name: 'all_pools_dead',
        message: 'All pools are dead',
        code: data.estats?.error_code
      })
    }
    if (data.estats.power_status.every(p => p === '0')) {
      errors.push({
        name: 'power_error_status',
        message: 'Power supply connection issue',
        code: data.estats?.error_code
      })
    } else if (data.estats.power_status[0] !== '0') {
      errors.push({
        name: 'power_error_status',
        message: 'Power failure or output short circuit',
        code: data.estats?.error_code
      })
    }
    if (data.estats.error_code === '513') {
      errors.push({
        name: 'hashboard_error',
        message: 'Hash board is in abnormal state',
        code: data.estats?.error_code
      })
    } else if (data.estats.error_code === '128') {
      errors.push({
        name: 'hashboard_temp_overheating',
        message: 'Hash board temperature is too high',
        code: data.estats?.error_code
      })
    }
    if (data.estats.mm_board_status_mark === '1') {
      errors.push({
        name: 'control_board_exception',
        message: 'Control board exception',
        code: data.estats?.error_code
      })
    }
    if (data.estats.psu_status !== '0') {
      errors.push({
        name: 'power_error_status',
        message: 'Power supply error',
        code: data.estats?.error_code
      })
    }
    data.estats.hash_board_status.map((value, index) => (
      value === '1'
        ? errors.push({
          name: 'hashboard_error',
          message: `Hash board ${index} is errored`,
          code: data.estats?.error_code
        })
        : null
    ))
    if (data.estats.pool_status === '1') {
      errors.push({
        name: 'pool_connect_failed',
        message: 'Pool connection failed',
        code: data.estats?.error_code
      })
    }

    this._handleErrorUpdates(errors)

    return {
      isErrored: this._errorLog.length > 0,
      errors: this._errorLog
    }
  }

  async _prepSnap () {
    const data = await async.parallelLimit({
      version: this.getVersion.bind(this),
      stats: this.getStats.bind(this),
      estats: this.getEStats.bind(this),
      pools: this.getPools.bind(this)
    }, 3)

    const { isErrored, errors } = this._prepErrors(data)

    return {
      stats: {
        status: this._getStatus(isErrored, data.estats),
        errors: isErrored ? errors : undefined,
        power_w: this._calcPowerW(data.estats),
        efficiency_w_ths: this._calcEfficiency(data.estats, data.stats),
        nominal_efficiency_w_ths: this.opts.nominalEfficiencyWThs || 0,
        pool_status: data.pools.filter(p => (p.url && p.user)).map((pool) => ({
          pool: pool.url,
          accepted: parseInt(pool.accepted),
          rejected: parseInt(pool.rejected),
          stale: parseInt(pool.stale)
        })),
        all_pools_shares: this._calcNewShares(data.pools),
        uptime_ms: parseInt(data.stats.elapsed) * 1000,
        hashrate_mhs: this._calcHashrates(data.stats),
        frequency_mhz: {
          avg: Math.floor(parseFloat(data.estats.frequency) * 100) / 100,
          target: data.estats.ATABD.reduce((acc, value) => acc + parseFloat(value), 0) / data.estats.ATABD.length,
          chips: [0, 1, 2].map((index) => ({
            index,
            current: Math.floor(parseFloat(data.estats.frequency) * 100) / 100,
            target: Math.max(...data.estats.ATABD[index].map((value) => parseFloat(value)))
          }))
        },
        temperature_c: {
          ambient: Math.floor(parseFloat(data.estats.temperature) * 100) / 100,
          max: Math.floor(parseFloat(data.estats.temperature_max) * 100) / 100,
          avg: this._calcAvgTemp(data.estats),
          chips: data.estats.max_chip_temperature.map((value, index) => ({
            index,
            max: Math.floor(parseFloat(data.estats.max_chip_temperature[index]) * 100) / 100 || 0,
            avg: Math.floor(parseFloat(data.estats.avg_chip_temperature[index]) * 100) / 100 || 0
          }))
        },
        miner_specific: {}
      },
      config: {
        network_config: {
          ip_address: this.opts.address,
          dns: []
        },
        pool_config: data.pools.filter(p => (p.url && p.user)).map((pool) => ({
          url: pool.url,
          username: pool.user
        })),
        power_mode: this._getPowerMode(data.estats),
        suspended: this._isSuspended(data.estats),
        led_status: data.estats.led === '1', // config
        firmware_ver: data.version.version
      }
    }
  }

  _getStatus (isErrored, estats) {
    if (isErrored) return STATUS.ERROR
    return estats?.soft_off === '0' ? STATUS.MINING : STATUS.SLEEPING
  }

  _isSuspended (estats) {
    return estats.soft_off !== '0'
  }

  _calcPowerW (estats) {
    return parseFloat(estats.object_power_consumption)
  }

  _calcAvgTemp (estats) {
    return Math.floor(parseFloat(estats.temperature_avg) * 100) / 100
  }

  _getPowerMode (estats) {
    if (estats.soft_off !== '0') return POWER_MODE.SLEEP
    if (estats.work_mode === '1') return POWER_MODE.HIGH
    return POWER_MODE.NORMAL
  }

  _calcEfficiency (estats, stats) {
    const power = parseFloat(estats.object_power_consumption)
    const hashrate = parseFloat(stats.mhs_av)

    if (hashrate === 0) return 0

    const efficiency = power / hashrate * 1000000

    return isNaN(efficiency) ? 0 : +efficiency.toFixed(2)
  }

  _calcHashrates (stats) {
    const parseHashrate = (value) => {
      const parsed = parseFloat(value)
      if (isNaN(parsed) || parsed < 0) return 0
      return Math.floor(parsed * 100) / 100
    }

    return {
      avg: parseHashrate(stats.mhs_av),
      t_30s: parseHashrate(stats.mhs_30s),
      t_1m: parseHashrate(stats.mhs_1m),
      t_5m: parseHashrate(stats.mhs_5m),
      t_15m: parseHashrate(stats.mhs_15m)
    }
  }
}

module.exports = AvalonMiner
