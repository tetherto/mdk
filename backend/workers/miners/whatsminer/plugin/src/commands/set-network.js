'use strict'

const commandResult = require('./command-result')
const normalizeNetworkConfig = require('../../../lib/utils/network')

module.exports = async ({ device }, params) => {
  const network = normalizeNetworkConfig(params?.network)
  return commandResult(await device.setNetworkInformation(network))
}
