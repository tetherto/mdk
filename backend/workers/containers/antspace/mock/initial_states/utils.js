'use strict'

const crypto = require('crypto')

const randomFloat = () => {
  return crypto.randomBytes(6).readUIntBE(0, 6) / 2 ** 48
}

const randomNumber = (min = 0, max = 1) => {
  const number = randomFloat() * (max - min) + min
  return parseFloat(number.toFixed(2))
}

const getRandomPower = () => {
  return randomNumber(2000, 3000)
}

const getRandomIP = () => [...crypto.randomBytes(4)].join('.')

// Helper function to create fault fields
const createFaultFields = (faultNames, errorValue) => {
  const faults = {}
  for (const name of faultNames) {
    faults[name] = errorValue
  }
  return faults
}

// Helper function to create miner info entries
const createMinerInfoEntries = () => {
  const minerEntries = [
    {
      miner_type: 'S17 Hydro',
      miner_version: '2021-08-10 16:54:03',
      elapsed: 2565,
      GHS_5s: 87.83214750771423,
      GHS_avg: 124.3864406464078,
      pcb_max_temp: 19,
      chip_max_temp: 46
    },
    {
      miner_type: 'S19 Hydro',
      miner_version: '2021-08-10 16:54:03',
      elapsed: 3986,
      GHS_5s: 141.96580437744242,
      GHS_avg: 128.08028841162994,
      pcb_max_temp: 32,
      chip_max_temp: 62
    },
    {
      miner_type: 'S19 Hydro',
      miner_version: '2021-08-10 16:54:03',
      elapsed: 686,
      GHS_5s: 74.66696038808021,
      GHS_avg: 9.137263799960047,
      pcb_max_temp: 39,
      chip_max_temp: 10
    },
    {
      miner_type: 'S19 Hydro',
      miner_version: '2021-08-10 16:54:03',
      elapsed: 7576,
      GHS_5s: 154.767296148344,
      GHS_avg: 165.14126176502378,
      pcb_max_temp: 32,
      chip_max_temp: 81
    },
    {
      miner_type: 'S20 Hydro',
      miner_version: '2021-08-10 16:54:03',
      elapsed: 1539,
      GHS_5s: 107.96540202661427,
      GHS_avg: 98.47839348764413,
      pcb_max_temp: 48,
      chip_max_temp: 33
    }
  ]

  const minerInfo = {}
  for (const entry of minerEntries) {
    minerInfo[getRandomIP()] = entry
  }
  return minerInfo
}

module.exports = {
  getRandomPower,
  getRandomIP,
  createFaultFields,
  createMinerInfoEntries
}
