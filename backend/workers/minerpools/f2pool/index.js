'use strict'

// The Worker Plugin itself is mdk-contract.json + src/, loaded by directory
// (WorkerRuntimeV2). This module only exports the scheduler-driven pool
// manager (PoolService based) for hosts that drive the pool without the
// runtime.
module.exports = {
  F2_POOL: require('./lib/f2.minerpool.manager')
}
