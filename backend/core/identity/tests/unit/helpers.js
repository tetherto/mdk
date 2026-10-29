'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
const Corestore = require('corestore')
const Hyperbee = require('hyperbee')
const { TokenIssuer } = require('../../index')

const FAST_SCRYPT = { N: 1024, r: 8, p: 1 }

/** A Hyperbee sub in a temp dir, closed and removed at teardown. */
async function openBee (t, dir) {
  const owned = !dir
  dir = dir || fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-identity-'))
  const store = new Corestore(dir)
  const bee = new Hyperbee(store.get({ name: 'kernel-db' }), { keyEncoding: 'utf-8' })
  await bee.ready()
  let closed = false
  const close = async () => {
    if (closed) return
    closed = true
    await bee.close()
    await store.close()
  }
  t.teardown(async () => {
    await close()
    if (owned) fs.rmSync(dir, { recursive: true, force: true })
  })
  return { dir, bee: bee.sub('kernel-identity'), close }
}

/** A controllable clock, in ms. */
function clock (start = Date.UTC(2026, 9, 21)) {
  let ms = start
  const now = () => ms
  now.advance = (sec) => { ms += sec * 1000 }
  return now
}

async function issuer (t, opts = {}) {
  const { bee, dir, close } = opts.bee ? opts : await openBee(t)
  const now = opts.now || clock()
  const iss = new TokenIssuer({ bee, now, scryptParams: FAST_SCRYPT, ...opts.issuer })
  await iss.ready()
  return { iss, now, bee, dir, close }
}

module.exports = { openBee, clock, issuer, FAST_SCRYPT }
