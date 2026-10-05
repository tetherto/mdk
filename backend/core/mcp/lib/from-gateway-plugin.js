'use strict'

const { loadPlugin } = require('@tetherto/mdk-gateway/workers/lib/plugin-loader')
const { generateToolsFromGatewayPlugin } = require('./from-http-plugin')

/**
 * Loads a Gateway plugin's manifest + routes ("contract") from `pluginDir` and
 * converts each route into an MCP tool, so a Gateway plugin's HTTP routes are
 * available to an AI agent with no separate tool authoring.
 *
 * @param {string} pluginDir - Directory holding the plugin's `mdk-plugin.json` + routes.
 * @param {object} context - The plugin context (`require('@tetherto/mdk-gateway/plugin')`
 *   shape) to hand the plugin's route handlers.
 * @returns {Array<object>} MCP tools generated from the plugin's routes.
 */
function loadGatewayPluginTools (pluginDir, context) {
  const plugin = loadPlugin(pluginDir, context)
  return generateToolsFromGatewayPlugin(plugin)
}

module.exports = { loadGatewayPluginTools }
