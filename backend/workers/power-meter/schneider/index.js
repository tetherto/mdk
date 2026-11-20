'use strict'

// The Worker Plugin itself is mdk-contract.json + src/, loaded by directory
// (WorkerRuntimeV2). This module only exports the device classes for hosts
// that drive a meter without the runtime.
module.exports = {
  SchneiderPowerMeter: require('./lib/schneider'),
  P3U30PowerMeter: require('./lib/models/p3u30.powermeter'),
  PM5340PowerMeter: require('./lib/models/pm5340.powemeter')
}
