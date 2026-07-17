'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
const StoreFacility = require('@tetherto/hp-svc-facs-store')

// Real Corestore-backed store facility in a tmpdir. Register the returned
// teardown with t.teardown() — it stops the facility and removes the dir.
async function createTestStore () {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-test-'))
  const store = new StoreFacility({}, { storeDir: dir }, {})

  await new Promise((resolve, reject) => {
    store.start((err) => (err ? reject(err) : resolve()))
  })

  const teardown = async () => {
    await new Promise((resolve) => store.stop(() => resolve()))
    fs.rmSync(dir, { recursive: true, force: true })
  }

  return { store, dir, teardown }
}

async function createTestBee (store, name, opts = { keyEncoding: 'utf-8' }) {
  const bee = await store.getBee({ name }, opts)
  await bee.ready()
  return bee
}

module.exports = { createTestStore, createTestBee }
