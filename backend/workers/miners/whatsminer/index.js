'use strict'

module.exports = {
  plugin: require('./plugin'),
  startWhatsminerWorker: require('./plugin/boot').startWhatsminerWorker,
  Whatsminer: require('./lib/whatsminer')
}
