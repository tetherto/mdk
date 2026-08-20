'use strict'

const commandResult = require('./command-result')

module.exports = async ({ device }) => commandResult(await device.downloadLogs())
