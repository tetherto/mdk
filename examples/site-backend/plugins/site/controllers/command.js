'use strict'

// The real Whatsminer setPowerMode accepts low | normal | high (sleep would
// power the miner down, so it is excluded from the demo action).
const POWER_MODES = ['low', 'normal', 'high']

// Live miner action: round-trips setPowerMode through mdkClient → Kernel → miner.
// The command must be an allowed capability (validated by the Kernel dispatcher
// against the worker's exported contract); the new mode shows up on the next
// telemetry poll.
module.exports = async function command (req, services) {
  if (!services.mdkClient) throw new Error('ERR_MDK_CLIENT_UNAVAILABLE')

  const deviceId = req.params && req.params.deviceId
  if (!deviceId) throw new Error('ERR_DEVICE_ID_REQUIRED')

  const mode = req.body && req.body.mode
  if (!POWER_MODES.includes(mode)) throw new Error('ERR_INVALID_POWER_MODE')

  const result = await services.mdkClient.sendCommand(deviceId, 'setPowerMode', { mode })

  return {
    deviceId,
    command: 'setPowerMode',
    mode,
    commandId: result && result.commandId,
    status: (result && result.status) || 'UNKNOWN'
  }
}
