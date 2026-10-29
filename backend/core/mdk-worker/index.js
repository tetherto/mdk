'use strict'

module.exports = {
  WorkerRuntime: require('./lib/worker-runtime'),
  WorkerRuntimeV2: require('./lib/worker-runtime-v2'),
  loadPlugin: require('./lib/plugin-loader').loadPlugin,
  loadContract: require('./lib/contract-loader').loadContract,
  validateContract: require('./lib/contract-validator').validateContract,
  validateParams: require('@tetherto/mdk-kernel/protocol/params').validateParams,
  createInstance: require('./lib/instance-loader').createInstance,
  createModuleContext: require('./lib/module-context').createModuleContext
}
