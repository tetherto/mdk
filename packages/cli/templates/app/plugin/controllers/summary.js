'use strict'

const mdkClient = require('../lib/client')

// A read-only aggregation endpoint: it asks the Kernel (through the plugin's
// ambient MDK client) for the fleet and returns a small summary. Replace this
// with your own aggregation, grounded in the telemetry channels your workers
// expose.
//
// Contract: `async (req) => result`. The return value is sent as JSON
// (HTTP 200). Throw `Error('ERR_...')` to return a 400.
module.exports = async function summary (req) {
  // The client fails per request (ERR_MDK_CLIENT_UNAVAILABLE) while the
  // Kernel is unreachable: report that instead of failing so the route stays
  // callable during boot.
  let workers
  try {
    const resp = await mdkClient.listWorkers()
    workers = (resp && resp.workers) || []
  } catch (err) {
    if (err && err.code === 'ERR_MDK_CLIENT_UNAVAILABLE') {
      return { ok: true, kernelConnected: false, workerCount: 0, deviceCount: 0, workers: [] }
    }
    throw err
  }

  const deviceCount = workers.reduce((n, w) => n + ((w.deviceIds && w.deviceIds.length) || 0), 0)

  return {
    ok: true,
    kernelConnected: true,
    workerCount: workers.length,
    deviceCount,
    workers: workers.map((w) => ({ workerId: w.workerId, devices: (w.deviceIds || []).length }))
  }
}
