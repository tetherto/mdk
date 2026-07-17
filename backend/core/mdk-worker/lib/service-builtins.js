'use strict'

/**
 * Legacy worker-infra surface served by the runtime from injected services —
 * the query types and commands the adapter-era workers answered from the
 * manager's store rather than the device. Each entry is active only when its backing
 * service is present in the runtime's `services` object:
 *
 *   logHistory   → telemetry `logs`, `historical_logs`, `logs_multi`
 *   settings     → telemetry `settings`, command `saveSettings`
 *   provisioning → telemetry `thing_config`, `list`, `count`, `config`,
 *                  commands `registerThing`, `updateThing`, `forgetThings`
 *   stats        → telemetry `stats`
 *   comments     → commands `saveComment`, `editComment`, `deleteComment`
 *   actions      → `write.calls.request`
 *   pool         → telemetry `ext_data` (scheduler-driven pool workers)
 *
 * These never reach plugin handlers: they are worker infrastructure, not
 * device translation.
 *
 * Telemetry handlers receive (services, deviceId, params, rt) where rt is
 * runtime context: { workerId, metadata, deviceIds }. When provisioning is
 * present, `list` shadows the runtime's bare devices list with the legacy
 * thing list ({ things: [{ id, code, type, tags, info, comments, last? }] })
 * that adapter-era gateways read.
 */

const TELEMETRY_BUILTINS = {
  logs: {
    service: 'logHistory',
    handle: async (services, deviceId, params) => ({
      logs: await services.logHistory.tailLog({ thingId: deviceId, ...params })
    })
  },
  historical_logs: {
    service: 'logHistory',
    handle: async (services, deviceId, params) => ({
      logs: await services.logHistory.getHistoricalLogs({ thingId: deviceId, ...params })
    })
  },
  logs_multi: {
    service: 'logHistory',
    handle: async (services, deviceId, params, rt) => {
      const deviceIds = params.deviceIds || (deviceId ? [deviceId] : rt.deviceIds)
      const allLogs = []
      for (const id of deviceIds) {
        try {
          const logs = await services.logHistory.tailLog({ thingId: id, ...params })
          allLogs.push(...(Array.isArray(logs) ? logs : []))
        } catch (e) {
          // one unreadable device log must not fail the multi-pull
        }
      }
      return { logs: allLogs }
    }
  },
  settings: {
    service: 'settings',
    handle: async (services) => ({
      settings: await services.settings.getSettings()
    })
  },
  thing_config: {
    service: 'provisioning',
    handle: async (services, deviceId, params) => ({
      config: await services.provisioning.getThingConf({ thingId: deviceId, ...params })
    })
  },
  list: {
    service: 'provisioning',
    handle: async (services, deviceId, params, rt) => {
      const devices = services.provisioning.listDevices({
        ...params,
        offset: params.offset ?? 0,
        limit: params.limit ?? 100
      })
      const things = devices.map((dev) => ({
        id: dev.id,
        code: dev.code,
        type: dev.type,
        tags: dev.tags,
        info: dev.info,
        rack: rt.workerId,
        comments: dev.comments,
        address: dev.opts && dev.opts.address,
        port: dev.opts && dev.opts.port,
        ...(params.status && services.snaps ? { last: services.snaps.getLast(dev.id) || {} } : {})
      }))
      return { things }
    }
  },
  count: {
    service: 'provisioning',
    handle: async (services) => ({
      count: services.provisioning.listDeviceIds().length
    })
  },
  config: {
    service: 'provisioning',
    handle: async (services, deviceId, params, rt) => ({
      config: { workerId: rt.workerId, contract: rt.metadata }
    })
  },
  stats: {
    service: 'stats',
    handle: async (services, deviceId, params) => ({
      stats: await services.stats.aggrStats(params.deviceIds, params.opts || {})
    })
  },
  ext_data: {
    service: 'pool',
    handle: async (services, deviceId, params) => ({
      extData: await services.pool.getWrkExtData({ query: params })
    })
  }
}

const COMMAND_BUILTINS = {
  registerThing: {
    service: 'provisioning',
    handle: (services, deviceId, params) => services.provisioning.registerThing(params)
  },
  updateThing: {
    service: 'provisioning',
    handle: (services, deviceId, params) => services.provisioning.updateThing({ id: deviceId, ...params })
  },
  forgetThings: {
    service: 'provisioning',
    handle: async (services, deviceId, params) => ({ removed: await services.provisioning.forgetThings(params) })
  },
  saveSettings: {
    service: 'settings',
    handle: (services, deviceId, params) => services.settings.saveSettingsEntries(params)
  },
  saveComment: {
    service: 'comments',
    handle: (services, deviceId, params) => services.comments.saveThingComment({ thingId: deviceId, ...params })
  },
  editComment: {
    service: 'comments',
    handle: (services, deviceId, params) => services.comments.editThingComment({ thingId: deviceId, ...params })
  },
  deleteComment: {
    service: 'comments',
    handle: (services, deviceId, params) => services.comments.deleteThingComment({ thingId: deviceId, ...params })
  }
}

// Contract entries for the built-in commands, merged into the published
// capability payload — the Kernel dispatcher rejects commands that are not
// declared (ERR_COMMAND_NOT_IN_CAPABILITIES).
const COMMAND_CONTRACT_ENTRIES = {
  registerThing: {
    name: 'registerThing',
    description: 'Register a new device config. Takes effect on runtime restart.',
    params: [
      { name: 'info', type: 'object' },
      { name: 'opts', type: 'object' }
    ]
  },
  updateThing: {
    name: 'updateThing',
    description: 'Update a persisted device config. Takes effect on runtime restart.',
    params: [
      { name: 'info', type: 'object' },
      { name: 'opts', type: 'object' }
    ]
  },
  forgetThings: {
    name: 'forgetThings',
    description: 'Remove persisted device configs. Takes effect on runtime restart.',
    params: [
      { name: 'query', type: 'object' }
    ]
  },
  saveSettings: {
    name: 'saveSettings',
    description: 'Update worker settings.',
    params: []
  },
  saveComment: {
    name: 'saveComment',
    description: 'Add a comment to a device.',
    params: [
      { name: 'comment', type: 'string' },
      { name: 'user', type: 'string' }
    ]
  },
  editComment: {
    name: 'editComment',
    description: 'Edit an existing comment.',
    params: [
      { name: 'id', type: 'string' },
      { name: 'comment', type: 'string' },
      { name: 'user', type: 'string' }
    ]
  },
  deleteComment: {
    name: 'deleteComment',
    description: 'Delete a comment.',
    params: [
      { name: 'id', type: 'string' },
      { name: 'user', type: 'string' }
    ]
  }
}

function telemetryBuiltin (services, type) {
  if (!services) return null
  const entry = TELEMETRY_BUILTINS[type]
  return entry && services[entry.service] ? entry : null
}

function commandBuiltin (services, command) {
  if (!services) return null
  const entry = COMMAND_BUILTINS[command]
  return entry && services[entry.service] ? entry : null
}

/**
 * Returns the contract to publish: the plugin contract plus one command
 * entry per active built-in. The input contract is not mutated; without
 * services (or when every built-in is inactive) it is returned as-is.
 */
function mergeBuiltinCommands (contract, services) {
  if (!services) return contract

  const extra = Object.keys(COMMAND_BUILTINS)
    .filter((name) => commandBuiltin(services, name))
    .map((name) => COMMAND_CONTRACT_ENTRIES[name])
  if (!extra.length) return contract

  const copy = JSON.parse(JSON.stringify(contract))
  copy.capabilities.commands = [...(copy.capabilities.commands || []), ...extra]
  return copy
}

module.exports = { telemetryBuiltin, commandBuiltin, mergeBuiltinCommands }
