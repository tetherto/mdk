'use strict'

module.exports = {
  plugin: require('./plugin'),
  startEmcdWorker: require('./plugin/boot').startEmcdWorker,
  EMCD_POOL: require('./lib/emcd.minerpool.manager')
}
