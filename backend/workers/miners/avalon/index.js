'use strict'

module.exports = {
  plugin: require('./plugin'),
  startAvalonWorker: require('./plugin/boot').startAvalonWorker,
  AvalonMiner: require('./lib/avalon.miner')
}
