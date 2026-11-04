'use strict'

const test = require('brittle')
const overview = require('../../backend/gateway-plugins/site/controllers/overview')

// One healthy miner Worker and one DEAD one. The dead Worker cannot be pulled, so its devices
// cannot be listed; the overview must say it is down instead of leaving its miners out silently.
function fakeClient ({ forbidden = [] } = {}) {
  const workers = [
    { workerId: 'worker-avalon', state: 'READY', healthState: 'HEALTHY', deviceIds: ['av-1'] },
    { workerId: 'worker-antminer', state: 'READY', healthState: 'DEAD', deviceIds: ['am-1', 'am-2', 'am-3'] }
  ]
  return {
    listWorkers: async () => ({ workers }),
    getCapabilities: async (deviceId) => {
      if (forbidden.includes(deviceId)) throw new Error('ERR_KERNEL_ACTION_FORBIDDEN: tenant may not read devices ' + deviceId)
      return {}
    },
    pullTelemetry: async (deviceId, query) => {
      if (deviceId !== 'av-1') throw new Error(`unexpected pull for ${deviceId}`)
      if (query.type === 'config') return { config: { contract: { deviceFamily: 'miner' } } }
      if (query.type === 'count') return { count: 1 }
      if (query.type === 'list') {
        return { things: [{ id: 'av-1', code: 'AV-1', info: { container: 'c1' }, last: { snap: { stats: { status: 'mining' } } } }] }
      }
      return null
    }
  }
}

test('overview - a dead Worker is reported, not silently dropped', async (t) => {
  const res = await overview({}, { mdkClient: fakeClient() })

  t.is(res.miners.length, 1, 'the healthy Worker\'s miner is listed')
  t.alike(res.unavailableWorkers, [
    { workerId: 'worker-antminer', reason: 'DEAD' }
  ], 'the dead Worker is named with its state')
  t.is(res.totals.unavailableDeviceCount, 3, 'totals say how many devices are missing')
  t.alike(res.unavailableDevices, [
    { deviceId: 'am-1', workerId: 'worker-antminer', status: 'offline', stale: true },
    { deviceId: 'am-2', workerId: 'worker-antminer', status: 'offline', stale: true },
    { deviceId: 'am-3', workerId: 'worker-antminer', status: 'offline', stale: true }
  ], 'each of its devices is returned, flagged offline and stale')
})

test('overview - nothing is reported unavailable when every Worker is up', async (t) => {
  const client = fakeClient()
  const list = client.listWorkers
  client.listWorkers = async () => ({ workers: (await list()).workers.slice(0, 1) })
  const res = await overview({}, { mdkClient: client })

  t.alike(res.unavailableWorkers, [])
  t.alike(res.unavailableDevices, [])
  t.is(res.totals.unavailableDeviceCount, 0)
})

test('overview - a dead Worker\'s devices the caller may not read are left out', async (t) => {
  const res = await overview({}, { mdkClient: fakeClient({ forbidden: ['am-2'] }) })
  t.alike(res.unavailableDevices.map((d) => d.deviceId), ['am-1', 'am-3'], 'only readable devices are listed')
  t.is(res.totals.unavailableDeviceCount, 2, 'and only they are counted')
})

test('overview - a dead Worker the caller may read nothing of lists none of its devices', async (t) => {
  const res = await overview({}, { mdkClient: fakeClient({ forbidden: ['am-1', 'am-2', 'am-3'] }) })
  t.alike(res.unavailableDevices, [])
  t.is(res.totals.unavailableDeviceCount, 0)
})
