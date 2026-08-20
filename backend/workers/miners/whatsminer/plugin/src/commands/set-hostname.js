'use strict'

const commandResult = require('./command-result')
const normalizeHostname = require('../../../lib/utils/hostname')

module.exports = async ({ device }, params) => {
  const hostname = normalizeHostname(params?.hostname)
  return commandResult(await device.setHostname(hostname))
}
