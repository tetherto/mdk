'use strict'

const { loadPlugin } = require('@tetherto/mdk-gateway/workers/lib/plugin-loader')
const { runtimeKey } = require('@tetherto/mdk-gateway/workers/lib/plugin-adapter')
const { resolvePluginDir } = require('@tetherto/mdk-app-runtime')
const { generateToolsFromGatewayPlugin } = require('./from-http-plugin')

/**
 * Turns an app's route table into MCP tools that forward every call to the
 * app's runtime over HRPC, as the Gateway does: only the table is read here, so
 * no app code runs in the MCP server.
 *
 * @param {{ name: string, appDir: string, keyFile: string }} app - The app's package
 *   dir and the file its runtime publishes its key to (re-read on every call).
 * @param {object} client - A `createRuntimeClient()` from `@tetherto/mdk-app-runtime`.
 * @param {object} [opts]
 * @param {object} [opts.authority] - Checks every call against spec.rbac as the Gateway
 *   does (see @tetherto/mdk-gateway workers/lib/authority.js); the caller's identity then
 *   arrives per call.
 * @param {Function} [opts.onDecision] - Receives each authorization decision.
 * @param {object} [opts.identity] - Without an authority: sent with every call as the caller's
 *   identity. Required for `auth: true` routes, which otherwise throw ERR_MCP_AUTH_REQUIRED.
 * @param {number} [opts.timeoutMs] - Bound on each call.
 * @returns {Array<object>} MCP tools generated from the app's routes (stream routes are skipped).
 */
function loadAppTools (app, client, opts = {}) {
  if (!app?.appDir || !app?.keyFile) throw new Error(`ERR_INVALID_MCP_APP: ${JSON.stringify(app)}`)
  const plugin = loadPlugin(resolvePluginDir(app.appDir), undefined, { handlers: false })
  const call = async (routeId, req, identity, actor) =>
    client.invoke(await runtimeKey(app), routeId, req, { identity, ...(actor ? { actor } : {}), timeoutMs: opts.timeoutMs })
  return generateToolsFromGatewayPlugin(plugin, {
    identity: opts.identity,
    authority: opts.authority,
    appName: app.name,
    onDecision: opts.onDecision,
    call
  })
}

module.exports = { loadAppTools }
