'use strict'

// Same-device worker discovery by direct key handoff — an optional, faster
// alternative to DHT topic discovery (the default) for setups where every
// component runs on one machine.
//
// Each worker publishes its stable (seed-derived) RPC public key to a shared
// keys dir; the Kernel reads each key and connects BY KEY, running the normal
// identity → capability → Ready flow. This skips the DHT topic announce/lookup
// round-trip, so registration is immediate as soon as the key file appears.
//
// This is the `discovery: { mode: 'local' }` path. The dir is resolved the same
// way on both sides — getKernel and startWorker default it to keysDir(root) and
// share the same root default — so the two processes agree with no config.

const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const debug = require('debug')('mdk:local-discovery')

function keysDir (root) {
  return path.join(root, '.worker-keys')
}

const WORKER_KEY_FILE = /^[A-Za-z0-9._-]+\.key$/

// Worker side: publish this worker's RPC public key to `dir`. The key is stable
// across restarts (derived from the persisted seedRpc), so re-publishing is a
// no-op for the Kernel (already-known peers are deduped by the listener).
// The Kernel dials whatever it finds here, so the dir and files get the same
// protections as the trusted-keys dir: a safe file name, a 0700 dir, a 0600
// file written atomically, and a 32-byte hex key.
function publishWorkerKey (dir, workerId, rpcKeyHex) {
  const hex = _keyHex(rpcKeyHex)
  const file = path.join(dir, `${_safeName(workerId)}.key`)
  _ensurePrivateDir(dir)
  _writeKeyFile(file, hex)
  debug('published %s key %s…', workerId, hex.slice(0, 16))
}

// Kernel side: offer every published worker key to the discovery listener, then
// keep watching `dir` for new ones. The listener dedupes already-known peers and
// drops a key on connect failure (so a periodic rescan retries workers whose RPC
// server was not yet reachable, and re-discovers all workers after an Kernel
// restart). Returns stop() to tear the watcher + timer down.
// Only `<name>.key` files that pass the trusted-keys checks (regular file, not a
// symlink, owned by this user, not group/world-writable, 64-hex content) are
// offered; anything else in the dir is ignored.
function discoverWorkerKeys (kernel, dir, { rescanMs = 4000 } = {}) {
  _ensurePrivateDir(dir)

  const offer = (file) => {
    if (typeof file !== 'string' || !WORKER_KEY_FILE.test(file)) return
    const key = _readKeyFile(path.join(dir, file))
    if (!key) return
    Promise.resolve(kernel.dhtListener.discoverWorker(key))
      .catch((e) => debug('discover %s failed: %s', file, e.message))
  }

  const scan = () => {
    let files = []
    try { files = fs.readdirSync(dir) } catch { return }
    for (const f of files) offer(f)
  }

  scan()
  let watcher = null
  try {
    watcher = fs.watch(dir, (_event, filename) => offer(filename))
    watcher.on('error', (err) => {
      debug('watch %s failed: %s', dir, err.message)
      try { watcher.close() } catch {}
      watcher = null
    })
  } catch (err) {
    debug('watch %s failed: %s', dir, err.message)
  }
  const timer = setInterval(scan, rescanMs)
  timer.unref()

  return {
    stop () {
      if (watcher) {
        try { watcher.close() } catch {}
        watcher = null
      }
      clearInterval(timer)
    }
  }
}

// ─── Trusted caller keys (fail-closed RPC admission) ──────────────────────
//
// The Kernel HRPC listener and every Worker RPC server reject unknown public
// keys. Same-machine processes that cannot hand each other a key in memory
// meet in a trusted-keys dir instead: each publishes `<name>.pub` (hex of the
// DHT key it dials with) and the other side admits what it finds there.
//
//   Kernel  publishes kernel.pub (kernel.getClientPublicKey(), the key it dials
//           workers with) and admits every other key as an HRPC caller.
//   Gateway publishes gateway.pub (status.rpcClientKey); MCP/CLI clients
//           publish their persistent caller key the same way.
//   Worker  allows only kernel.pub, so every command reaches its devices
//           through the Kernel's checks and write-command log.
//
// Whoever can write the dir is trusted: it is created 0700, and files that are
// group/world-writable or owned by another user are ignored.

const KEY_HEX = /^[0-9a-f]{64}$/
const KERNEL_KEY_NAME = 'kernel'

function trustedKeysDir (root) {
  return path.join(root, '.trusted-keys')
}

function _keyHex (key) {
  const hex = Buffer.isBuffer(key) ? key.toString('hex') : String(key || '').trim().toLowerCase()
  if (!KEY_HEX.test(hex)) throw new Error('ERR_TRUSTED_KEY_INVALID: expected a 32-byte hex public key')
  return hex
}

function _safeName (name) {
  if (typeof name !== 'string' || !/^[A-Za-z0-9._-]+$/.test(name)) throw new Error(`ERR_TRUSTED_KEY_NAME_INVALID: ${name}`)
  return name
}

function publishTrustedKey (dir, name, key) {
  const hex = _keyHex(key)
  const file = path.join(dir, `${_safeName(name)}.pub`)
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
  _writeKeyFile(file, hex)
  debug('published trusted key %s %s…', name, hex.slice(0, 16))
  return hex
}

// Creates `dir` 0700 when missing; an existing one must be a real directory
// (not a symlink) owned by this user and not group/world-writable.
function _ensurePrivateDir (dir) {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
  const st = fs.lstatSync(dir)
  if (!st.isDirectory()) throw new Error(`ERR_KEYS_DIR_UNSAFE: ${dir} is not a directory`)
  if (process.platform !== 'win32') {
    if (typeof process.getuid === 'function' && st.uid !== process.getuid()) {
      throw new Error(`ERR_KEYS_DIR_UNSAFE: ${dir} is owned by another user`)
    }
    if (st.mode & 0o022) throw new Error(`ERR_KEYS_DIR_UNSAFE: ${dir} is group/world-writable`)
  }
}

// Atomic 0600 write through an unpredictable temp name created exclusively.
function _writeKeyFile (file, hex) {
  const tmp = `${file}.${process.pid}.${crypto.randomBytes(8).toString('hex')}.tmp`
  try {
    fs.writeFileSync(tmp, hex, { encoding: 'utf8', mode: 0o600, flag: 'wx' })
    fs.renameSync(tmp, file)
  } catch (err) {
    try { fs.unlinkSync(tmp) } catch {}
    throw err
  }
}

const O_NOFOLLOW = fs.constants.O_NOFOLLOW || 0

function _readKeyFile (file) {
  let fd = null
  try {
    const lst = fs.lstatSync(file)
    if (!lst.isFile()) return null
    fd = fs.openSync(file, fs.constants.O_RDONLY | O_NOFOLLOW)
    const st = fs.fstatSync(fd)
    if (!st.isFile() || st.ino !== lst.ino || st.dev !== lst.dev) return null
    if (process.platform !== 'win32') {
      if (st.mode & 0o022) { debug('ignoring group/world-writable key file %s', file); return null }
      if (typeof process.getuid === 'function' && st.uid !== process.getuid()) { debug('ignoring key file owned by another user %s', file); return null }
    }
    const buf = Buffer.alloc(128)
    const n = fs.readSync(fd, buf, 0, buf.length, 0)
    const hex = buf.subarray(0, n).toString('utf8').trim().toLowerCase()
    return KEY_HEX.test(hex) ? hex : null
  } catch {
    return null
  } finally {
    if (fd !== null) { try { fs.closeSync(fd) } catch {} }
  }
}

// Returns [{ name, key }] for every valid `<name>.pub` in dir.
function readTrustedKeys (dir) {
  let files = []
  try { files = fs.readdirSync(dir) } catch { return [] }
  const out = []
  for (const f of files) {
    if (!f.endsWith('.pub')) continue
    const key = _readKeyFile(path.join(dir, f))
    if (key) out.push({ name: f.slice(0, -4), key })
  }
  return out
}

// Calls onKey(hex, name) once per new key now and whenever one appears.
function watchTrustedKeys (dir, onKey, { rescanMs = 2000 } = {}) {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
  const seen = new Set()
  const scan = () => {
    for (const { name, key } of readTrustedKeys(dir)) {
      if (seen.has(key)) continue
      seen.add(key)
      try { onKey(key, name) } catch (err) { debug('trusted key %s rejected: %s', name, err.message) }
    }
  }
  scan()
  let watcher = null
  try {
    watcher = fs.watch(dir, () => scan())
    watcher.on('error', () => { try { watcher.close() } catch {} watcher = null })
  } catch {}
  const timer = setInterval(scan, rescanMs)
  timer.unref()
  return {
    stop () {
      if (watcher) { try { watcher.close() } catch {} watcher = null }
      clearInterval(timer)
    }
  }
}

// Kernel side: admit every published caller key (full access) except its own.
function admitTrustedKeys (kernel, dir, opts) {
  const own = kernel.getClientPublicKey && kernel.getClientPublicKey()
  const ownHex = own ? own.toString('hex') : null
  return watchTrustedKeys(dir, (key, name) => {
    if (key === ownHex) return
    kernel.allowKey(key)
    debug('kernel admitted trusted caller %s', name)
  }, opts)
}

// Worker side (separate process): allow the Kernel's published client key.
// Call before runtime.start() — it throws when nothing is trusted yet.
function trustKeysFromDir (runtime, dir, opts) {
  // The Kernel's client key only: every device call goes through the Kernel's
  // spec.rbac check, so the other callers published here are not let past it.
  return watchTrustedKeys(dir, (key, name) => {
    if (name !== KERNEL_KEY_NAME) return
    runtime.allowKey(key)
    debug('worker %s trusts %s', runtime.workerId, name)
  }, opts)
}

// Wait until the Kernel has published its client key to dir.
async function waitForKernelKey (dir, { timeoutMs = 30000, intervalMs = 250 } = {}) {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    const hit = readTrustedKeys(dir).find((k) => k.name === KERNEL_KEY_NAME)
    if (hit) return hit.key
    if (Date.now() >= deadline) {
      throw new Error(`ERR_KERNEL_CLIENT_KEY_NOT_FOUND: no ${KERNEL_KEY_NAME}.pub in ${dir} — start the Kernel first (it publishes the key its workers must allow), or pass allowedKeys explicitly`)
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
}

// Worker side (same process as the Kernel): allow the Kernel's client key
// only. Every device call goes through the Kernel, which checks it against
// spec.rbac and logs every write command. Call before start().
function trustKernel (runtime, kernel) {
  const client = kernel.getClientPublicKey()
  if (!client) throw new Error('ERR_KERNEL_CLIENT_KEY_UNAVAILABLE: start the Kernel (with HRPC) before its workers')
  runtime.allowKey(client)
  return { stop () {} }
}

// A persistent caller identity (MCP server, CLI client): an ed25519 keypair
// in hyperdht's format derived from a 32-byte seed kept at <dir>/seed (0600).
function callerKeyPair (dir) {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
  const seedPath = path.join(dir, 'seed')
  let seed = null
  try {
    const buf = fs.readFileSync(seedPath)
    if (buf.length === 32) seed = buf
    else throw new Error(`ERR_CALLER_SEED_MALFORMED: ${seedPath}`)
  } catch (err) {
    if (err.code !== 'ENOENT') throw err
  }
  if (!seed) {
    seed = crypto.randomBytes(32)
    fs.writeFileSync(seedPath, seed, { mode: 0o600, flag: 'wx' })
  }
  const priv = crypto.createPrivateKey({
    key: Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), seed]),
    format: 'der',
    type: 'pkcs8'
  })
  const publicKey = crypto.createPublicKey(priv).export({ format: 'der', type: 'spki' }).subarray(-32)
  return { publicKey, secretKey: Buffer.concat([seed, publicKey]) }
}

module.exports = {
  keysDir,
  publishWorkerKey,
  discoverWorkerKeys,
  KERNEL_KEY_NAME,
  trustedKeysDir,
  publishTrustedKey,
  readTrustedKeys,
  watchTrustedKeys,
  admitTrustedKeys,
  trustKeysFromDir,
  waitForKernelKey,
  trustKernel,
  callerKeyPair
}
