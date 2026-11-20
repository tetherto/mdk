'use strict'

// Modules are required lazily so a consumer that only needs the manifest
// helpers does not pull hyperswarm into its process.

module.exports = {
  get createAppRuntime () { return require('./lib/runtime').createAppRuntime },
  get getOrCreateSeed () { return require('./lib/runtime').getOrCreateSeed },
  get createRuntimeClient () { return require('./lib/client').createRuntimeClient },
  get pipeToResponse () { return require('./lib/client').pipeToResponse },
  get loadAppManifest () { return require('./lib/manifest').loadAppManifest },
  get validateAppManifest () { return require('./lib/manifest').validateAppManifest },
  get resolvePluginDir () { return require('./lib/manifest').resolvePluginDir },
  get PLUGIN_FILE () { return require('./lib/manifest').PLUGIN_FILE },
  get validateRouteTable () { return require('./lib/route-table-validator').validateRouteTable },
  get routeTableToOpenApi () { return require('./lib/route-table-openapi').routeTableToOpenApi },
  get fastifyRoutesToOpenApi () { return require('./lib/route-table-openapi').fastifyRoutesToOpenApi },
  get renderReference () { return require('./lib/route-table-openapi').renderReference },
  get dhtPortOpts () { return require('@tetherto/mdk-client').dhtPortOpts }
}
