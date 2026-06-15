'use strict'

const { MDKWorkerAdapter } = require('../../../base/lib/mdk-worker-adapter')
const contract = require('../mdk-contract.json')

async function createMDKWorker (ManagerClass, opts) {
  const ctx = {
    rack: opts.rack,
    storeDir: opts.storeDir,
    root: opts.root
  }
  const manager = new ManagerClass({}, ctx)
  await manager.init()

  const adapter = new MDKWorkerAdapter(manager, contract, {
    workerId: `whatsminer-${opts.rack}`,
    orkTopic: opts.orkTopic,
    swarmOpts: opts.swarmOpts || {}
  })

  await adapter.start()

  return { manager, adapter }
}

module.exports = { createMDKWorker }
