'use strict'

const { requestClient } = require('./utils')

// Union of the demo's per-family modes: Whatsminer accepts low | normal |
// high, SealMiner names its boost high_performance. Sleep would power the
// miner down, so it is excluded from the demo action on every family.
const POWER_MODES = ['low', 'normal', 'high', 'high_performance']

// Live miner action: round-trips setPowerMode through mdkClient → Kernel → miner.
// The command must be an allowed capability (validated by the Kernel dispatcher
// against the worker's exported contract); the new mode shows up on the next
// telemetry poll.
//
// Sent as the signed-in user (req.mdk): the Kernel refuses it unless their
// roles allow writing this device, and logs them as the sender.
//
// `ctx` is a test-only seam — see utils.js requestClient.
module.exports = async (req, ctx) => {
  const mdkClient = requestClient(req, ctx)
  if (!mdkClient) throw new Error('ERR_MDK_CLIENT_UNAVAILABLE')

  const deviceId = req.params && req.params.deviceId
  if (!deviceId) throw new Error('ERR_DEVICE_ID_REQUIRED')

  const mode = req.body && req.body.mode
  if (!POWER_MODES.includes(mode)) throw new Error('ERR_INVALID_POWER_MODE')

  const result = await mdkClient.sendCommand(deviceId, 'setPowerMode', { mode })

  return {
    deviceId,
    command: 'setPowerMode',
    mode,
    commandId: result && result.commandId,
    status: (result && result.status) || 'UNKNOWN'
  }
}
