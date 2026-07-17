'use strict'

module.exports = {
  plugin: require('./plugin'),
  startSatecWorker: require('./plugin/boot').startSatecWorker,
  SatecPowerMeter: require('./lib/satec.powermeter')
}
