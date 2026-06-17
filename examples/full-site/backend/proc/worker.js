'use strict'

// Per-process entrypoint: boots ONE worker (no in-process ORK handle).
//
//   node proc/worker.js --worker miner|container|powermeter|minerpool [--miners N] [--discovery local|dht]
//
// local (default): publish the RPC key to the shared dir. dht: read the ORK's
// topic from .dht-topic and join it. bootWorker() runs identical post-start steps.

const path = require('path')
const fs = require('fs')
const debug = require('debug')('mdk:example:proc:worker')
const { ROOT, DEFAULT_MINER_COUNT, workerSpec, bootWorker } = require('../site')

function arg (name, fallback) {
  const i = process.argv.indexOf(name)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

async function main () {
  const root = arg('--root', ROOT)
  const name = arg('--worker', null)
  const minerCount = Number(arg('--miners', DEFAULT_MINER_COUNT))
  const mode = arg('--discovery', process.env.MDK_DISCOVERY || 'local')

  const spec = workerSpec(name)
  if (!spec) throw new Error(`ERR_UNKNOWN_WORKER: ${name}`)

  let orkTopic = null
  if (mode === 'dht') {
    const topicFile = path.join(root, '.dht-topic')
    if (!fs.existsSync(topicFile)) throw new Error('ERR_ORK_TOPIC_MISSING: start the ORK first')
    orkTopic = fs.readFileSync(topicFile, 'utf8').trim()
  }

  const { seeded } = await bootWorker(spec, { orkTopic, root, minerCount, mode })
  debug('%s booted (seeded %d)', spec.workerId, seeded)

  // startWorker (no ork handle) handles SIGINT/SIGTERM (stop manager, then adapter).
  console.log('MDK_READY worker:%s id=%s seeded=%d', spec.name, spec.workerId, seeded)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
