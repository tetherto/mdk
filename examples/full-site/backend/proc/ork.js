'use strict'

// Per-process entrypoint: boots the ORK.
//
// --discovery local|dht (default local). local: getOrk registers workers by the
// RPC keys they publish to the shared dir. dht: Hyperswarm topic — this entrypoint
// owns the topic file (reads .dht-topic, else generates + writes it).
// Writes the ORK's HRPC public key to .ork-key for the CLI/app-node to connect.

const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const debug = require('debug')('mdk:example:proc:ork')
const { ROOT, bootOrk } = require('../site')

function arg (name, fallback) {
  const i = process.argv.indexOf(name)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

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

  const ork = await bootOrk({ root, topic, mode })
  const orkKey = ork.getPublicKey().toString('hex')
  fs.writeFileSync(path.join(root, '.ork-key'), orkKey, 'utf8')

  // getOrk handles SIGINT/SIGTERM (drains ork._cleanup, then ork.stop()).
  console.log('MDK_READY ork key=%s mode=%s%s', orkKey, mode, topic ? ` topic=${topic}` : '')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
