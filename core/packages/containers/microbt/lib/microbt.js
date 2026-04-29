'use strict'

const { RUNNING_STATUS } = require('../../../tpls/tpl-lib-container/lib/utils/constants')
const { FUNCTION_CODES, PROTOCOL } = require('svc-facs-modbus/lib/constants')
const { mapSeries, series, reflectAll, retry } = require('async')
const { bufferToInt16Array, bufferToBitString } = require('./utils')
const { getAuthData } = require('./utils/auth')
const { promiseTimeout } = require('@bitfinex/lib-js-util-promise')
const { SystemErrorMap, GeneralErrorMap } = require('./utils/errormap')
const { CONTAINER_TYPES } = require('./utils/constants')
const Container = require('../../../tpls/tpl-lib-container/lib/container')
const debug = require('debug')('container')

class MicroBT extends Container {
  constructor ({ getClient = null, type = CONTAINER_TYPES.WONDERINT, ...opts }) {
    super(opts)
    this.type = type
    if (!getClient) throw new Error('ERR_NO_CLIENT')
    this.units = {
      fcdu: 1,
      gtemp: 2,
      henv: 3,
      powermeter01: 4,
      powermeter02: 5,
      powermeter03: 6,
      powermeter04: 7,
      diag: 8,
      pdu01: 9,
      pdu02: 10,
      pdu03: 11,
      pdu04: 12,
      pdu05: 13,
      pdu06: 14,
      pdu07: 15,
      pdu08: 16,
      pdu09: 17,
      pdu10: 18,
      pdu11: 19,
      pdu12: 20
    }
    this.client = getClient({
      address: this.opts.address,
      port: this.opts.port,
      unitId: 1,
      protocol: PROTOCOL.TCP,
      timeout: this.opts.timeout
    })
  }

  async init () {
    await this._authenticateCDU()
  }

  close () {
    this.client.end()
  }

  // Modbus method wrappers
  async _readHoldingRegisters (deviceId, address, length, unsigned = false, raw = false) {
    this.client.unitId = this.units[deviceId]
    return await retry({
      times: this.opts.retry || 3,
      interval: this.opts.retryInterval || 1000
    }, async () => {
      const resp = await promiseTimeout(this.client.read(FUNCTION_CODES.READ_HOLDING_REGISTERS, address, length), this.opts.timeout)
      this.updateLastSeen()
      if (!resp) {
        throw new Error('ERR_MODBUS_TIMEOUT')
      }
      if (raw) return resp
      else return bufferToInt16Array(resp, unsigned)
    })
  }

  async _writeSingleRegister (deviceId, address, value) {
    this.client.unitId = this.units[deviceId]
    return await retry({
      times: this.opts.retry || 3,
      interval: this.opts.retryInterval || 1000
    }, async () => {
      const resp = await promiseTimeout(this.client.write(FUNCTION_CODES.WRITE_SINGLE_REGISTER, address, value), this.opts.timeout)
      this.updateLastSeen()
      if (!resp) {
        await this._authenticateCDU()
        throw new Error('ERR_MODBUS_TIMEOUT')
      }
      return resp
    })
  }

  async _writeMultipleRegisters (deviceId, address, values, length = 1, auth = false) {
    this.client.unitId = this.units[deviceId]
    return await retry({
      times: this.opts.retry || 3,
      interval: this.opts.retryInterval || 1000
    }, async () => {
      const resp = await promiseTimeout(this.client.write(FUNCTION_CODES.WRITE_MULTIPLE_REGISTERS, address, values, length), this.opts.timeout)
      this.updateLastSeen()
      if (!resp && !auth) {
        await this._authenticateCDU()
        throw new Error('ERR_MODBUS_TIMEOUT')
      }
      return resp
    })
  }

  async getEnvironmentInformation () {
    const mappings = _DeviceMappings.Environment
    const [result] = await this._readIdentifier(['henv'], [[2, 15]], mappings)
    return result
  }

  async getPduInformation () {
    const pduMappings = _DeviceMappings.PDUData
    const PDUs = Object.keys(this.units).filter((key) => key.includes('pdu'))
    const result = await this._readIdentifier(PDUs, [[2, 4], [6, 6, true], [12, 55], [67, 2, true], [69, 36], [104, 2], [106, 87], [169, 24]], pduMappings)
    return result
  }

  async getDiagnosisInformation () {
    const mappings = _DeviceMappings.Diagnosis
    const [result] = await this._readIdentifier(['diag'], [[2, 13]], mappings)
    return result
  }

  async getPowerMeterInformation () {
    const mappings = _DeviceMappings.PowerMeter
    const PowerMeters = Object.keys(this.units).filter((key) => key.includes('powermeter'))
    const result = await this._readIdentifier(PowerMeters, [[2, 1], [3, 69, true], [73, 9], [82, 3, true]], mappings)
    return result
  }

  async getTemperatureInformation () {
    const mappings = _DeviceMappings.TempAndHumidityData
    const [result] = await this._readIdentifier(['gtemp'], [[2, 3]], mappings)
    return result
  }

  async _authenticateCDU () {
    // get random numbers
    const randomNumbers = await this._readHoldingRegisters('fcdu', 301, 4, false, true)
    // get auth data
    const authData = getAuthData(this.opts.username, this.opts.password, randomNumbers)
    // write auth data
    const resp = await this._writeMultipleRegisters('fcdu', 305, authData, 16, true)
    return {
      success: resp !== undefined
    }
  }

  async getCDUInformation () {
    const mappings = _DeviceMappings.CDU
    const [result] = await this._readIdentifier(['fcdu'], [[1, 4], [26, 10], [46, 20], [90, 11], [201, 12], [301, 4], [601, 23]], mappings)
    return result
  }

  async getSystemErrorInformation () {
    const mappings = _DeviceMappings.SystemError
    const result = await this._readHoldingRegisters('fcdu', 291, 10, false, true)
    return mappings(result)
  }

  async getGeneralErrorInformation () {
    const mappings = _DeviceMappings.GeneralError
    const result = await this._readHoldingRegisters('fcdu', 96, 5, false, true)
    return mappings(result)
  }

  async _readData (deviceId, pairs, mappings) {
    const data = []
    for (const pair of pairs) {
      const [start, length, unsigned] = pair
      const result = await this._readHoldingRegisters(deviceId, start, length, unsigned)
      data.push(result)
    }
    return mappings(data.flat(), deviceId, this.type)
  }

  async _readIdentifier (identifiers, pairs, mappings) {
    const results = await mapSeries(identifiers, async (d) => this._readData(d, pairs, mappings))
    return results
  }

  async _socketControl (PDUIndex, socketIndex, enabled) {
    if (typeof enabled !== 'boolean') throw new Error('ERR_INVALID_ARG_TYPE')
    if (PDUIndex === '-1' && socketIndex === '-1') {
      const PDUs = Object.keys(this.units).filter((key) => key.includes('pdu'))
      const instance = this
      await mapSeries(PDUs, async (pdu) => {
        for (let i = 1; i < 21; i++) {
          await instance._writeSingleRegister(pdu, 309 - i, enabled ? 1 : 2)
        }
      })
      return {
        success: true
      }
    } else if (socketIndex === '-1') {
      const pdu = `pdu${PDUIndex.padStart(2, '0')}`
      for (let i = 1; i < 21; i++) {
        await this._writeSingleRegister(pdu, 309 - i, enabled ? 1 : 2)
      }
      return {
        success: true
      }
    } else {
      const pdu = `pdu${PDUIndex.padStart(2, '0')}`
      socketIndex = parseInt(socketIndex)
      await this._writeSingleRegister(pdu, 309 - socketIndex, enabled ? 1 : 2)
      return {
        success: true
      }
    }
  }

  async switchSocket (args) {
    await mapSeries(args, async (operation) => {
      return await this._socketControl(...operation)
    })
    return {
      success: true
    }
  }

  async switchContainer (enabled) {
    await this._writeSingleRegister('fcdu', 601, enabled ? 1 : 0)
    return {
      success: true
    }
  }

  async switchCoolingSystem (enabled) {
    return await this.switchContainer(enabled)
  }

  async setCoolingFanThreshold (thresholds) {
    const { runningSpeed, startTemp, stopTemp } = thresholds
    if (runningSpeed) await this._writeSingleRegister('fcdu', 613, runningSpeed * 100)
    if (startTemp) await this._writeSingleRegister('fcdu', 614, startTemp * 100)
    if (stopTemp) await this._writeSingleRegister('fcdu', 615, stopTemp * 100)
    return {
      success: true
    }
  }

  _prepErrors (syserr, generr) {
    const errors = syserr.concat(generr)

    this._handleErrorUpdates(errors)

    return {
      isErrored: this._errorLog.length > 0,
      errors: this._errorLog
    }
  }

  async _prepSnap () {
    const snap = await promiseTimeout(series(reflectAll({
      pdus: this.getPduInformation.bind(this),
      env: this.getEnvironmentInformation.bind(this),
      diag: this.getDiagnosisInformation.bind(this),
      pm: this.getPowerMeterInformation.bind(this),
      temp: this.getTemperatureInformation.bind(this),
      cdu: this.getCDUInformation.bind(this),
      syserr: this.getSystemErrorInformation.bind(this),
      generr: this.getGeneralErrorInformation.bind(this)
    })), this.opts.timeout)

    const { isErrored, errors } = this._prepErrors(snap.syserr.value || [], snap.generr.value || [])
    const isRunning = snap.cdu?.value?.circulation_pump_running_status === RUNNING_STATUS.RUNNING

    return {
      stats: {
        status: this._getStatus(isErrored, isRunning),
        errors: isErrored ? errors : undefined,
        power_w: snap.pm.value?.reduce((acc, item) => acc + item.total_active_power, 0) * 1000,
        ambient_temp_c: snap.temp.value?.temperature,
        humidity_percent: snap.temp.value?.humidity,
        container_specific: {
          power_meters: snap.pm.value,
          pdu_data: snap.pdus.value,
          env: snap.env.value,
          cdu: snap.cdu.value
        }
      },
      config: {
        container_specific: {
          diag: snap.diag.value
        }
      }
    }
  }

  _getStatus (isErrored, isRunning) {
    if (isErrored) return RUNNING_STATUS.ERROR
    if (isRunning) return RUNNING_STATUS.RUNNING
    return RUNNING_STATUS.STOPPED
  }
}

const _getPumpRunningStatusMappings = (message, type) => {
  if (type === CONTAINER_TYPES.KEHUA) {
    let circulationPumpRunningStatus = RUNNING_STATUS.STOPPED
    if (message[52] === 200) {
      circulationPumpRunningStatus = RUNNING_STATUS.ERROR
    }
    if (message[52] === 100) {
      circulationPumpRunningStatus = RUNNING_STATUS.RUNNING
    }
    return {
      circulation_pump_running_status: circulationPumpRunningStatus,
      cycle_pump_control: message[66]
    }
  }
  return {
    circulation_pump_running_status: message[66] === 1 ? RUNNING_STATUS.RUNNING : RUNNING_STATUS.STOPPED,
    cycle_pump_control: message[52]
  }
}

const _DeviceMappings = {
  PDUData: (message, deviceId) => ({
    pdu: deviceId.replace(/^pdu0*/, ''),
    status: message[0],
    buzzer: message[3],
    sockets: message.slice(44, 64).map((item, i) => ({
      socket: (i + 1).toString(),
      enabled: item === 1
    })),
    frequency: message[72] / 100,
    voltage_ab: message[73] / 100,
    voltage_ca: message[74] / 100,
    voltage_bc: message[75] / 100,
    current_a: message[76] / 100,
    current_b: message[77] / 100,
    current_c: message[78] / 100,
    total_power: message[79] / 100,
    access_control_alarm: message.slice(157, 165).map((item, i) => ({
      index: i.toString(),
      status: item === 1
    })),
    infrared_alarm: message.slice(167, 173).map((item, i) => ({
      index: i.toString(),
      status: item === 1
    })),
    water_ingress_alarm: message.slice(173, 181).map((item, i) => ({
      index: i.toString(),
      status: item === 1
    })),
    smoke_detection_alarm: message.slice(181, 189).map((item, i) => ({
      index: i.toString(),
      status: item === 1
    })),
    high_wind_speed_alarm: message[189],
    low_wind_speed_alarm: message[190]
  }),
  TempAndHumidityData: (message, _dev, type) => {
    if (type === CONTAINER_TYPES.WONDERINT) {
      return {
        status: message[0],
        temperature: message[1] / 10,
        humidity: message[2] / 10
      }
    } else {
      return {
        status: message[0],
        temperature: message[1] / 100,
        humidity: message[2] / 100
      }
    }
  },
  Environment: (message) => ({
    status: message[0],
    smoke_detector: message[1],
    water_ingress_detector: message[6]
  }),
  Diagnosis: (message) => ({
    communicate_status: message[0],
    software_version: message[1],
    pcb_version: message[2],
    hardware_version: message[3],
    year: message[4],
    month: message[5],
    day: message[6],
    cpu_utilization_rate: message[7],
    hard_drive_space_usage_rate: message[8],
    memory_utilization_rate: message[9],
    eth: {
      speed: message[10],
      upstream_traffic: message[11],
      downstream_traffic: message[12]
    }
  }),
  CDU: (message, _dev, type) => {
    const pumpRunningStatus = _getPumpRunningStatusMappings(message, type)
    const data = {
      protocol_version: message[0] / 10,
      indoor_dew_point_temperature: message[39] / 100,
      outdoor_ambient_temperature_sensor_fault: message[40] === 1,
      indoor_temperature_humidity_sensor_fault: message[41] === 1,
      makeup_water_pump_fault: message[42] === 1,
      power_supply_fault: message[43] === 1,
      water_immersion_fault: message[44] === 1,
      unit_inlet_temp_t2: message[45] / 100,
      unit_outlet_temp_t3: type === CONTAINER_TYPES.KEHUA ? undefined : message[55] / 100,
      unit_inlet_pressure_p2: message[47] / 100,
      unit_outlet_pressure_p3: message[48] / 100,
      circulation_pump_inlet_pressure_p1: message[49] / 100,
      circulation_pump_outlet_pressure_p5: message[50] / 100,
      circulation_pump_speed: message[53] / 100,
      filter_pressure_difference: message[54] / 100,
      cooling_temp_t1: message[46] / 100,
      cooling_system_status: type === CONTAINER_TYPES.KEHUA ? message[56] / 100 : undefined,
      system_main_control: message[61] === 1,
      circulation_pump_switch: message[62] === 1 ? 'auto' : 'manual',
      drain_valve_switch: message[63] === 1 ? 'auto' : 'manual',
      cooling_fan_switch: message[64] === 1 ? 'auto' : 'manual',
      makeup_water_pump_switch: message[65] === 1 ? 'auto' : 'manual',
      cooling_fan_control: message[67],
      makeup_water_pump_control: message[68] === 1,
      buzzer_alarm: message[69] === 1,
      cooling_fan_running_speed_threshold: message[74] / 100,
      cooling_fan_start_temperature_threshold: message[75] / 100,
      cooling_fan_stop_temperature_threshold: message[76] / 100,
      ...pumpRunningStatus
    }
    return data
  },
  PowerMeter: (message, deviceId) => ({
    index: deviceId.replace('powermeter', ''),
    status: message[0],
    voltage_ab: message[48] / 100,
    voltage_bc: message[49] / 100,
    voltage_ca: message[50] / 100,
    total_power_factor: message[67] / 100,
    freq: message[79] / 100,
    current_a: message[51] / 100,
    current_b: message[52] / 100,
    current_c: message[53] / 100,
    total_active_power: message[55] / 100,
    total_apparent_power: message[63] / 100,
    total_active_energy: message[1] / 100
  }),
  SystemError: (message) => {
    const bits = bufferToBitString(message)
    const errors = []
    for (let i = 0; i < 25; i++) {
      if (bits[i] === '1') {
        errors.push({
          name: SystemErrorMap[i]
        })
      }
    }
    return errors
  },
  GeneralError: (message) => {
    const bits = bufferToBitString(message)
    const errors = []
    for (let i = 0; i < 5; i++) {
      if (bits[i] === '1') {
        errors.push({
          name: GeneralErrorMap[i]
        })
      }
    }
    return errors
  }
}

module.exports = MicroBT
