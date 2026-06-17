'use strict'

// inspect.js — read site state through the MDK client (the example's MDK layer).
//
// `fetchStatus` queries the ORK over HRPC (real state, not PID liveness);
// `readKeys` reads the ORK + worker RPC public keys from the filesystem.
// Terminal rendering lives in the CLI layer (cli/render.js).

const path = require('path')
const fs = require('fs')
const { createMdkClient } = require('../../../backend/core/client')
const { keysDir } = require('../../../backend/core/mdk/lib/local-discovery')

function orkKeyPath (root) {
  return path.join(root, '.ork-key')
}

function readOrkKey (root) {
  const p = orkKeyPath(root)
  if (!fs.existsSync(p)) throw new Error('ERR_ORK_KEY_MISSING: ORK not started')
  return fs.readFileSync(p, 'utf8').trim()
}

// Retry/timeout/shaping live in client.getStatus(); opts pass straight through.
// clientFactory is injectable for tests.
async function fetchStatus (root, { clientFactory, ...opts } = {}) {
  const orkKey = readOrkKey(root)
  const make = clientFactory || ((key) => createMdkClient({ hrpc: { key } }))
  const client = make(orkKey)
  await client.connect()
  try {
    const status = await client.getStatus(opts)
    return { orkKey, ...status }
  } finally {
    await client.close()
  }
}

// ORK + each worker RPC public key, from the filesystem (no network).
function readKeys (root) {
  const kp = orkKeyPath(root)
  const orkKey = fs.existsSync(kp) ? fs.readFileSync(kp, 'utf8').trim() : null

  const dir = keysDir(root)
  const workers = []
  let files = []
  try { files = fs.readdirSync(dir) } catch {}
  for (const f of files.sort()) {
    if (!f.endsWith('.key')) continue
    workers.push({
      workerId: f.replace(/\.key$/, ''),
      rpcKey: fs.readFileSync(path.join(dir, f), 'utf8').trim()
    })
  }
  return { orkKey, workers }
}

module.exports = { readOrkKey, fetchStatus, readKeys }
