'use strict'

const test = require('brittle')
const path = require('path')
const { loadPlugin } = require('../../lib/plugin-loader')
const simPlugin = require('../fixtures/sim-plugin')

const FIXTURE_DIR = path.join(__dirname, '..', 'fixtures', 'sim-plugin')

function pluginWith (contract) {
  return { contract, dir: FIXTURE_DIR, connect: async () => ({}) }
}

function contractWith (capabilities) {
  return { metadata: { provider: 'test' }, capabilities }
}

test('loads every declared handler eagerly', (t) => {
  const loaded = loadPlugin(simPlugin)

  t.alike([...loaded.handlers.telemetry.keys()], ['hashrate_rt', 'power', 'power_limit'])
  t.alike([...loaded.handlers.commands.keys()], ['setPowerLimit', 'reboot', 'explode'])
  for (const fn of loaded.handlers.telemetry.values()) t.is(typeof fn, 'function')
  for (const fn of loaded.handlers.commands.values()) t.is(typeof fn, 'function')
  t.is(loaded.connect, simPlugin.connect)
  t.is(loaded.disconnect, simPlugin.disconnect)
})

test('publishedContract strips handler fields and keeps everything else', (t) => {
  const loaded = loadPlugin(simPlugin)
  const published = loaded.publishedContract

  t.alike(published.metadata, simPlugin.contract.metadata)
  for (const section of ['telemetry', 'commands']) {
    for (const entry of published.capabilities[section]) {
      t.is(entry.handler, undefined, `${section}.${entry.name} has no handler field`)
    }
  }
  t.is(published.capabilities.commands[0].params[0].min, 100)
  t.not(published, simPlugin.contract)
  t.ok(simPlugin.contract.capabilities.telemetry[0].handler, 'source contract untouched')
})

test('aborts on missing handler module', (t) => {
  const plugin = pluginWith(contractWith({
    telemetry: [{ name: 'x', handler: 'src/telemetry/does-not-exist.js' }],
    commands: []
  }))
  t.exception(() => loadPlugin(plugin), /ERR_PLUGIN_HANDLER_NOT_FOUND: telemetry\.x/)
})

test('aborts on non-function handler export', (t) => {
  const plugin = pluginWith(contractWith({
    telemetry: [],
    commands: [{ name: 'bad', handler: 'src/not-a-function.js' }]
  }))
  t.exception(() => loadPlugin(plugin), /ERR_PLUGIN_HANDLER_NOT_FUNCTION: commands\.bad/)
})

test('aborts on entry without handler field', (t) => {
  const plugin = pluginWith(contractWith({
    telemetry: [{ name: 'hashrate_rt', unit: 'TH/s', type: 'number', description: 'no handler' }],
    commands: []
  }))
  t.exception(() => loadPlugin(plugin), /ERR_PLUGIN_HANDLER_MISSING: telemetry\.hashrate_rt/)
})

test('aborts on duplicate names within a section', (t) => {
  const plugin = pluginWith(contractWith({
    telemetry: [],
    commands: [
      { name: 'reboot', handler: 'src/commands/reboot.js' },
      { name: 'reboot', handler: 'src/commands/reboot.js' }
    ]
  }))
  t.exception(() => loadPlugin(plugin), /ERR_PLUGIN_DUPLICATE_NAME: commands\.reboot/)
})

test('aborts on entry without a name', (t) => {
  const plugin = pluginWith(contractWith({
    telemetry: [{ handler: 'src/telemetry/hashrate.js' }],
    commands: []
  }))
  t.exception(() => loadPlugin(plugin), /ERR_PLUGIN_ENTRY_NAME_MISSING: telemetry/)
})

test('aborts on invalid plugin or contract shape', (t) => {
  t.exception(() => loadPlugin(null), /ERR_PLUGIN_REQUIRED/)
  t.exception(() => loadPlugin({ contract: simPlugin.contract, dir: FIXTURE_DIR }), /ERR_PLUGIN_CONNECT_NOT_FUNCTION/)
  t.exception(() => loadPlugin({ contract: simPlugin.contract, connect: async () => ({}) }), /ERR_PLUGIN_DIR_MISSING/)
  t.exception(() => loadPlugin({ dir: FIXTURE_DIR, connect: async () => ({}) }), /ERR_PLUGIN_CONTRACT_MISSING/)
  t.exception(
    () => loadPlugin(pluginWith({ capabilities: { telemetry: [], commands: [] } })),
    /ERR_PLUGIN_CONTRACT_METADATA_MISSING/
  )
  t.exception(
    () => loadPlugin(pluginWith({ metadata: {} })),
    /ERR_PLUGIN_CONTRACT_CAPABILITIES_MISSING/
  )
  t.exception(
    () => loadPlugin({ ...simPlugin, disconnect: 'nope' }),
    /ERR_PLUGIN_DISCONNECT_NOT_FUNCTION/
  )
  t.exception(
    () => loadPlugin(pluginWith(contractWith({ telemetry: {}, commands: [] }))),
    /ERR_PLUGIN_SECTION_NOT_ARRAY: telemetry/
  )
})

test('missing sections load as empty handler maps', (t) => {
  const loaded = loadPlugin(pluginWith(contractWith({})))
  t.is(loaded.handlers.telemetry.size, 0)
  t.is(loaded.handlers.commands.size, 0)
})
