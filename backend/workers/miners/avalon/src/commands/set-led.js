'use strict'

const device = require('../device')
const call = require('../call')

module.exports = async (params) => call(() => device.setLED(params.enabled))
