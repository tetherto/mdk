'use strict'

module.exports = {
  plugin: require('./plugin'),
  startAntminerWorker: require('./plugin/boot').startAntminerWorker,
  Antminer: require('./lib/antminer')
}
