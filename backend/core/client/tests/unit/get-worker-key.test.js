'use strict'

// getWorkerKey — hermetic, no network. The Kernel client uses the { transport }
// seam to serve WORKER_LIST, so getStatus surfaces a worker rpcKey.

const test = require('brittle')
const { createRawMdkClient } = require('../../index')

const WORKER_KEY = 'ab'.repeat(32) // 32-byte hex, valid for HRPCClient

function orkTransport (workers) {
  return {
    connect: async () => {},
    close: async () => {},
    request: async () => ({ workers })
  }
}

test('getWorkerKey - returns the worker rpcKey from the Kernel registry', async (t) => {
  const kernel = createRawMdkClient({ transport: orkTransport([{ workerId: 'miner-worker', state: 'READY', healthState: 'HEALTHY', deviceIds: ['m0'], rpcKey: WORKER_KEY }]) })
  await kernel.connect()
  t.is(await kernel.getWorkerKey('miner-worker'), WORKER_KEY)
})

test('getWorkerKey - returns null for an unregistered worker', async (t) => {
  const kernel = createRawMdkClient({ transport: orkTransport([{ workerId: 'miner-worker', state: 'READY', deviceIds: [], rpcKey: WORKER_KEY }]) })
  await kernel.connect()
  t.is(await kernel.getWorkerKey('ghost-worker'), null)
})
