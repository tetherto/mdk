'use strict'

const crypto = require('crypto')
const fs = require('fs')
const os = require('os')
const path = require('path')
const DHT = require('hyperdht')
const { createAppRuntime } = require('../../lib/runtime')
const { createRuntimeClient } = require('../../lib/client')

const ECHO_APP = path.join(__dirname, 'echo-app')
const LOOPBACK = '127.0.0.1'

function tmpDir (t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-app-runtime-'))
  t.teardown(() => fs.rmSync(dir, { recursive: true, force: true }))
  return dir
}

// A client identity: the seed fixes the DHT key pair the runtime's firewall sees.
function identityFor () {
  const seed = crypto.randomBytes(32)
  return { seed, publicKey: DHT.keyPair(seed).publicKey.toString('hex') }
}

function capturingLogger () {
  const lines = []
  const logger = {}
  for (const level of ['error', 'warn', 'info', 'debug', 'trace', 'fatal']) {
    logger[level] = (...args) => lines.push(`${level}:${args.join(' ')}`)
  }
  logger.child = () => logger
  logger.lines = lines
  return logger
}

async function until (fn, { timeout = 5000, interval = 20 } = {}) {
  const start = Date.now()
  while (!fn()) {
    if (Date.now() - start > timeout) throw new Error('until: timed out')
    await new Promise((resolve) => setTimeout(resolve, interval))
  }
}

// Starts the echo app on `testnet`, bound to loopback; it allows nobody unless
// opts say otherwise.
async function startEcho (t, testnet, opts = {}) {
  const logger = capturingLogger()
  const runtime = createAppRuntime({ name: 'echo', appDir: ECHO_APP, bootstrap: testnet.bootstrap, dhtHost: LOOPBACK, logger, ...opts })
  const { publicKey } = await runtime.start()
  t.teardown(() => runtime.stop())
  return { runtime, publicKey, logger }
}

// A runtime client as `caller` (an identityFor()), bound to the runtime at `publicKey`.
async function connectClient (t, testnet, publicKey, caller, opts = {}) {
  const client = createRuntimeClient({ seed: caller.seed, bootstrap: testnet.bootstrap, dhtHost: LOOPBACK, ...opts })
  await client.connect()
  t.teardown(() => client.close())
  return {
    invoke: (...args) => client.invoke(publicKey, ...args),
    stream: (...args) => client.stream(publicKey, ...args)
  }
}

async function collect (readable) {
  const chunks = []
  for await (const chunk of readable) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks).toString()
}

module.exports = { ECHO_APP, tmpDir, identityFor, capturingLogger, until, startEcho, connectClient, collect }
