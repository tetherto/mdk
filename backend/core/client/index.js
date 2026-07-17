'use strict'

const { HRPCClient } = require('./lib/hrpc-client')
const { build } = require('../kernel/lib/protocol/envelope')
const { ACTIONS, MESSAGE_TYPES } = require('../kernel/lib/protocol/actions')

/**
 * createMdkClient
 *
 * Factory for an MDK protocol client. Opens a persistent connection to a Kernel
 * listener and exposes typed request helpers for every Gateway → Kernel action
 * defined in the MDK protocol. Transport is the RPC listener (HRPC) over
 * Hyperswarm: `opts.hrpc = { key }`.
 *
 * @param {object} opts
 * @param {object} [opts.hrpc]     - HRPC transport opts ({ key, seed?, bootstrap?, dht?, rpc? })
 * @param {object} [opts.transport] - Pre-built transport ({ connect, close, request }); test seam
 * @returns {object} Client with connect/close and action methods
 */
function createMdkClient (opts) {
  const transport = _createTransport(opts)

  function request (action, payload, deviceId) {
    return transport.request(build({
      action,
      type: MESSAGE_TYPES.REQUEST,
      sender: 'gateway',
      deviceId: deviceId || null,
      payload: payload || {}
    }))
  }

  const client = {
    // Opt-in warmup issues a best-effort listWorkers() after connecting so the
    // first real request is stable. Never throws — commands must not be retried.
    async connect ({ warmup = false, warmupRetries = 3, warmupDelayMs = 600 } = {}) {
      await transport.connect()
      if (!warmup) return
      for (let i = 0; i < warmupRetries; i++) {
        try {
          await client.listWorkers()
          return
        } catch (err) {
          if (i === warmupRetries - 1) return
          await _sleep(warmupDelayMs)
        }
      }
    },

    close () {
      return transport.close()
    },

    // Read-only WORKER_LIST aggregator. Retries are safe here because it only
    // reads; command ops are never retried (the Kernel dedups, not the transport).
    async getStatus ({ retries = 3, retryDelayMs = 600, timeoutMs = 8000 } = {}) {
      let lastErr
      for (let i = 0; i < retries; i++) {
        try {
          const resp = await _withTimeout(client.listWorkers(), timeoutMs, 'ERR_MDK_STATUS_TIMEOUT')
          const workers = (resp && resp.workers) || []
          return {
            workers: workers.map((w) => ({
              workerId: w.workerId,
              state: w.state,
              healthState: w.healthState,
              deviceIds: w.deviceIds || [],
              deviceCount: (w.deviceIds || []).length,
              rpcKey: w.rpcKey
            })),
            totalDevices: workers.reduce((n, w) => n + ((w.deviceIds || []).length), 0)
          }
        } catch (err) {
          lastErr = err
          if (i < retries - 1) await _sleep(retryDelayMs)
        }
      }
      throw lastErr
    },

    // Poll until `count` workers are READY (with ≥1 device unless requireDevices
    // is false), or throw ERR_MDK_WAIT_WORKERS_TIMEOUT. retries:1 leaves the poll
    // cadence to this loop.
    async waitForWorkers ({ count = 1, requireDevices = true, timeoutMs = 30000, intervalMs = 1000 } = {}) {
      const start = Date.now()
      while (Date.now() - start < timeoutMs) {
        const { workers } = await client.getStatus({ retries: 1 }).catch(() => ({ workers: [] }))
        const ready = workers.filter((w) => w.state === 'READY' && (!requireDevices || (w.deviceIds || []).length > 0))
        if (ready.length >= count) return ready
        await _sleep(intervalMs)
      }
      throw new Error('ERR_MDK_WAIT_WORKERS_TIMEOUT')
    },

    // Poll until `deviceId` appears in the registry (optionally under a specific
    // worker), or throw ERR_MDK_WAIT_DEVICE_TIMEOUT.
    async waitForDevice (deviceId, { workerId = null, timeoutMs = 30000, intervalMs = 1000 } = {}) {
      const start = Date.now()
      while (Date.now() - start < timeoutMs) {
        const { workers } = await client.getStatus({ retries: 1 }).catch(() => ({ workers: [] }))
        const hit = workers.some((w) => (!workerId || w.workerId === workerId) && (w.deviceIds || []).includes(deviceId))
        if (hit) return true
        await _sleep(intervalMs)
      }
      throw new Error('ERR_MDK_WAIT_DEVICE_TIMEOUT')
    },

    listWorkers () {
      return request(ACTIONS.WORKER_LIST)
    },

    getCapabilities (deviceId) {
      return request(ACTIONS.DEVICE_CAPABILITIES, {}, deviceId)
    },

    pullTelemetry (deviceId, query) {
      // query may be a string (the query type) or a full query object
      // ({ type, key, tag, start, end, limit, ... }) forwarded to the worker.
      const q = (query && typeof query === 'object')
        ? { type: 'metrics', ...query }
        : { type: query || 'metrics' }
      return request(ACTIONS.TELEMETRY_PULL, { query: q }, deviceId)
    },

    pullState (deviceId) {
      return request(ACTIONS.STATE_PULL, {}, deviceId)
    },

    sendCommand (deviceId, command, params) {
      return request(ACTIONS.COMMAND_REQUEST, { command, params: params || {}, requesterId: 'gateway' }, deviceId)
    },

    // Resolve a worker's RPC public key (hex) from the Kernel registry, or null.
    async getWorkerKey (workerId) {
      const { workers } = await client.getStatus()
      const w = workers.find((x) => x.workerId === workerId)
      return (w && w.rpcKey) || null
    },

    // Resolve the worker's key, open a short-lived worker client, send the
    // command, close. For adapter-handled ops (registerThing/forgetThings/...).
    // Throws ERR_MDK_WORKER_KEY_UNKNOWN if the worker isn't registered.
    async sendWorkerCommand (workerId, deviceId, command, params, { hrpc = {} } = {}) {
      const key = await client.getWorkerKey(workerId)
      if (!key) throw new Error('ERR_MDK_WORKER_KEY_UNKNOWN')
      const wc = createWorkerClient(key, hrpc)
      await wc.connect()
      try {
        return await wc.sendCommand(deviceId, command, params)
      } finally {
        await wc.close()
      }
    },

    terminateWorker (workerId) {
      return request(ACTIONS.WORKER_TERMINATE, { workerId })
    },

    pushAction ({ query, action, params, voter, authPerms, batchActionUID }) {
      return request(ACTIONS.ACTION_PUSH, { query, action, params, voter, authPerms, batchActionUID })
    },

    pushActionsBatch ({ batchActionsPayload, voter, authPerms, batchActionUID, suffix }) {
      return request(ACTIONS.ACTION_PUSH_BATCH, { batchActionsPayload, voter, authPerms, batchActionUID, suffix })
    },

    getAction ({ id, type }) {
      return request(ACTIONS.ACTION_GET, { id, type })
    },

    getActionsBatch ({ ids }) {
      return request(ACTIONS.ACTION_GET_BATCH, { ids })
    },

    queryActions ({ queries, suffix, groupBatch }) {
      return request(ACTIONS.ACTION_QUERY, { queries, suffix, groupBatch })
    },

    voteAction ({ id, voter, approve, authPerms }) {
      return request(ACTIONS.ACTION_VOTE, { id, voter, approve, authPerms })
    },

    cancelActionsBatch ({ ids, voter }) {
      return request(ACTIONS.ACTION_CANCEL_BATCH, { ids, voter })
    }
  }

  return client
}

// A client bound directly to a worker by its RPC public key — same surface as
// the Kernel client, for ops the worker adapter handles directly.
function createWorkerClient (rpcKey, hrpcOpts = {}) {
  return createMdkClient({ hrpc: { key: rpcKey, ...hrpcOpts } })
}

function _createTransport (opts) {
  // `transport` is an injection seam (tests): any { connect, close, request }.
  if (opts && opts.transport) return opts.transport
  if (opts && opts.hrpc) return new HRPCClient(opts.hrpc)
  throw new Error('ERR_MDK_CLIENT_TRANSPORT_REQUIRED')
}

function _sleep (ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function _withTimeout (promise, ms, errCode) {
  let timer
  const timeout = new Promise((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(errCode)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

module.exports = { createMdkClient, createWorkerClient }
