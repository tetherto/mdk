'use strict'

// The Worker Plugin itself is mdk-contract.json + src/, loaded by directory
// (WorkerRuntimeV2). This module only exports the device class for hosts
// that drive a meter without the runtime.
module.exports = {
  SatecPowerMeter: require('./lib/satec.powermeter')
}
