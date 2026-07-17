'use strict'

module.exports = {
  plugin: require('./plugin'),
  startF2poolWorker: require('./plugin/boot').startF2poolWorker,
  F2_POOL: require('./lib/f2.minerpool.manager')
}
