'use strict'

module.exports = (ctx) => ({
  serial: ctx.serial || 'SIM-000',
  hashrateThs: ctx.hashrateThs != null ? ctx.hashrateThs : 100,
  powerW: ctx.powerW != null ? ctx.powerW : 3000,
  powerLimitW: ctx.powerLimitW != null ? ctx.powerLimitW : 3500,
  bootTime: Date.now()
})
