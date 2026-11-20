'use strict'

const test = require('brittle')
const overview = require('../../backend/gateway-plugins/site/controllers/overview')

// A contract power meter Worker (no worker-infra store) answers a Worker-scoped list with a
// bare device list and no things; the overview reads the meter from its `snap` channel.
function fakeClient (snap, { brand = 'SATEC' } = {}) {
  const workers = [
    { workerId: 'satec-powermeter-worker', state: 'READY', healthState: 'HEALTHY', deviceIds: ['SATEC-001'], deviceFamily: 'power-meter', brand }
  ]
  return {
    listWorkers: async () => ({ workers }),
    pullWorkerQuery: async () => ({ workers: { 'satec-powermeter-worker': { devices: [{ deviceId: 'SATEC-001', status: 'online' }] } } }),
    pullTelemetry: async (deviceId, query) => {
      if (deviceId !== 'SATEC-001' || query.type !== 'snap') throw new Error(`unexpected pull ${deviceId} ${query.type}`)
      return snap()
    }
  }
}

test('overview - a contract power meter is the site meter', async (t) => {
  const value = { stats: { power_w: 1200, tension_v: 400, powermeter_specific: { i1_a: 3 } } }
  const res = await overview({}, { mdkClient: fakeClient(() => ({ name: 'snap', value })) })

  t.alike(res.powermeters, [
    { deviceId: 'SATEC-001', code: 'SATEC-001', type: 'powermeter-satec', label: 'SATEC PM180', powerW: 1200, tensionV: 400, currentA: 3 }
  ])
  t.alike(res.site, { powerW: 1200, tensionV: 400, currentA: 3 })
  t.alike(res.unavailableDevices, [])
})

test('overview - a contract power meter with no brand keeps its label', async (t) => {
  const res = await overview({}, { mdkClient: fakeClient(() => ({ name: 'snap', value: { stats: {} } }), { brand: null }) })

  t.is(res.powermeters[0].type, 'powermeter-satec-powermeter-worker')
  t.is(res.powermeters[0].label, 'SATEC PM180')
})

for (const [why, snap] of [
  ['answers an error', () => ({ deviceId: 'SATEC-001', error: 'ERR_METER_UNREACHABLE: connect ECONNREFUSED' })],
  ['throws', () => { throw new Error('ERR_WORKER_UNREACHABLE') }]
]) {
  test(`overview - a contract power meter whose snap ${why} is unavailable, not a zero reading`, async (t) => {
    const res = await overview({}, { mdkClient: fakeClient(snap) })

    t.alike(res.powermeters, [])
    t.alike(res.unavailableDevices, [{ deviceId: 'SATEC-001', workerId: 'satec-powermeter-worker', status: 'offline', stale: true }])
    t.is(res.totals.unavailableDeviceCount, 1)
  })
}
