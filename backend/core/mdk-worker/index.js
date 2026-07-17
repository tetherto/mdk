'use strict'

module.exports = {
  WorkerRuntime: require('./lib/worker-runtime'),
  loadPlugin: require('./lib/plugin-loader').loadPlugin
}
