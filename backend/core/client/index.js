'use strict'

const { HRPCClient } = require('./lib/hrpc-client')
const { build } = require('@tetherto/mdk-kernel/protocol/envelope')
const { ACTIONS, MESSAGE_TYPES } = require('@tetherto/mdk-kernel/protocol/actions')
const { ServiceAccountTokenSource } = require('@tetherto/mdk-identity')

/**
 * createRawMdkClient
 *
 * Low-level factory for an MDK protocol client. Opens a persistent connection
 * to a Kernel listener and exposes typed request helpers for every
 * Gateway → Kernel action defined in the MDK protocol. Transport is the RPC
 * listener (HRPC) over Hyperswarm: `opts.hrpc = { key }`. The caller owns the
 * lifecycle: call connect() before the first request. Most consumers want
 * createMdkClient instead, which connects itself.
 *
 * Every action method takes an optional trailing `callOpts` ({ timeout } in
 * ms) that overrides the transport's default per-request timeout (30 s) for
 * that call.
 *
 * The Kernel authorizes every request by an access token. With
 * `opts.credential` (a service account's `{ name, privateKey }`) the client
 * signs in itself, keeps a valid token, and sends it with every request but
 * sign-in; `opts.tokenSource` (`{ getToken, reset }`) plugs in any other
 * source, such as a user session. A request the Kernel refuses for its token
 * is retried once with a fresh one.
 *
 * @param {object} opts
 * @param {object} [opts.hrpc]     - HRPC transport opts ({ key, keyPair?, seed?, bootstrap?, dhtHost?, timeout?, envelope?, dht?, rpc? })
 * @param {object} [opts.transport] - Pre-built transport ({ connect, close, request }); test seam
 * @param {{ name: string, privateKey: string }} [opts.credential] - service-account credential
 * @param {{ getToken: () => Promise<string>, reset: () => void }} [opts.tokenSource]
 * @returns {object} Client with connect/close and action methods
 */
function createRawMdkClient (opts) {
  const transport = _createTransport(opts)

  function send (action, payload, deviceId, callOpts, auth, actor) {
    return transport.request(build({
      action,
      type: MESSAGE_TYPES.REQUEST,
      sender: 'gateway',
      deviceId: deviceId || null,
      payload: payload || {},
      ...(auth ? { auth } : {}),
      ...(actor ? { actor } : {})
    }), _callOpts(callOpts))
  }

  const tokenSource = opts.tokenSource || (opts.credential
    ? new ServiceAccountTokenSource({
      name: opts.credential.name,
      privateKey: opts.credential.privateKey,
      ...(opts.credential.audience ? { audience: opts.credential.audience } : {}),
      request: (action, payload) => send(action, payload, null, {})
    })
    : null)

  // `actor`: the operator's access token, sent beside this client's own (see withActor).
  async function request (action, payload, deviceId, callOpts, actor) {
    if (action.startsWith('auth.')) return _raiseRefusal(await send(action, payload, deviceId, callOpts))
    if (!tokenSource) return _raiseRefusal(await send(action, payload, deviceId, callOpts, null, actor))
    let res = await send(action, payload, deviceId, callOpts, await tokenSource.getToken(), actor)
    // Refused before the action ran (expired, rotated key), so a retry is safe.
    // An invalid actor token is the operator's to renew: it is not retried.
    if (res && typeof res.error === 'string' && res.error.startsWith('ERR_KERNEL_TOKEN_INVALID')) {
      tokenSource.reset()
      res = await send(action, payload, deviceId, callOpts, await tokenSource.getToken(), actor)
    }
    return _raiseRefusal(res)
  }

  // A client bound to a Worker that dials with this client's identity (and,
  // once connected, over this client's own DHT node), so a Worker allowlist
  // that admits the Kernel-facing key admits these too. Explicit identity or
  // transport opts in `hrpc` replace the inherited ones.
  function workerClient (key, hrpc) {
    const inherited = typeof transport.childOpts === 'function' ? transport.childOpts() : {}
    if (hrpc.rpc || hrpc.dht || hrpc.keyPair || hrpc.seed) {
      delete inherited.rpc
      delete inherited.dht
    }
    return createWorkerClient(key, { ...inherited, ...hrpc })
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
          const resp = await _withTimeout(client.listWorkers({ timeout: timeoutMs }), timeoutMs, 'ERR_MDK_STATUS_TIMEOUT')
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

    // Resolve a worker's RPC public key (hex) from the Kernel registry, or null.
    async getWorkerKey (workerId) {
      const { workers } = await client.getStatus()
      const w = workers.find((x) => x.workerId === workerId)
      return (w && w.rpcKey) || null
    },

    // Resolve the worker's key, open a short-lived worker client, send the
    // command, close. For adapter-handled ops (registerThing/forgetThings/...).
    // Throws ERR_MDK_WORKER_KEY_UNKNOWN if the worker isn't registered.
    async sendWorkerCommand (workerId, deviceId, command, params, { hrpc = {}, timeout } = {}) {
      const key = await client.getWorkerKey(workerId)
      if (!key) throw new Error('ERR_MDK_WORKER_KEY_UNKNOWN')
      const wc = workerClient(key, hrpc)
      await wc.connect()
      try {
        return await wc.sendCommand(deviceId, command, params, { timeout })
      } finally {
        await wc.close()
      }
    },

    // Worker-scoped telemetry pull (logs, logs_multi, list, stats, ext_data —
    // the worker-infra queries that aggregate over a worker's own store rather
    // than one device). Same key-resolve/short-lived-client shape as
    // sendWorkerCommand; resolves with the bare telemetry payload.
    async pullWorkerTelemetry (workerId, query, { hrpc = {}, timeout } = {}) {
      const key = await client.getWorkerKey(workerId)
      if (!key) throw new Error('ERR_MDK_WORKER_KEY_UNKNOWN')
      const wc = workerClient(key, hrpc)
      await wc.connect()
      try {
        const res = await wc.pullTelemetry(null, query, { timeout })
        return res && res.payload !== undefined ? res.payload : res
      } finally {
        await wc.close()
      }
    },

    /**
     * The same Kernel actions, made for an operator: each request carries the
     * operator's access token (`envelope.actor`) beside this client's own, and
     * the Kernel allows it only when spec.rbac allows both. For an app runtime
     * serving a Gateway request (see req.mdk); the token is not readable back.
     */
    withActor (actorToken) {
      if (typeof actorToken !== 'string' || !actorToken) throw new Error('ERR_MDK_CLIENT_ACTOR_REQUIRED')
      return Object.freeze(_kernelActions((action, payload, deviceId, callOpts) => request(action, payload, deviceId, callOpts, actorToken)))
    },

    ..._kernelActions(request)
  }

  return client
}

// The Kernel request wrappers, over `request(action, payload, deviceId, callOpts)`.
function _kernelActions (request) {
  return {
    listWorkers (callOpts) {
      return request(ACTIONS.WORKER_LIST, {}, null, callOpts)
    },

    getCapabilities (deviceId, callOpts) {
      return request(ACTIONS.DEVICE_CAPABILITIES, {}, deviceId, callOpts)
    },

    pullTelemetry (deviceId, query, callOpts) {
      // query may be a string (the query type) or a full query object
      // ({ type, key, tag, start, end, limit, ... }) forwarded to the worker.
      const q = (query && typeof query === 'object')
        ? { type: 'metrics', ...query }
        : { type: query || 'metrics' }
      return request(ACTIONS.TELEMETRY_PULL, { query: q }, deviceId, callOpts)
    },

    pullState (deviceId, callOpts) {
      return request(ACTIONS.STATE_PULL, {}, deviceId, callOpts)
    },

    sendCommand (deviceId, command, params, callOpts) {
      return request(ACTIONS.COMMAND_REQUEST, { command, params: params || {} }, deviceId, callOpts)
    },

    getCommandStatus (commandId, callOpts) {
      return request(ACTIONS.COMMAND_STATUS, { commandId }, null, callOpts)
    },

    // Write-command log, newest first; admin callers only.
    getCommandLog ({ start, end, limit } = {}, callOpts) {
      return request(ACTIONS.COMMAND_LOG, { start, end, limit }, null, callOpts)
    },

    terminateWorker (workerId, callOpts) {
      return request(ACTIONS.WORKER_TERMINATE, { workerId }, null, callOpts)
    },

    /** The RBAC record in force: `{ record: { version, appliedAt, source, policy, ... } | null }`. Admin only. */
    getRbac (callOpts) {
      return request(ACTIONS.RBAC_GET, {}, null, callOpts)
    },

    /**
     * Apply spec.rbac (null = deny-all). Resolves `{ changed, version, appliedAt, previous? }`,
     * or `{ error, errors? }` when the Kernel refuses it (the policy in force is kept). Admin only.
     */
    applyRbac (rbac, callOpts) {
      return request(ACTIONS.RBAC_APPLY, { rbac }, null, callOpts)
    },

    // Sign-in. Each resolves `{ tokenType, accessToken, expiresIn, refreshToken, refreshExpiresIn }`,
    // or `{ error }` when the issuer refuses (ERR_IDENTITY_*).

    /** Password sign-in for a user. */
    login (username, password, callOpts) {
      return request(ACTIONS.AUTH_LOGIN, { username, password }, null, callOpts)
    },

    /** Trade a refresh token for new tokens; the old one is used up. */
    refreshToken (refreshToken, callOpts) {
      return request(ACTIONS.AUTH_REFRESH, { refreshToken }, null, callOpts)
    },

    /**
     * Service-account sign-in with an assertion (see createAssertion in
     * @tetherto/mdk-identity). Tokens are bound to this client's key unless `bind: false`.
     */
    serviceAccountToken (assertion, { bind } = {}, callOpts) {
      return request(ACTIONS.AUTH_TOKEN, { assertion, ...(bind === false ? { bind: false } : {}) }, null, callOpts)
    },

    /** End the session a refresh token belongs to: `{ revoked }`. */
    logout (refreshToken, callOpts) {
      return request(ACTIONS.AUTH_LOGOUT, { refreshToken }, null, callOpts)
    },

    /** The issuer's public keys, for verifying access tokens: `{ keys }`. */
    getJwks (callOpts) {
      return request(ACTIONS.AUTH_JWKS, {}, null, callOpts)
    },

    // Identity administration (admin only).

    listUsers (callOpts) {
      return request(ACTIONS.IDENTITY_USER_LIST, {}, null, callOpts)
    },

    /** Create or update a user: `{ name, email?, groups?, password?, disabled? }`. */
    upsertUser (user, callOpts) {
      return request(ACTIONS.IDENTITY_USER_UPSERT, user, null, callOpts)
    },

    deleteUser (name, callOpts) {
      return request(ACTIONS.IDENTITY_USER_DELETE, { name }, null, callOpts)
    },

    listServiceAccounts (callOpts) {
      return request(ACTIONS.IDENTITY_SA_LIST, {}, null, callOpts)
    },

    /** Register a service account's public key: `{ name, publicKey }`. */
    upsertServiceAccount (serviceAccount, callOpts) {
      return request(ACTIONS.IDENTITY_SA_UPSERT, serviceAccount, null, callOpts)
    },

    deleteServiceAccount (name, callOpts) {
      return request(ACTIONS.IDENTITY_SA_DELETE, { name }, null, callOpts)
    },

    rotateSigningKey (callOpts) {
      return request(ACTIONS.IDENTITY_KEYS_ROTATE, {}, null, callOpts)
    },

    pushAction ({ query, action, params, voter, authPerms, batchActionUID }, callOpts) {
      return request(ACTIONS.ACTION_PUSH, { query, action, params, voter, authPerms, batchActionUID }, null, callOpts)
    },

    pushActionsBatch ({ batchActionsPayload, voter, authPerms, batchActionUID, suffix }, callOpts) {
      return request(ACTIONS.ACTION_PUSH_BATCH, { batchActionsPayload, voter, authPerms, batchActionUID, suffix }, null, callOpts)
    },

    getAction ({ id, type }, callOpts) {
      return request(ACTIONS.ACTION_GET, { id, type }, null, callOpts)
    },

    getActionsBatch ({ ids }, callOpts) {
      return request(ACTIONS.ACTION_GET_BATCH, { ids }, null, callOpts)
    },

    queryActions ({ queries, suffix, groupBatch }, callOpts) {
      return request(ACTIONS.ACTION_QUERY, { queries, suffix, groupBatch }, null, callOpts)
    },

    voteAction ({ id, voter, approve, authPerms }, callOpts) {
      return request(ACTIONS.ACTION_VOTE, { id, voter, approve, authPerms }, null, callOpts)
    },

    cancelActionsBatch ({ ids, voter }, callOpts) {
      return request(ACTIONS.ACTION_CANCEL_BATCH, { ids, voter }, null, callOpts)
    }
  }
}

// A client bound directly to a worker by its RPC public key — same surface as
// the Kernel client, for ops the worker adapter handles directly. Worker
// replies are MDK envelopes and are validated as such (ERR_MDK_RESPONSE_INVALID).
// Called on its own it dials with whatever identity `hrpcOpts` names (a random
// one if none); sendWorkerCommand/pullWorkerTelemetry pass the parent's.
function createWorkerClient (rpcKey, hrpcOpts = {}) {
  return createRawMdkClient({ hrpc: { envelope: true, ...hrpcOpts, key: rpcKey } })
}

/**
 * createMdkClient
 *
 * The client most consumers want: instantiate once from an ambient plugin
 * config ({ kernelKey, kernelKeyPair, kernelBootstrap, kernelDhtHost }) and call action methods directly —
 * `mdkClient.listWorkers()` — like any connection-pooling DB client. The
 * first call connects (memoized); a failed connect resets the memo so the
 * next request retries. A host booted without a reachable Kernel keeps its
 * routes up and fails per request with `opts.errorCode`
 * (default ERR_MDK_CLIENT_UNAVAILABLE).
 *
 * connect() is optional (explicit warm-up); close() tears the connection
 * down and lets a later call reconnect.
 *
 * @param {object} config - Ambient plugin config; reads kernelKey/kernelKeyPair/kernelBootstrap/kernelDhtHost and
 *                          kernelCredential (`{ name, privateKey }`, the service account to sign in as)
 * @param {object} [opts]
 * @param {string} [opts.errorCode]  - ERR_ code for missing key / failed connect / failed Kernel request
 * @param {number} [opts.timeout]    - Default per-request timeout in ms (30000); each call can override it
 * @param {object} [opts.transport]  - Pre-built transport; test seam
 * @param {object} [opts.tokenSource] - Token source instead of `config.kernelCredential` (see createRawMdkClient)
 * @returns {object} Auto-connecting client with the raw client's surface
 */
function createMdkClient (config = {}, opts = {}) {
  const errCode = opts.errorCode || 'ERR_MDK_CLIENT_UNAVAILABLE'
  const auth = {
    ...(config.kernelCredential ? { credential: config.kernelCredential } : {}),
    ...(opts.tokenSource ? { tokenSource: opts.tokenSource } : {})
  }
  const raw = opts.transport
    ? createRawMdkClient({ transport: opts.transport, ...auth })
    : config.kernelKey
      ? createRawMdkClient({
        hrpc: {
          key: config.kernelKey,
          ...(config.kernelKeyPair ? { keyPair: config.kernelKeyPair } : {}),
          ...(config.kernelBootstrap ? { bootstrap: config.kernelBootstrap } : {}),
          ...(config.kernelDhtHost ? { dhtHost: config.kernelDhtHost } : {}),
          ...(opts.timeout !== undefined ? { timeout: opts.timeout } : {})
        },
        ...auth
      })
      : null

  let connecting = null

  const ensure = (connectOpts) => {
    if (!raw) {
      const err = new Error(errCode)
      err.code = errCode
      return Promise.reject(err)
    }
    if (!connecting) {
      connecting = raw.connect(connectOpts).then(() => raw, (err) => {
        connecting = null
        const wrapped = new Error(`${errCode}: ${err.message}`)
        wrapped.code = errCode
        throw wrapped
      })
    }
    return connecting
  }

  // Every method access resolves against the connected raw client, so the
  // connection is established exactly once, on first use — `then` must stay
  // undefined or awaiting the client itself would treat it as a thenable.
  // withActor(token) is synchronous: a view whose calls connect the same way.
  const methods = (resolve) => new Proxy({}, {
    get (_target, prop) {
      if (typeof prop !== 'string' || prop === 'then') return undefined
      if (resolve === ensure) {
        if (prop === 'connect') return (connectOpts) => ensure(connectOpts).then(() => undefined)
        if (prop === 'close') {
          return async () => {
            if (!raw || !connecting) return
            connecting = null
            await raw.close()
          }
        }
        if (prop === 'withActor') {
          return (actorToken) => {
            if (typeof actorToken !== 'string' || !actorToken) throw new Error('ERR_MDK_CLIENT_ACTOR_REQUIRED')
            return methods(() => ensure().then((client) => client.withActor(actorToken)))
          }
        }
      }
      return async (...args) => {
        const client = await resolve()
        // Own methods only: inherited Object.prototype members (constructor,
        // toString, __proto__ ...) are not client actions.
        if (!Object.hasOwn(client, prop) || typeof client[prop] !== 'function') {
          throw new Error(`ERR_MDK_CLIENT_NO_SUCH_METHOD: ${prop}`)
        }
        try {
          return await client[prop](...args)
        } catch (err) {
          if (/^ERR_/.test(err.code || err.message)) throw err
          const wrapped = new Error(`${errCode}: ${err.message}`, { cause: err })
          wrapped.code = errCode
          throw wrapped
        }
      }
    }
  })
  return methods(ensure)
}

function _createTransport (opts) {
  // `transport` is an injection seam (tests): any { connect, close, request }.
  if (opts && opts.transport) return opts.transport
  if (opts && opts.hrpc) return new HRPCClient(opts.hrpc)
  throw new Error('ERR_MDK_CLIENT_TRANSPORT_REQUIRED')
}

// An authorization refusal is thrown, never returned: a caller reading
// `res.workers || []` must not mistake "you may not" for "there are none".
// Every other Kernel error stays a `{ error }` reply, as the protocol has it.
const REFUSAL = /^ERR_KERNEL_(ACTION_FORBIDDEN|TOKEN_REQUIRED|TOKEN_INVALID|ACTOR_INVALID)\b/

function _raiseRefusal (res) {
  if (res && typeof res.error === 'string' && REFUSAL.test(res.error)) {
    const err = new Error(res.error)
    err.code = res.error.split(':')[0]
    throw err
  }
  return res
}

// Only `timeout` is forwarded; an absent one leaves the transport default.
function _callOpts (callOpts) {
  return callOpts && callOpts.timeout !== undefined ? { timeout: callOpts.timeout } : {}
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

module.exports = { createMdkClient, createRawMdkClient, createWorkerClient }
