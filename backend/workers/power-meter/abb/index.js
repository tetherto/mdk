'use strict'

// The Worker Plugin itself is mdk-contract.json + src/, loaded by directory
// (WorkerRuntimeV2). This module only exports the device classes for hosts
// that drive a meter without the runtime.
module.exports = {
  ABBPowerMeter: require('./lib/abb.powermeter'),
  B2XPowerMeter: require('./lib/models/b2x.powermeter'),
  M1M20PowerMeter: require('./lib/models/m1m20.powermeter'),
  M4M20PowerMeter: require('./lib/models/m4m20.powermeter'),
  REU615PowerMeter: require('./lib/models/reu615.powermeter')
}
