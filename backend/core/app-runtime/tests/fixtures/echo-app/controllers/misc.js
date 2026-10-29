'use strict'

const gw = require('@tetherto/mdk-gateway/plugin')

// Counts module loads, so a test can tell that a process never loaded the app.
globalThis.__echoAppLoads = (globalThis.__echoAppLoads || 0) + 1

let calls = 0

async function whoami (req) {
  return { info: req._info }
}

// A cache hit is visible as an unchanged n.
async function counter (req) {
  return { n: ++calls, k: req.query.k }
}

// Answers after `query.ms` milliseconds.
async function slow (req) {
  const ms = Number(req.query.ms) || 0
  await new Promise((resolve) => setTimeout(resolve, ms))
  return { waited: ms }
}

// The plain config, and what the runtime adds: a Kernel client, never keys.
async function config () {
  const { mdkClient, ...rest } = gw.config
  return {
    ...rest,
    hasMdkClient: typeof mdkClient.listWorkers === 'function',
    configFrozen: Object.isFrozen(gw.config)
  }
}

// What a controller sees of its request's Kernel client, and that the
// operator's token is nowhere it can read.
async function kernelClient (req) {
  return {
    keys: Object.keys(req).sort(),
    asApp: req.mdk === gw.config.mdkClient,
    canCommand: typeof req.mdk.sendCommand === 'function',
    leaked: JSON.stringify(req).includes('operator-token')
  }
}

async function failSafe () {
  const err = new Error('ERR_ECHO_REJECTED: nope')
  err.statusCode = 422
  throw err
}

async function failMasked () {
  throw new Error('secret internals: db password is hunter2')
}

async function failMasked503 () {
  const err = new Error('upstream exploded at 10.0.0.7')
  err.statusCode = 503
  throw err
}

module.exports = { whoami, counter, slow, config, kernelClient, failSafe, failMasked, failMasked503 }
