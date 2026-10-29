'use strict'

const crypto = require('crypto')
const EventEmitter = require('events')
const fs = require('fs')
const http = require('http')
const path = require('path')
const util = require('util')
const createDebug = require('debug')
const HyperswarmRPC = require('@hyperswarm/rpc')
const DHT = require('hyperdht')
const { createMdkClient } = require('@tetherto/mdk-client')
const { loadPlugin } = require('./plugin-loader')
const { loadAppManifest, resolvePluginDir } = require('./manifest')
const protocol = require('./protocol')

const { METHODS, STREAM_MESSAGES: MSG, ERR } = protocol

const LEVELS = ['error', 'warn', 'info', 'debug', 'trace', 'fatal']

// Default logger: error/warn/info/debug/trace/fatal + child(). error, fatal and
// warn always reach stderr (a failing controller must not go unnoticed); the
// rest print only under DEBUG=mdk:app:<name> (or a wildcard). Accepts
// pino-style calls too (`logger.info({ k: 1 }, 'msg')`).
const ALWAYS = new Set(['error', 'fatal', 'warn'])

function _debugLogger (dbg) {
  const logger = {}
  for (const level of LEVELS) {
    logger[level] = (...args) => {
      if (!dbg.enabled) {
        if (ALWAYS.has(level)) process.stderr.write(`${dbg.namespace} [${level}] ${util.format(...args)}\n`)
        return
      }
      const [first, second, ...rest] = args
      if (first && typeof first === 'object' && typeof second === 'string') {
        dbg('[%s] %s %o', level, second, first, ...rest)
      } else if (typeof first === 'string') {
        dbg('[%s] ' + first, level, ...(second === undefined ? [] : [second]), ...rest)
      } else {
        dbg('[%s] %o', level, ...args)
      }
    }
  }
  logger.child = (bindings) => {
    const suffix = bindings && (bindings.name || bindings.component)
    return suffix ? _debugLogger(dbg.extend(String(suffix))) : logger
  }
  return logger
}

function defaultLogger (name) {
  return _debugLogger(createDebug(`mdk:app:${name}`))
}

// Written whole (temp file + rename) so a reader never sees half a key. A new
// directory is owner-only, as the trusted-keys reader expects. The temp name is
// random and created exclusively ('wx'), so nothing planted at a guessable path
// (a symlink, another user's file) is written through or renamed into place.
function _writeKeyFile (file, key) {
  const target = path.resolve(file)
  fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 })
  const tmp = `${target}.${crypto.randomBytes(8).toString('hex')}.tmp`
  try {
    fs.writeFileSync(tmp, key.toString('hex'), { mode: 0o644, flag: 'wx' })
    if (process.platform !== 'win32') fs.chmodSync(tmp, 0o644)
    fs.renameSync(tmp, target)
  } catch (err) {
    try { fs.unlinkSync(tmp) } catch {}
    throw err
  }
}

// Removes a key file only while it still names this runtime: a newer runtime
// may have replaced it.
function _removeKeyFile (file, key) {
  try {
    if (fs.readFileSync(file, 'utf8').trim() === key.toString('hex')) fs.unlinkSync(file)
  } catch {}
}

// A 32-byte secret seed persisted at `file` (dir 0o700, file 0o600) so an
// identity survives restarts; a looser mode on an existing file is tightened.
function getOrCreateSeed (file) {
  const dir = path.dirname(file)

  const read = () => {
    let seed
    try {
      seed = fs.readFileSync(file)
    } catch (err) {
      if (err.code === 'ENOENT') return null
      throw err
    }
    if (seed.length !== 32) throw new Error(`ERR_APP_RUNTIME_SEED_INVALID: ${file} must hold exactly 32 bytes`)
    if (process.platform !== 'win32' && (fs.statSync(file).mode & 0o077) !== 0) fs.chmodSync(file, 0o600)
    return seed
  }

  const existing = read()
  if (existing) return existing

  fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
  const seed = crypto.randomBytes(32)
  try {
    fs.writeFileSync(file, seed, { mode: 0o600, flag: 'wx' })
  } catch (err) {
    // Another process created it between the read and the write: use its seed.
    if (err.code === 'EEXIST') return read()
    throw err
  }
  return seed
}

// Seeds live in <storeDir>/identity. Without a storeDir every start gets a fresh random seed.
function _storeSeed (storeDir, name) {
  return storeDir ? getOrCreateSeed(path.join(storeDir, 'identity', name)) : crypto.randomBytes(32)
}

// The keypair handed to createMdkClient. The secret key is non-enumerable so
// that logging, spreading or serializing the config cannot leak it.
function _kernelKeyPair (seed) {
  const { publicKey, secretKey } = DHT.keyPair(seed)
  const keyPair = { publicKey }
  Object.defineProperty(keyPair, 'secretKey', { value: secretKey, enumerable: false })
  return Object.freeze(keyPair)
}

// Firewall: hyperdht blocks a connection when this returns true (or throws).
// Unlike the Kernel listener, an empty allow set denies everyone: a runtime
// executes app code for whoever reaches it. Key files are re-read on every
// connection, so the Gateway may publish its key before or after this starts;
// an unreadable file contributes no keys.
//
// A key in an allowed key file is a full-trust caller (it skips the Gateway's
// auth and sets `identity`), so a file is only read when nobody else could have
// written it: a regular file, not a symlink, owned by this process's user and
// not group/world-writable (0644 is fine). Anything else is skipped with one
// warning, as mdk-core's trusted-keys reader does. Each entry must be a
// 32-byte key in hex; other tokens are ignored.

const KEY_HEX = /^[0-9a-f]{64}$/
const O_NOFOLLOW = fs.constants.O_NOFOLLOW || 0
const O_NONBLOCK = fs.constants.O_NONBLOCK || 0

function _normalizeKey (k) {
  if (Buffer.isBuffer(k)) return k.toString('hex')
  return typeof k === 'string' ? k.trim().toLowerCase() : ''
}

// Why `st` may not be trusted as a key file, or null when it may.
function _untrustedReason (st) {
  if (st.isSymbolicLink()) return 'is a symlink'
  if (!st.isFile()) return 'is not a regular file'
  if (process.platform !== 'win32') {
    if (typeof process.getuid === 'function' && st.uid !== process.getuid()) return 'is owned by another user'
    if (st.mode & 0o022) return 'is group/world-writable'
  }
  return null
}

// Returns { keys } for a trusted file (keys = valid hex keys in it), or
// { reason } when the file is untrusted, or { keys: [] } when it is absent or unreadable.
async function _readKeyFile (file) {
  let fh = null
  try {
    const st = await fs.promises.lstat(file)
    const reason = _untrustedReason(st)
    if (reason) return { reason }
    // O_NOFOLLOW/O_NONBLOCK and the inode check close the gap between lstat and
    // open: a file swapped for a symlink or a FIFO meanwhile is refused.
    fh = await fs.promises.open(file, fs.constants.O_RDONLY | O_NOFOLLOW | O_NONBLOCK)
    const fst = await fh.stat()
    if (fst.dev !== st.dev || fst.ino !== st.ino) return { reason: 'changed while being read' }
    const fstReason = _untrustedReason(fst)
    if (fstReason) return { reason: fstReason }
    const text = await fh.readFile('utf8')
    return { keys: text.split(/\s+/).map(_normalizeKey).filter((k) => KEY_HEX.test(k)) }
  } catch (err) {
    if (err && err.code === 'ELOOP') return { reason: 'is a symlink' }
    return { keys: [] }
  } finally {
    if (fh) await fh.close().catch(() => {})
  }
}

function buildFirewall ({ allowedKeys, allowedKeyFiles, logger }) {
  const staticKeys = (allowedKeys || []).map(_normalizeKey).filter((k) => KEY_HEX.test(k))
  const files = allowedKeyFiles || []
  // file -> the reason last warned about, so a bad file warns once, not per connection.
  const warned = new Map()

  return async (remotePublicKey) => {
    const hex = Buffer.from(remotePublicKey).toString('hex')
    if (staticKeys.includes(hex)) return false

    for (const file of files) {
      const { keys, reason } = await _readKeyFile(file)
      if (reason) {
        if (warned.get(file) !== reason) {
          warned.set(file, reason)
          logger.warn('ignoring allowed key file %s: it %s', file, reason)
        }
        continue
      }
      warned.delete(file)
      if (keys.includes(hex)) return false
    }

    logger.warn('blocked connection from %s...', hex.slice(0, 16))
    return true
  }
}

// The ServerResponse-like `raw` a stream handler receives: bridges
// writeHead/write/end onto the `app.stream` channel.

class StreamResponse extends EventEmitter {
  constructor (channel) {
    super()
    this._channel = channel
    this._headers = new Map()
    this.statusCode = 200
    this.headersSent = false
    this.writableEnded = false
    this.destroyed = false
    this._closeEmitted = false
  }

  get writableFinished () { return this.writableEnded }
  get finished () { return this.writableEnded }

  setHeader (name, value) { this._headers.set(String(name).toLowerCase(), value); return this }
  getHeader (name) { return this._headers.get(String(name).toLowerCase()) }
  hasHeader (name) { return this._headers.has(String(name).toLowerCase()) }
  removeHeader (name) { this._headers.delete(String(name).toLowerCase()) }
  getHeaders () { return Object.fromEntries(this._headers) }

  writeHead (status, headers) {
    if (this.headersSent) return this
    if (Number.isInteger(status)) this.statusCode = status
    if (headers && typeof headers === 'object') {
      for (const [k, v] of Object.entries(headers)) this.setHeader(k, v)
    }
    this.headersSent = true
    this._send(MSG.HEAD, protocol.encode({ statusCode: this.statusCode, headers: this.getHeaders() }))
    return this
  }

  flushHeaders () {
    if (!this.headersSent) this.writeHead(this.statusCode)
  }

  write (chunk, encoding, cb) {
    if (typeof encoding === 'function') { cb = encoding; encoding = undefined }
    if (this.writableEnded || this.destroyed) return false
    this.flushHeaders()
    const buf = _toBuffer(chunk, encoding)
    // false: the connection's outgoing buffer is full; 'drain' follows.
    const ok = buf.length === 0 ? true : this._send(MSG.CHUNK, buf)
    if (typeof cb === 'function') cb()
    return ok
  }

  end (chunk, encoding, cb) {
    if (typeof chunk === 'function') { cb = chunk; chunk = undefined; encoding = undefined }
    if (typeof encoding === 'function') { cb = encoding; encoding = undefined }
    if (this.writableEnded) return this
    if (chunk !== undefined && chunk !== null) this.write(chunk, encoding)
    if (this.destroyed) { this.writableEnded = true; return this }
    this.flushHeaders()
    this.writableEnded = true
    this._send(MSG.END, Buffer.alloc(0))
    // protomux keeps order, so the peer sees END before the close.
    this._channel.close()
    if (typeof cb === 'function') cb()
    this.emit('finish')
    return this
  }

  destroy () {
    if (!this.destroyed) this._channel.close()
    this._markClosed()
    return this
  }

  // The channel (or the connection under it) is gone: remote disconnect, our
  // own end(), or runtime shutdown. 'close' fires once, like ServerResponse's.
  _markClosed () {
    this.destroyed = true
    if (this._closeEmitted) return
    this._closeEmitted = true
    this.emit('close')
  }

  // protomux's send() returns whether the connection's stream is drained.
  _send (type, buf) {
    if (this.destroyed || this._channel.closed) return false
    try {
      return this._channel.messages[type].send(buf) !== false
    } catch {
      return false
    }
  }
}

function _toBuffer (chunk, encoding) {
  if (Buffer.isBuffer(chunk)) return chunk
  if (chunk instanceof Uint8Array) return Buffer.from(chunk)
  if (typeof chunk === 'string') return Buffer.from(chunk, encoding)
  return Buffer.from(String(chunk))
}

// `mdk`: the Kernel client for this request. With a signed-in operator it
// sends their token beside the app's (see withActor in @tetherto/mdk-client),
// so the Kernel authorizes, and records, the operator via the app. The token
// itself is never on `req`.
function _pluginReq (req, identity, mdk) {
  const r = req && typeof req === 'object' ? req : {}
  const out = {
    params: r.params || {},
    query: r.query || {},
    body: r.body,
    headers: r.headers || {},
    _info: identity || {}
  }
  Object.defineProperty(out, 'mdk', { value: mdk, enumerable: false })
  return out
}

/**
 * Runs one app's controllers and serves them over HRPC.
 *
 * Manifest, route table and controllers are loaded synchronously when this is
 * called (so a broken app fails here, not on first request), through the
 * Gateway's plugin loader; the network side only comes up in start(). onReady callbacks run once, after the first
 * successful start(); a stop()/start() cycle does not re-run them.
 *
 * The ambient `config` carries `mdkClient`: one Kernel client the runtime owns,
 * dialing with the app's own transport key (from a persisted seed) and signing
 * in as the app's service account, `app:<name>`, from the credential in
 * `opts.credentialFile` (or `opts.credential`). Plugins never see a Kernel key
 * or the credential, and cannot build a client pointed anywhere else: the
 * Kernel decides what the app may do from spec.rbac.
 *
 * Each request's `req.mdk` is the client for work done for that request. When
 * the Gateway forwarded a signed-in operator's token, it is
 * `mdkClient.withActor(token)`: the Kernel then allows a call only when
 * spec.rbac allows both the app and the operator, and records the operator as
 * the requester (and voter) via the app. Otherwise it is `mdkClient` itself,
 * which also serves background work done as the app alone.
 */
// Kernel wiring belongs to the runtime; these never reach a plugin from config.
const KERNEL_FIELDS = ['kernelKey', 'kernelKeyPair', 'kernelBootstrap', 'kernelDhtHost', 'kernelCredential', 'mdkClient']

function _withoutKernelFields (conf) {
  if (!conf || typeof conf !== 'object') return {}
  const out = { ...conf }
  for (const k of KERNEL_FIELDS) delete out[k]
  return out
}

/**
 * The app's service-account credential: `opts.credential` ({ name, privateKey })
 * or the JSON `opts.credentialFile` the CLI writes ({ name, privateKeyPem }).
 * It must be this app's own account, `app:<name>`.
 */
function _readCredential (opts, appName) {
  let cred = opts.credential || null
  if (!cred && opts.credentialFile) {
    let body
    try {
      body = JSON.parse(fs.readFileSync(opts.credentialFile, 'utf8'))
    } catch (err) {
      throw new Error(`ERR_APP_RUNTIME_CREDENTIAL_UNREADABLE: ${opts.credentialFile}: ${err.message}`)
    }
    cred = { name: body.name, privateKey: body.privateKeyPem }
  }
  if (!cred) return null
  if (cred.name !== `app:${appName}` || typeof cred.privateKey !== 'string') {
    throw new Error(`ERR_APP_RUNTIME_CREDENTIAL_MISMATCH: expected the credential of app:${appName}, got ${JSON.stringify(cred.name)}`)
  }
  return Object.freeze({ name: cred.name, privateKey: cred.privateKey })
}

function createAppRuntime (opts) {
  opts = opts || {}
  const { name, appDir } = opts
  if (typeof name !== 'string' || !name) throw new Error('ERR_APP_RUNTIME_NAME_REQUIRED')
  if (typeof appDir !== 'string' || !appDir) throw new Error('ERR_APP_RUNTIME_APP_DIR_REQUIRED')

  const logger = opts.logger || defaultLogger(name)
  const { manifest, dir } = loadAppManifest(appDir)

  // Controllers load with the ambient config, so identity is derived first.
  const storeDir = opts.storeDir || null
  const seedRpc = _storeSeed(storeDir, 'seedRpc')
  const kernelKeyPair = _kernelKeyPair(_storeSeed(storeDir, 'seedKernelClient'))

  const kernelKey = Buffer.isBuffer(opts.kernelKey) ? opts.kernelKey.toString('hex') : opts.kernelKey
  const credential = _readCredential(opts, name)
  if (kernelKey && !credential) logger.warn(`no service-account credential for app:${name}: the Kernel refuses its calls`)
  const mdkClient = createMdkClient(kernelKey
    ? {
        kernelKey,
        kernelKeyPair,
        ...(opts.kernelBootstrap ? { kernelBootstrap: opts.kernelBootstrap } : {}),
        ...(opts.kernelDhtHost ? { kernelDhtHost: opts.kernelDhtHost } : {}),
        ...(credential ? { kernelCredential: credential } : {})
      }
    : {})

  // The app's own writable directory, so relative paths never land in the
  // project root or collide with another app's.
  const dataDir = storeDir ? path.resolve(storeDir, 'data') : null
  if (dataDir) fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 })

  // Operator config wins over the manifest's defaults. The Kernel client and the
  // data dir are the runtime's own: neither layer of config can replace them, or
  // slip in Kernel keys for a client of the app's own making.
  const config = Object.freeze({
    ..._withoutKernelFields(manifest.config),
    ..._withoutKernelFields(opts.config),
    dataDir,
    mdkClient
  })

  const readyFns = []
  let ready = false
  const runReady = (fn) => {
    const failed = (err) => logger.error('onReady callback failed: %s', err && err.message)
    try {
      const out = fn()
      if (out && typeof out.catch === 'function') out.catch(failed)
    } catch (err) {
      failed(err)
    }
  }

  const context = Object.freeze({
    config,
    logger,
    // Runs fn once this runtime is serving; straight away if it already is.
    onReady (fn) {
      if (typeof fn !== 'function') throw new Error('ERR_APP_RUNTIME_ONREADY_FN_REQUIRED')
      if (ready) runReady(fn)
      else readyFns.push(fn)
    }
  })

  const { routes, load } = loadPlugin(resolvePluginDir(dir), context)
  const routeById = new Map(routes.map(r => [r.id, r]))

  // The app's background logic: `main` (`<file>[#export]`, beside the route
  // table) is awaited with the config before the first start() serves, so no
  // request reaches a controller whose state main has not set up yet.
  const main = manifest.main ? load(manifest.main) : null
  if (main !== null && typeof main !== 'function') throw new Error(`ERR_APP_MAIN_NOT_FUNCTION: ${manifest.main}`)
  let mainDone = !main

  const firewall = buildFirewall({
    allowedKeys: opts.allowedKeys,
    allowedKeyFiles: opts.allowedKeyFiles,
    logger
  })

  let rpc = null
  let dht = null
  let server = null
  let starting = null
  let stopping = null

  // The Kernel client for one request: as the operator via the app when the
  // Gateway sent their token, else as the app.
  function requestClient (actor) {
    return actor ? mdkClient.withActor(actor) : mdkClient
  }

  // Decodes a request envelope and finds its route; throws a protocol error otherwise.
  function parseRequest (buf, wantStream) {
    let msg
    try {
      msg = protocol.decode(buf)
    } catch {
      throw protocol.protocolError(400, ERR.BAD_REQUEST, 'malformed request')
    }
    const bad = protocol.checkRequest(msg)
    if (bad) throw bad
    const route = routeById.get(msg.routeId)
    if (!route) throw protocol.protocolError(404, ERR.ROUTE_NOT_FOUND, msg.routeId)
    if (wantStream && route.stream !== true) throw protocol.protocolError(400, ERR.ROUTE_NOT_STREAM, msg.routeId)
    if (!wantStream && route.stream === true) throw protocol.protocolError(400, ERR.ROUTE_IS_STREAM, msg.routeId)
    return { msg, route }
  }

  // An ERR_* failure is the controller's answer; anything else is a bug the
  // caller only sees masked, so it is logged here with its stack.
  function logFailure (routeId, err) {
    if (protocol.isSafeError(err)) logger.debug('route %s failed: %s', routeId, err.message)
    else logger.error('route %s failed: %s', routeId, (err && err.stack) || err)
  }

  async function onInvoke (buf) {
    let routeId = null
    try {
      const { msg, route } = parseRequest(buf, false)
      routeId = route.id
      const result = await route._handler(_pluginReq(msg.req, msg.identity, requestClient(msg.actor)))
      return protocol.encode(protocol.okResponse(result))
    } catch (err) {
      logFailure(routeId, err)
      return protocol.encode(protocol.toErrorResponse(err))
    }
  }

  // Server side of one `app.stream` channel.
  function onStreamChannel (mux) {
    let channel = null
    let raw = null

    const sendError = (err) => {
      try { channel.messages[MSG.ERROR].send(protocol.encode(protocol.toErrorResponse(err))) } catch {}
      channel.close()
    }

    const onRequest = async (buf) => {
      if (raw) return // one request per channel
      let msg, route
      try {
        ({ msg, route } = parseRequest(buf, true))
      } catch (err) {
        return sendError(err)
      }

      raw = new StreamResponse(channel)
      try {
        await route._handler(_pluginReq(msg.req, msg.identity, requestClient(msg.actor)), raw)
      } catch (err) {
        // A stream handler owns the response, so a failure is reported in-band
        // while headers are still unsent. Afterwards the channel closes without
        // END, so the caller sees a truncated body as an error, not a success.
        logFailure(route.id, err)
        if (!raw.headersSent) {
          const { status, message } = protocol.toErrorResponse(err)
          raw.writeHead(status, { 'content-type': 'application/json' })
          raw.end(JSON.stringify({ statusCode: status, error: http.STATUS_CODES[status] || 'Bad Request', message }))
        } else if (!raw.writableEnded) {
          raw.destroy()
        }
      }
    }

    // Index = STREAM_MESSAGES; only REQUEST is inbound.
    const messages = [
      { onmessage: onRequest },
      {}, {}, {}, {}
    ]
    channel = mux.createChannel({
      protocol: METHODS.STREAM,
      messages,
      ondrain: () => { if (raw && !raw.destroyed) raw.emit('drain') },
      onclose: () => { if (raw) raw._markClosed() }
    })
    if (channel) channel.open()
  }

  async function _start () {
    if (!mainDone) {
      await main(config, context)
      mainDone = true
    }
    // Own DHT node only to bind an interface (hyperdht `host`); the keypair
    // matches what HyperswarmRPC would derive, so the server key is unchanged.
    if (opts.dhtHost) {
      dht = new DHT({ keyPair: DHT.keyPair(seedRpc), host: opts.dhtHost, ...(opts.bootstrap ? { bootstrap: opts.bootstrap } : {}) })
      rpc = new HyperswarmRPC({ seed: seedRpc, dht })
    } else {
      rpc = new HyperswarmRPC({ seed: seedRpc, bootstrap: opts.bootstrap || undefined })
    }
    server = rpc.createServer({ firewall })
    server.respond(METHODS.INVOKE, onInvoke)
    server.on('connection', (conn) => {
      conn.mux.pair({ protocol: METHODS.STREAM }, () => onStreamChannel(conn.mux))
    })
    await server.listen()

    const publicKey = server.publicKey
    if (opts.keyFile) _writeKeyFile(opts.keyFile, publicKey)

    // Public by nature, so world-readable but not writable: an operator copies
    // it into the Kernel's auth.whitelist, or it lands in a trusted-keys dir,
    // whose reader skips group/world-writable files.
    try {
      if (opts.kernelKeyFile) _writeKeyFile(opts.kernelKeyFile, kernelKeyPair.publicKey)
    } catch (err) {
      // A failed start must not leave the key the Gateway dials (it would
      // wait out appTimeoutMs for a 502 instead of answering 503 at once).
      if (opts.keyFile) _removeKeyFile(opts.keyFile, publicKey)
      throw err
    }

    logger.info('app runtime "%s" serving (key %s...)', name, publicKey.toString('hex').slice(0, 16))

    if (!ready) {
      ready = true
      for (const fn of readyFns.splice(0)) runReady(fn)
    }
    return { publicKey }
  }

  async function start () {
    if (stopping) await stopping
    // `starting` first: _start() sets `server` before it is listening, so a
    // second start() meanwhile must wait for the first, not report ready.
    if (starting) return starting
    if (server) return { publicKey: server.publicKey }
    starting = _start().catch(async (err) => {
      await _teardown()
      throw err
    }).finally(() => { starting = null })
    return starting
  }

  async function _teardown () {
    const s = server
    const r = rpc
    const d = dht
    server = null
    rpc = null
    dht = null
    if (s) await s.close().catch(() => {})
    if (r) await r.destroy().catch(() => {})
    if (d) await d.destroy().catch(() => {})
  }

  async function stop () {
    if (starting) await starting.catch(() => {})
    if (!stopping) {
      const publicKey = server && server.publicKey
      stopping = Promise.all([_teardown(), mdkClient.close().catch(() => {})]).finally(() => { stopping = null })
      // The Gateway reads a missing key file as "not started" (503) instead of
      // dialling a runtime that is gone.
      if (publicKey && opts.keyFile) _removeKeyFile(opts.keyFile, publicKey)
    }
    return stopping
  }

  return {
    name,
    routes,
    manifest,
    start,
    stop,
    getPublicKey () { return server ? server.publicKey : null },
    getKernelPublicKey () { return Buffer.from(kernelKeyPair.publicKey) }
  }
}

module.exports = { createAppRuntime, getOrCreateSeed, buildFirewall, _writeKeyFile }
