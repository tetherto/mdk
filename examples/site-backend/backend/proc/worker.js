'use strict'

// Per-process entrypoint: boots ONE worker (no in-process Kernel handle).
//
//   node proc/worker.js --worker whatsminer|antminer|avalon|antspace|bitdeer|abb|satec|schneider|seneca|minerpool|f2pool [--miners N] [--discovery local|dht]
//
// local (default): publish the RPC key to the shared dir. dht: read the Kernel's
// topic from .dht-topic and join it. bootWorker() runs identical post-start steps.

const path = require('path')
const fs = require('fs')
const debug = require('debug')('mdk:example:proc:worker')
const { ROOT, DEFAULT_MINER_COUNT, workerSpec, bootWorker } = require('../site')
const { arg, minerCountFromArgv } = require('../argv')

async function main () {
  const root = arg('--root', ROOT)
  const name = arg('--worker', null)
  const minerCount = minerCountFromArgv(DEFAULT_MINER_COUNT)
  const mode = arg('--discovery', process.env.MDK_DISCOVERY || 'local')

  const spec = workerSpec(name)
  if (!spec) throw new Error(`ERR_UNKNOWN_WORKER: ${name}`)

  let kernelTopic = null
  if (mode === 'dht') {
    const topicFile = path.join(root, '.dht-topic')
    if (!fs.existsSync(topicFile)) throw new Error('ERR_KERNEL_TOPIC_MISSING: start the Kernel first')
    kernelTopic = fs.readFileSync(topicFile, 'utf8').trim()
  }

  const { seeded } = await bootWorker(spec, { kernelTopic, root, minerCount, mode })
  debug('%s booted (seeded %d)', spec.workerId, seeded)

  // bootWorker (no kernel handle) binds SIGINT/SIGTERM to the runtime handle's stop.
  console.log('MDK_READY worker:%s id=%s seeded=%d', spec.name, spec.workerId, seeded)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
