'use strict'

const { IPCClient } = require('./lib/ipc-client')
const { build } = require('../ork/lib/protocol/envelope')
const { ACTIONS, MESSAGE_TYPES } = require('../ork/lib/protocol/actions')

/**
 * createMdkClient
 *
 * Factory for an MDK protocol client. Opens a persistent connection to the
 * ORK IPC gateway and exposes typed request helpers for every App Node → ORK
 * action defined in the MDK protocol.
 *
 * @param {object} opts
 * @param {string} opts.ipc  - Path to the ORK Unix socket
 * @returns {object} MDK client with connect/close and action methods
 */
function createMdkClient (opts) {
  if (!opts || !opts.ipc) throw new Error('ERR_MDK_CLIENT_IPC_PATH_REQUIRED')

  const transport = new IPCClient(opts.ipc)

  function request (action, payload, deviceId) {
    return transport.request(build({
      action,
      type: MESSAGE_TYPES.REQUEST,
      sender: 'app-node',
      deviceId: deviceId || null,
      payload: payload || {}
    }))
  }

  return {
    connect () {
      return transport.connect()
    },

    close () {
      transport.close()
    },

    listWorkers () {
      return request(ACTIONS.WORKER_LIST)
    },

    getCapabilities (deviceId) {
      return request(ACTIONS.DEVICE_CAPABILITIES, {}, deviceId)
    },

    pullTelemetry (deviceId, queryType) {
      return request(ACTIONS.TELEMETRY_PULL, { query: { type: queryType || 'metrics' } }, deviceId)
    },

    pullState (deviceId) {
      return request(ACTIONS.STATE_PULL, {}, deviceId)
    },

    sendCommand (deviceId, command, params) {
      return request(ACTIONS.COMMAND_REQUEST, { command, params: params || {}, requesterId: 'app-node' }, deviceId)
    },

    terminateWorker (workerId) {
      return request(ACTIONS.WORKER_TERMINATE, { workerId })
    }
  }
}

module.exports = { createMdkClient }
