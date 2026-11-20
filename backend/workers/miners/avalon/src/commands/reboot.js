'use strict'

const device = require('../device')
const call = require('../call')

module.exports = async () => call(() => device.reboot())
