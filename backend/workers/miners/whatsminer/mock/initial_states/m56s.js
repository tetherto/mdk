'use strict'
const libUtils = require('../utils')
const { cloneDeep } = require('@bitfinex/lib-js-util-base')

module.exports = function (ctx) {
  const pastHashrates = []
  const state = {
    ...libUtils.createBaseState({ led_mode: 'auto' }),
    summary: libUtils.createSummary(libUtils, true),
    devdetails: libUtils.createDevdetails('M56S_VH30'),
    devs: libUtils.createDevs(
      ctx,
      'H36K07-22110702 BINV02-196804B',
      [53352, 53352, 51934, 51934],
      [535, 535, 544, 547],
      [9, 10, 10, 9],
      true
    ),
    error_code: [],
    miner_info: libUtils.createMinerInfo(ctx),
    psu: {
      name: 'P463B',
      hw_version: 'R00003',
      sw_version: '220408.221104026',
      model: 'P463B',
      enable: '0',
      iin: '0',
      vin: '39600',
      pin: '13',
      fan_speed: '0',
      serial_no: '1449B2244000213',
      vendor: '1',
      temp0: '0'
    },
    version: libUtils.createVersion('H36K07-22110702 BINV02-196804B'),
    pools: libUtils.createPools()
  }

  const getInitialState = () => {
    // get current power mode and target frequency
    const newState = cloneDeep(state)

    libUtils.updateTemperature(newState, true)

    if (state.suspended) {
      newState.summary = libUtils.createSuspendedSummary(true)
      newState.devs.forEach(dev => {
        Object.assign(dev, libUtils.createSuspendedDevs(true))
      })
      newState.psu = libUtils.createPSU(false, ctx.serial, newState.currentTemp)
    } else {
      libUtils.calculatePowerModeHashrate(newState, state, pastHashrates, libUtils, 2, 2)

      const avgHashrate = pastHashrates.reduce((a, b) => a + b, 0) / pastHashrates.length
      libUtils.updateActiveSummary(newState, avgHashrate, libUtils, true)
      libUtils.updateActiveDevs(newState, avgHashrate, libUtils, true)

      // update PSU
      newState.psu = libUtils.createPSU(true, '1413C2246300196', newState.currentTemp, newState.summary.Power)

      newState.summary.Accepted = newState.summary.Accepted + parseInt(libUtils.randomNumber(0, 5))
      newState.pools[0].Accepted = newState.summary.Accepted
    }

    Object.assign(state, newState)

    return state
  }

  const initialState = JSON.parse(JSON.stringify(getInitialState()))

  return { state, cleanup: libUtils.cleanup.bind(null, state, initialState) }
}
