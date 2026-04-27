'use strict'
const libUtils = require('../utils')
const { cloneDeep } = require('@bitfinex/lib-js-util-base')

module.exports = function (ctx) {
  const pastHashrates = []
  const state = {
    suspended: false,
    startTime: Date.now(),
    _tempCount: 1,
    currentTemp: 36.0,
    avgTemp: 36.0,
    maxTemp: 36.0,
    power: 3100,
    mhsAv: 0,
    mhsPast: 0,
    freq: 0,
    led: false,
    chipVoltages: [],
    chipTemps: [],
    accepted: 0,
    rejected: 0,
    stale: 0,
    workMode: '0',
    hashPower: ctx.error ? [0, 0, 0, 0, 0, 0] : [1, 1, 1, 1, 1, 1],
    mtMax: [],
    mtAvg: [],
    pools: [
      {
        url: 'stratum+tcp://btc.f2pool.com:1314',
        username: 'haven7346'
      },
      {
        url: 'stratum+tcp://btc-asia.f2pool.com:1314',
        username: 'haven7346'
      },
      {
        url: 'stratum+tcp://btc-euro.f2pool.com:1314',
        username: 'haven7346'
      }
    ]
  }

  const getInitialState = () => {
    // get current power mode and target frequency
    const newState = cloneDeep(state)

    const newTemp = newState.currentTemp + (newState.suspended ? -0.1 : 0.1)
    if (newTemp > 85) newState.currentTemp = 85
    else if (newTemp < 27) newState.currentTemp = 27
    else newState.currentTemp = newTemp

    newState.maxTemp = Math.max(newState.maxTemp, newState.currentTemp)
    newState._tempCount += 1
    newState.avgTemp = (newState.avgTemp * (newState._tempCount - 1) + newState.currentTemp) / newState._tempCount

    if (state.suspended) {
      Object.assign(newState, {
        mhsAv: 0,
        mhsPast: 0,
        power: 0,
        freq: 0,
        chipVoltages: [],
        chipTemps: [],
        hashPower: [0, 0, 0, 0, 0, 0],
        mtMax: [],
        mtAvg: []
      })
    } else {
      const avgHashrate = pastHashrates.reduce((a, b) => a + b, 0) / pastHashrates.length

      Object.assign(newState, {
        mhsAv: libUtils.randomNumber(290000000, 300000000),
        mhsPast: avgHashrate,
        power: 3100,
        freq: (libUtils.randomNumber(490, 500) + newState.freq) / 2,
        chipVoltages: Array(120).fill().map(() => libUtils.randomNumber(310, 325)),
        chipTemps: Array(120).fill().map(() => libUtils.randomNumber(newState.currentTemp - 2, newState.currentTemp + 2)),
        hashPower: [0, parseInt(libUtils.randomNumber(1226, 1228).toString()), parseInt(libUtils.randomNumber(1443, 1447).toString()), parseInt(libUtils.randomNumber(215, 217).toString()), parseInt(libUtils.randomNumber(3150, 3153).toString()), parseInt(libUtils.randomNumber(1443, 1447).toString()), parseInt(libUtils.randomNumber(3320, 3325).toString())],
        mtMax: [newState.maxTemp, newState.maxTemp, newState.maxTemp],
        mtAvg: [newState.avgTemp, newState.avgTemp, newState.avgTemp]
      })

      pastHashrates.push(newState.mhsAv)
      if (pastHashrates.length > 10) {
        pastHashrates.shift()
      }

      newState.accepted += parseInt(libUtils.randomNumber(0, 5))
    }

    Object.assign(state, newState)

    return state
  }

  const initialState = JSON.parse(JSON.stringify(getInitialState()))

  function cleanup () {
    Object.assign(state, initialState)
    return state
  }

  // update hashrate, power and temp according to state values
  return { state, cleanup }
}
