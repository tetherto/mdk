'use strict'

// The Worker Plugin itself is mdk-contract.json + src/, loaded by directory
// (WorkerRuntimeV2). This module only exports the miner class for hosts that
// drive a device without the runtime.
module.exports = {
  AvalonMiner: require('./lib/avalon.miner')
}
