'use strict'

const test = require('brittle')
const path = require('path')
const fs = require('fs')
const os = require('os')
const Corestore = require('corestore')
const Hyperbee = require('hyperbee')
const { CommandLog } = require('../../lib/modules/command-log')

async function createTestBee (t) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-command-log-'))
  const store = new Corestore(tmpDir)
  const bee = new Hyperbee(store.get({ name: 'command-log-test' }), { keyEncoding: 'utf-8' })
  await bee.ready()
  t.teardown(async () => {
    await bee.close()
    await store.close()
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })
  return bee
}

test('command log - newest first, secrets redacted, time window and limit', async (t) => {
  const log = new CommandLog({ store: await createTestBee(t) })
  const realNow = Date.now
  t.teardown(() => { Date.now = realNow })

  for (const [ts, command] of [[1000, 'a'], [2000, 'b'], [3000, 'c']]) {
    Date.now = () => ts
    await log.append({ event: 'attempt', command, params: { pool: { url: 'stratum+tcp://x', password: 'hunter2' } } })
  }

  t.alike((await log.query()).map(e => e.command), ['c', 'b', 'a'])
  t.alike((await log.query({ start: 2000, end: 2000 })).map(e => e.command), ['b'], 'bounds are inclusive')
  t.alike((await log.query({ limit: 1 })).map(e => e.command), ['c'])
  const [entry] = await log.query({ limit: 1 })
  t.is(entry.ts, 3000)
  t.alike(entry.params, { pool: { url: 'stratum+tcp://x', password: '[REDACTED]' } })
})

test('command log - entries older than ttlMs are pruned', async (t) => {
  const log = new CommandLog({ store: await createTestBee(t), ttlMs: 1000 })
  const realNow = Date.now
  t.teardown(() => { Date.now = realNow })

  Date.now = () => 10000
  await log.append({ event: 'attempt', command: 'old' })
  Date.now = () => 10500
  await log.append({ event: 'attempt', command: 'recent' })
  Date.now = () => 11200
  await log.prune()

  t.alike((await log.query()).map(e => e.command), ['recent'])
})
