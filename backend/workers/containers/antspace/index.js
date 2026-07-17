'use strict'

module.exports = {
  plugin: require('./plugin'),
  startAntspaceWorker: require('./plugin/boot').startAntspaceWorker,
  Antspace: require('./lib/antspace'),
  AntspaceHydro: require('./lib/antspace.hydro'),
  AntspaceImmersion: require('./lib/antspace.immersion')
}
