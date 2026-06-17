'use strict'

// Same-device worker discovery by direct key handoff — an optional, faster
// alternative to DHT topic discovery (the default) for setups where every
// component runs on one machine.
//
// Each worker publishes its stable (seed-derived) RPC public key to a shared
// keys dir; the ORK reads each key and connects BY KEY, running the normal
// identity → capability → Ready flow. This skips the DHT topic announce/lookup
// round-trip, so registration is immediate as soon as the key file appears.
//
// This is the `discovery: { mode: 'local' }` path. The dir is resolved the same
// way on both sides — getOrk and startWorker default it to keysDir(root) and
// share the same root default — so the two processes agree with no config.

const path = require('path')
const fs = require('fs')
const debug = require('debug')('mdk:local-discovery')

function keysDir (root) {
  return path.join(root, '.worker-keys')
}

// Worker side: publish this worker's RPC public key to `dir`. The key is stable
// across restarts (derived from the persisted seedRpc), so re-publishing is a
// no-op for the ORK (already-known peers are deduped by the listener).
function publishWorkerKey (dir, workerId, rpcKeyHex) {
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, `${workerId}.key`), rpcKeyHex, 'utf8')
  debug('published %s key %s…', workerId, rpcKeyHex.slice(0, 16))
}

// ORK side: offer every published worker key to the discovery listener, then
// keep watching `dir` for new ones. The listener dedupes already-known peers and
// drops a key on connect failure (so a periodic rescan retries workers whose RPC
// server was not yet reachable, and re-discovers all workers after an ORK
// restart). Returns stop() to tear the watcher + timer down.
function discoverWorkerKeys (ork, dir, { rescanMs = 4000 } = {}) {
  fs.mkdirSync(dir, { recursive: true })

  const offer = (file) => {
    if (!file || !file.endsWith('.key')) return
    let key
    try { key = fs.readFileSync(path.join(dir, file), 'utf8').trim() } catch { return }
    if (!key) return
    Promise.resolve(ork.dhtListener.discoverWorker(key))
      .catch((e) => debug('discover %s failed: %s', file, e.message))
  }

  const scan = () => {
    let files = []
    try { files = fs.readdirSync(dir) } catch { return }
    for (const f of files) offer(f)
  }

  scan()
  const watcher = fs.watch(dir, (_event, filename) => offer(filename))
  const timer = setInterval(scan, rescanMs)
  timer.unref()

  return {
    stop () {
      try { watcher.close() } catch {}
      clearInterval(timer)
    }
  }
}

module.exports = { keysDir, publishWorkerKey, discoverWorkerKeys }
