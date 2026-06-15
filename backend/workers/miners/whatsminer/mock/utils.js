'use strict'

const CryptoJS = require('crypto-js')
const { cloneDeep } = require('@bitfinex/lib-js-util-base')
const hex2a = require('../lib/utils/hex2a')
const crypto = require('crypto')

function proxyState (fn) {
  return function (ctx, state, req, id) {
    const _state = cloneDeep(state)
    const res = fn(ctx, _state, req)
    Object.assign(state, _state)

    return res
  }
}

function randomFloat () {
  return crypto.randomBytes(6).readUIntBE(0, 6) / 2 ** 48
}

function randomNumber (min, max) {
  const number = randomFloat() * (max - min) + min
  return parseFloat(number.toFixed(2))
}

function decryptCommand (cmd, key) {
  const decrypted = CryptoJS.AES.decrypt(cmd.data, CryptoJS.SHA256(key), { mode: CryptoJS.mode.ECB }).toString()
  return JSON.parse(hex2a(decrypted))
}

function encryptResponse (data, key) {
  const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), CryptoJS.SHA256(key), { mode: CryptoJS.mode.ECB }).toString()
  return JSON.stringify({
    enc: encrypted
  })
}

function cleanup (state, initialState) {
  Object.assign(state, initialState)
  return state
}

function getRandomHashrate () {
  return randomNumber(290000000, 300000000)
}

function getHashrate () {
  const hashRate = {
    'MHS 5s': getRandomHashrate(),
    'MHS 1m': getRandomHashrate(),
    'MHS 5m': getRandomHashrate(),
    'MHS 15m': getRandomHashrate()
  }

  hashRate['MHS av'] = Object.values(hashRate).reduce((a, b) => a + b, 0) / 4

  return hashRate
}

const getRandomIP = () => [...crypto.randomBytes(4)].join('.')

function createSuccessResponse (msg = 'API command OK', description = '') {
  return { STATUS: 'S', When: +new Date(), Code: 131, Msg: msg, Description: description }
}

function createErrorResponse (code = 14, msg = 'Invalid command', description = '') {
  return { STATUS: 'E', When: +new Date(), Code: code, Msg: msg, Description: description }
}

function validateArgs (args, req) {
  return args.some(arglist => arglist.every(arg => arg in req))
}

function createPools () {
  return [
    {
      POOL: 1,
      URL: 'stratum+tcp://btc.f2pool.com:1314',
      Status: 'Alive',
      Priority: 0,
      Quota: 1,
      Getworks: 0,
      Accepted: 0,
      Rejected: 0,
      Works: 0,
      Discarded: 0,
      Stale: 0,
      'Get Failures': 0,
      'Remote Failures': 0,
      User: 'haven7346',
      'Stratum Active': true,
      'Stratum Difficulty': 1048576,
      'Pool Rejected%': 0,
      'Pool Stale%': 0,
      'Bad Work': 0,
      'Current Block Height': 0,
      'Current Block Version': 536870912
    },
    {
      POOL: 2,
      URL: 'stratum+tcp://btc-asia.f2pool.com:1314',
      Status: 'Alive',
      Priority: 1,
      Quota: 1,
      Getworks: 0,
      Accepted: 0,
      Rejected: 0,
      Works: 0,
      Discarded: 0,
      Stale: 0,
      'Get Failures': 0,
      'Remote Failures': 0,
      User: 'haven7346',
      'Stratum Active': false,
      'Stratum Difficulty': 65536,
      'Pool Rejected%': 0,
      'Pool Stale%': 0,
      'Bad Work': 0,
      'Current Block Height': 0,
      'Current Block Version': 536870912
    },
    {
      POOL: 3,
      URL: 'stratum+tcp://btc-na.f2pool.com:1314',
      Status: 'Alive',
      Priority: 2,
      Quota: 1,
      Getworks: 0,
      Accepted: 0,
      Rejected: 0,
      Works: 0,
      Discarded: 0,
      Stale: 0,
      'Get Failures': 0,
      'Remote Failures': 0,
      User: 'haven7346',
      'Stratum Active': false,
      'Stratum Difficulty': 65536,
      'Pool Rejected%': 0,
      'Pool Stale%': 0,
      'Bad Work': 0,
      'Current Block Height': 0,
      'Current Block Version': 536870912
    }
  ]
}

function createDevdetails (model, count = 4) {
  return Array.from({ length: count }, (_, i) => ({
    DEVDETAILS: i,
    Name: 'SM',
    ID: i,
    Driver: 'bitmicro',
    Kernel: '',
    Model: model
  }))
}

function createDevs (ctx, chipData, factoryGHS, chipFreqs, chipVolDiffs, useHashrateHelper = false) {
  const baseDevs = [
    { ASC: 0, Slot: 0, 'Factory GHS': factoryGHS[0], 'Chip Frequency': chipFreqs[0], chip_vol_diff: chipVolDiffs[0] },
    { ASC: 1, Slot: 1, 'Factory GHS': factoryGHS[1], 'Chip Frequency': chipFreqs[1], chip_vol_diff: chipVolDiffs[1] },
    { ASC: 2, Slot: 2, 'Factory GHS': factoryGHS[2], 'Chip Frequency': chipFreqs[2], chip_vol_diff: chipVolDiffs[2] },
    { ASC: 3, Slot: 3, 'Factory GHS': factoryGHS[3], 'Chip Frequency': chipFreqs[3], chip_vol_diff: chipVolDiffs[3] }
  ]

  return baseDevs.map(dev => ({
    ...(useHashrateHelper
      ? getHashrate()
      : {
          'MHS av': 0,
          'MHS 5s': 0,
          'MHS 1m': 0,
          'MHS 5m': 0,
          'MHS 15m': 0
        }),
    ...dev,
    Enabled: 'Y',
    Status: 'Alive',
    Temperature: 0,
    'HS RT': 0,
    'Upfreq Complete': 1,
    'Effective Chips': 152,
    'PCB SN': ctx.serial,
    'Chip Data': chipData,
    'Chip Temp Min': 0,
    'Chip Temp Max': 0,
    'Chip Temp Avg': 0
  }))
}

function updateTemperature (newState, roundTemp = false) {
  const tempChange = newState.suspended ? -0.1 : 0.1
  let newTemp = newState.currentTemp + tempChange

  if (roundTemp) {
    newTemp = Math.floor(newTemp * 100) / 100
  }

  if (newTemp > 85) newState.currentTemp = 85
  else if (newTemp < 27) newState.currentTemp = 27
  else newState.currentTemp = newTemp

  Object.assign(newState.summary, {
    'Chip Temp Min': Math.min(newState.currentTemp, newState.summary['Chip Temp Min']),
    'Chip Temp Max': Math.max(newState.currentTemp, newState.summary['Chip Temp Max']),
    'Chip Temp Avg': newState.currentTemp
  })

  newState.devs.forEach(dev => {
    Object.assign(dev, {
      Temperature: newState.currentTemp,
      'Chip Temp Min': Math.min(newState.currentTemp, dev['Chip Temp Min']),
      'Chip Temp Max': Math.max(newState.currentTemp, dev['Chip Temp Max']),
      'Chip Temp Avg': newState.currentTemp
    })
  })
}

function createSuspendedSummary (useHashrateHelper = false) {
  const base = {
    'HS RT': 0,
    'Total MH': 0,
    freq_avg: 0,
    Power: 13,
    'Target MHS': 0,
    'Power Limit': 0
  }

  if (useHashrateHelper) {
    return { ...getHashrate(), ...base }
  }

  return {
    'MHS av': 0,
    'MHS 5s': 0,
    'MHS 1m': 0,
    'MHS 5m': 0,
    'MHS 15m': 0,
    ...base
  }
}

function createSuspendedDevs (useHashrateHelper = false) {
  const base = {
    Status: 'Initialising',
    'Chip Frequency': 0,
    'HS RT': 0,
    'Effective Chips': 0
  }

  if (useHashrateHelper) {
    return { ...getHashrate(), ...base }
  }

  return {
    'MHS av': 0,
    'MHS 5s': 0,
    'MHS 1m': 0,
    'MHS 5m': 0,
    'MHS 15m': 0,
    ...base
  }
}

function calculatePowerModeHashrate (newState, state, pastHashrates, libUtils, freqDivisor = 3, powerDivisor = 3) {
  const powerMode = state.summary['Power Mode']
  newState.summary.freq_avg = (newState.summary['Target Freq'] + newState.summary.freq_avg) / freqDivisor
  newState.summary.Power = (newState.summary.Power + newState.summary['Power Limit']) / powerDivisor

  if (powerMode === 'High') {
    newState.summary['MHS av'] = newState.summary.Power * libUtils.randomNumber(3550, 3650)
    newState.summary['Target MHS'] = 251931792
  } else if (powerMode === 'Low') {
    newState.summary['MHS av'] = newState.summary.Power * libUtils.randomNumber(2550, 2650)
    newState.summary['Target MHS'] = 251931792
  } else {
    newState.summary['MHS av'] = newState.summary.Power * libUtils.randomNumber(3050, 3150)
    newState.summary['Target MHS'] = 251931792
  }

  pastHashrates.push(newState.summary['MHS av'])
  if (pastHashrates.length > 10) {
    pastHashrates.shift()
  }
}

function createPSU (enabled, serial, currentTemp, power) {
  return {
    name: 'P564B',
    hw_version: 'R00010',
    sw_version: '20221024_P00032.20221017_S00030',
    model: 'P564B',
    enable: enabled ? '1' : '0',
    iin: enabled && power ? (39800 * 1512 / power).toFixed(2) : '0',
    vin: enabled ? '39800' : '39850',
    pin: enabled && power ? power.toString() : '8000',
    fan_speed: '0',
    serial_no: serial || '1413C2246300196',
    vendor: '1',
    temp0: currentTemp ? currentTemp.toString() : '36.0'
  }
}

function createBaseState (options = {}) {
  return {
    suspended: false,
    pre_power_on: false,
    ...(options.led_mode !== undefined && { led_mode: options.led_mode }),
    target_freq_pct: 100,
    temp_offset: 0,
    currentTemp: 36.0,
    activeTokens: 0,
    zone: {
      timezone: 'Asia/Shanghai',
      zonename: 'Asia/Shanghai'
    },
    uptime: +new Date(),
    elapsed: +new Date()
  }
}

function createSummary (libUtils, useHashrateHelper = false) {
  const baseSummary = {
    'HS RT': 0,
    Accepted: 0,
    Rejected: 0,
    'Total MH': 0,
    Temperature: 0,
    freq_avg: 808,
    'Fan Speed In': 0,
    'Fan Speed Out': 0,
    Power: 0,
    'Power Rate': 30.05,
    'Pool Rejected%': 0,
    'Pool Stale%': 0,
    'Hash Stable': true,
    'Hash Stable Cost Seconds': 627,
    'Hash Deviation%': -0.0023,
    'Target Freq': 720,
    'Target MHS': 254364834,
    'Env Temp': libUtils.randomNumber(30, 40).toFixed(2),
    'Power Mode': 'Normal',
    'Factory GHS': 239326,
    'Power Limit': 8000,
    'Chip Temp Min': 0,
    'Chip Temp Max': 0,
    'Chip Temp Avg': 0,
    Debug: '3.9 3.0/2.9 3.0/2.9 3.0/2.9 3.A:99.9/0.06/29.8/0.0',
    'Btminer Fast Boot': 'disable',
    'Upfreq Complete': 1
  }

  if (useHashrateHelper) {
    return {
      ...libUtils.getHashrate(),
      ...baseSummary
    }
  }

  return {
    'MHS av': 0,
    'MHS 5s': 0,
    'MHS 1m': 0,
    'MHS 5m': 0,
    'MHS 15m': 0,
    ...baseSummary
  }
}

function createMinerInfo (ctx, options = {}) {
  return {
    ip: ctx.host,
    proto: 'dhcp',
    netmask: getRandomIP(),
    gateway: getRandomIP(),
    dns: getRandomIP(),
    hostname: 'WhatsMiner',
    mac: 'CA:7A:0A:00:02:23',
    ledstat: 'auto',
    ...(options.upfreq_speed !== undefined && { upfreq_speed: options.upfreq_speed }),
    minersn: ctx.serial
  }
}

function createVersion (chip) {
  return {
    api_ver: '2.0.5',
    fw_ver: '20230714.15.Rel',
    platform: 'H616',
    chip
  }
}

function updateActiveDevs (newState, avgHashrate, libUtils, useHashrateHelper = false) {
  newState.devs.forEach(dev => {
    const baseUpdate = {
      Status: 'Alive',
      Temperature: useHashrateHelper ? parseFloat(libUtils.randomNumber(60, 80).toFixed(2)) : libUtils.randomNumber(60, 80),
      'Chip Frequency': newState.summary.freq_avg,
      'HS RT': newState.summary['MHS av'],
      'Effective Chips': 128
    }

    if (useHashrateHelper) {
      Object.assign(dev, {
        ...baseUpdate,
        ...libUtils.getHashrate(),
        'HS RT': newState.summary['MHS av']
      })
    } else {
      Object.assign(dev, {
        ...baseUpdate,
        'MHS av': avgHashrate,
        'MHS 5s': avgHashrate,
        'MHS 1m': avgHashrate,
        'MHS 5m': avgHashrate,
        'MHS 15m': avgHashrate
      })
    }
  })
}

function updateActiveSummary (newState, avgHashrate, libUtils, useHashrateHelper = false) {
  if (useHashrateHelper) {
    Object.assign(newState.summary, {
      ...libUtils.getHashrate(),
      'HS RT': newState.summary['MHS av'],
      'Total MH': newState.summary['MHS av'] * 4
    })
  } else {
    Object.assign(newState.summary, {
      'MHS 5s': avgHashrate,
      'MHS 1m': avgHashrate,
      'MHS 5m': avgHashrate,
      'MHS 15m': avgHashrate,
      'HS RT': newState.summary['MHS av'],
      'Total MH': newState.summary['MHS av'] * 4
    })
  }
}

module.exports = {
  proxyState,
  randomNumber,
  decryptCommand,
  encryptResponse,
  cleanup,
  getHashrate,
  getRandomIP,
  createSuccessResponse,
  createErrorResponse,
  validateArgs,
  createPools,
  createDevdetails,
  createDevs,
  updateTemperature,
  createSuspendedSummary,
  createSuspendedDevs,
  calculatePowerModeHashrate,
  createPSU,
  createBaseState,
  createSummary,
  createMinerInfo,
  createVersion,
  updateActiveDevs,
  updateActiveSummary
}
