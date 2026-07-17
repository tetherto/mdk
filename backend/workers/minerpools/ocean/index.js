'use strict'

module.exports = {
  plugin: require('./plugin'),
  startOceanPoolWorker: require('./plugin/boot').startOceanPoolWorker,
  OCEAN_POOL: require('./lib/ocean.minerpool.manager')
}
