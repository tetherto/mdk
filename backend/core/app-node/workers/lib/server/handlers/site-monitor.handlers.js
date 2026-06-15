'use strict'

async function getWorkers (ctx) {
  if (!ctx.mdkClient) throw new Error('ERR_ORK_CLIENT_NOT_CONNECTED')
  return ctx.mdkClient.listWorkers()
}

async function getTelemetry (ctx, req) {
  if (!ctx.mdkClient) throw new Error('ERR_ORK_CLIENT_NOT_CONNECTED')
  const { deviceId } = req.params
  const queryType = req.query.queryType || 'metrics'
  const result = await ctx.mdkClient.pullTelemetry(deviceId, queryType)
  return result || { error: 'ERR_NO_TELEMETRY' }
}

async function getState (ctx, req) {
  if (!ctx.mdkClient) throw new Error('ERR_ORK_CLIENT_NOT_CONNECTED')
  const result = await ctx.mdkClient.pullState(req.params.deviceId)
  return result || { error: 'ERR_NO_STATE' }
}

async function postCommand (ctx, req) {
  if (!ctx.mdkClient) throw new Error('ERR_ORK_CLIENT_NOT_CONNECTED')
  const { deviceId } = req.params
  const { command, params = {} } = req.body || {}
  if (!command) throw new Error('ERR_COMMAND_REQUIRED')
  return ctx.mdkClient.sendCommand(deviceId, command, params)
}

async function getHashrate (ctx) {
  if (!ctx.mdkClient) throw new Error('ERR_ORK_CLIENT_NOT_CONNECTED')

  const workersRes = await ctx.mdkClient.listWorkers()
  const workers = (workersRes && workersRes.workers) || []
  const ready = workers.filter(w => w.state === 'READY')

  const pulls = ready.flatMap(w =>
    (w.deviceIds || []).map(async (deviceId) => {
      const res = await ctx.mdkClient.pullTelemetry(deviceId, 'metrics')
      const stats = res && res.metrics && res.metrics.stats
      return {
        deviceId,
        workerId: w.workerId,
        hashrateMhs: (stats && stats.hashrate_mhs && stats.hashrate_mhs.avg) || 0,
        powerW: (stats && stats.power_w) || 0
      }
    })
  )

  const devices = await Promise.all(pulls)
  const totalHashrateMhs = devices.reduce((sum, d) => sum + d.hashrateMhs, 0)
  const totalPowerW = devices.reduce((sum, d) => sum + d.powerW, 0)

  return {
    totalHashrateMhs,
    totalPowerW,
    deviceCount: devices.length,
    devices,
    ts: Date.now()
  }
}

module.exports = { getWorkers, getTelemetry, getState, postCommand, getHashrate }
