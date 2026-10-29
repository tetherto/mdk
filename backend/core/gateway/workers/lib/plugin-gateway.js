'use strict'

const path = require('path')
const { pluginLogger } = require('./logger')

// Builds what a plugin sees as require('@tetherto/mdk-gateway/plugin') — the
// contract between a plugin and the gateway. There are no phases and no worker
// internals to learn; the one moment in the gateway's life a plugin can name is
// onReady, and only because a plugin cannot observe it any other way.
//
// The full surface:
//   gw.config           gateway conf ⊕ the plugin's own config block
//                       (spec.gateway.plugins[].config wins key-by-key)
//   gw.logger           the gateway's logger, tagged with this plugin's name:
//                       error/warn/info/debug/trace/fatal + child()
//   gw.onReady(fn)      fn runs once this gateway is serving
//
// No Kernel keys: a plugin never builds a Kernel client from raw keys. Apps
// reach the Kernel through the client their app runtime signs in as the app's
// service account (config.mdkClient there), so every call is checked against
// spec.rbac. Kernel fields in either conf layer are dropped.

// What a plugin's log lines are tagged with. The manifest name is the plugin's
// own identity; the scope is dropped because the tag prefixes every line.
function _pluginName (pluginDir) {
  try {
    const { name } = require(path.join(pluginDir, 'mdk-plugin.json'))
    if (typeof name === 'string' && name) return name.replace(/^@[^/]+\//, '')
  } catch {}
  return path.basename(pluginDir)
}

const KERNEL_FIELDS = ['kernelKey', 'kernelKeyPair', 'kernelBootstrap', 'kernelDhtHost', 'kernelCredential']

function _withoutKernelFields (conf) {
  const out = { ...(conf || {}) }
  for (const k of KERNEL_FIELDS) delete out[k]
  return out
}

function buildPluginContext (wrk, pluginDir, pluginConf) {
  const context = Object.freeze({
    // The plugin's own config block (spec.gateway.plugins[].config) wins over
    // gateway-wide conf, so a plugin's settings live with the plugin.
    config: Object.freeze({
      ..._withoutKernelFields(wrk.conf),
      ..._withoutKernelFields(pluginConf)
    }),

    // A plugin that prints with console has no level, no timestamp and no name;
    // going through the gateway's logger puts its lines in the same stream and
    // format as the requests it serves.
    logger: pluginLogger(_pluginName(pluginDir), wrk.conf),

    // Plugin modules are loaded from the worker's init(), which is strictly
    // before _start() opens the listener, so a plugin doing anything at load
    // time does it to a gateway that answers nothing yet — and a plugin whose
    // work is a call to this same gateway fails for no reason but the order.
    // onReady is that missing moment: fn runs once everything this gateway
    // serves is up, and runs straight away for anything registered after that.
    onReady: (fn) => wrk.onGatewayReady(fn)
  })

  return { context }
}

module.exports = { buildPluginContext }
