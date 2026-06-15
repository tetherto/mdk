'use strict'

const { getRandomPowerReading } = require('../lib/utils')
const baseRouter = require('./base')

module.exports = function (fastify) {
  baseRouter(fastify)

  fastify.get('/miner_power', (req, res) => {
    const power = getRandomPowerReading()
    res.send(`miner power:${power}`)
  })
}
