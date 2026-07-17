'use strict'

const test = require('brittle')
const { ActionCaller } = require('../../lib/modules/action-caller')
const { createActionCallerProxy } = require('../../lib/modules/action-manager/caller-proxy')

function createCaller (opts = {}) {
  const workers = opts.workers || []
  const registry = {
    getReadyWorkers: () => workers
  }
  const workerChannel = {
    send: async () => ({
      payload: { calls: [{ id: 'dev-1', tags: [] }], reqVotes: 1 }
    })
  }
  const dispatcher = {
    dispatch: async () => ({ commandId: 'cmd-99', status: 'QUEUED' })
  }
  return new ActionCaller({ registry, workerChannel, dispatcher, ...opts.callerOpts })
}

test('action caller proxy - exposes action names as callTargets methods', async (t) => {
  const caller = createCaller({
    workers: [{
      workerId: 'miner-worker',
      deviceFamily: 'miner',
      channel: { id: 'ch-1' },
      deviceIds: ['dev-1']
    }]
  })

  const proxy = createActionCallerProxy(caller)
  const targets = { 'miner-worker': { calls: [{ id: 'dev-1', tags: [] }] } }

  await proxy.reboot([{ mode: 'eco' }], targets)
  t.is(targets['miner-worker'].calls[0].commandId, 'cmd-99')
  t.is(typeof proxy.getWriteCalls, 'function', 'preserves existing methods')
})
