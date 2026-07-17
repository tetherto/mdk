'use strict'

// Declared so the kernel dispatches rack-scoped rackReboot (the dispatcher
// rejects undeclared commands). Never reached: rack-scope envelopes carry no
// deviceId and the runtime serves plugin commands per-device only, so the
// runtime fails the command before handler lookup.
module.exports = async (ctx) => {
  ctx.device.applied.push({ method: 'rackReboot', thingIds: [ctx.deviceId] })
  return 1
}
