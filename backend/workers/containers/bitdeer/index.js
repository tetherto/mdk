'use strict'

module.exports = {
  plugin: require('./plugin'),
  startBitdeerWorker: require('./plugin/boot').startBitdeerWorker,
  Bitdeer: require('./lib/bitdeer')
}
