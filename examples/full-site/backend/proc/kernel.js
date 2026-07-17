'use strict'

// Per-process entrypoint: boots the Kernel.
//
// --discovery local|dht (default local). local: getKernel registers workers by the
// RPC keys they publish to the shared dir. dht: Hyperswarm topic — this entrypoint
// owns the topic file (reads .dht-topic, else generates + writes it).
// Writes the Kernel's HRPC public key to .kernel-key for the CLI/gateway to connect.

const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const debug = require('debug')('mdk:example:proc:kernel')
const { ROOT, bootKernel } = require('../site')
const { arg } = require('../argv')

async function main () {
  const root = arg('--root', ROOT)
  const mode = arg('--discovery', process.env.MDK_DISCOVERY || 'local')
  fs.mkdirSync(root, { recursive: true })

  let topic = null
  if (mode === 'dht') {
    const topicFile = path.join(root, '.dht-topic')
    topic = fs.existsSync(topicFile) ? fs.readFileSync(topicFile, 'utf8').trim() : null
    if (!topic) {
      topic = crypto.randomBytes(32).toString('hex')
      fs.writeFileSync(topicFile, topic, 'utf8')
      debug('generated discovery topic %s…', topic.slice(0, 16))
    }
  }

  const kernel = await bootKernel({ root, topic, mode })
  const kernelKey = kernel.getPublicKey().toString('hex')
  fs.writeFileSync(path.join(root, '.kernel-key'), kernelKey, 'utf8')

  // getKernel handles SIGINT/SIGTERM (drains kernel._cleanup, then kernel.stop()).
  console.log('MDK_READY kernel key=%s mode=%s%s', kernelKey, mode, topic ? ` topic=${topic}` : '')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
