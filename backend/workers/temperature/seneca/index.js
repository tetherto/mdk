'use strict'

module.exports = {
  plugin: require('./plugin'),
  startSenecaWorker: require('./plugin/boot').startSenecaWorker,
  SenecaSensor: require('./lib/seneca.sensor')
}
