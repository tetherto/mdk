'use strict'

const { z } = require('zod')
const mdkClient = require('../lib/client')
const { collectDevices, powerModesFor, isEmpty, json } = require('../lib/site')

const DEVICE_ATTRS = ['telemetry', 'state', 'capabilities', 'power_modes']

// The Kernel answers `{ error }` for a device it could not read, and a Worker
// adds `deviceId` and `timestamp` to its own.
const unread = (reply) => isEmpty(reply) || typeof reply.error === 'string'
const because = (reply) => (typeof reply?.error === 'string' ? ` (${reply.error})` : '')

module.exports = {
  schema: {
    ref: z.string().meta({ 'x-mdk-ref': 'device' }).describe('A device id taken from a previous result.'),
    attr: z.enum(DEVICE_ATTRS).default('telemetry').describe('Which aspect of the device to read.')
  },
  handler: async ({ ref, attr }) => {
    // Costs a status round-trip per read, which is what separates "not in status" from "no
    // readings". Without it a device the site has never heard of answers exactly like a real one
    // that happens to be quiet: an operator asking after a ref the model invented was told
    // "reports no readings" and had no way to tell it was not a device at all.
    const known = collectDevices(await mdkClient.getStatus()).find((row) => row.deviceId === ref)
    if (!known) {
      return json({
        summary: `${ref} is not in the site's current status. It may be restarting, unreachable, or not part of this site.`,
        ref,
        attr,
        value: null
      })
    }

    if (attr === 'capabilities') {
      const caps = await mdkClient.getCapabilities(ref)
      return json({ summary: isEmpty(caps) ? `${ref} reports no capabilities.` : `Capabilities of ${ref}.`, ref, attr, value: caps ?? null })
    }
    if (attr === 'state') {
      const state = await mdkClient.pullState(ref)
      return json({ summary: unread(state) ? `${ref} reports no state${because(state)}.` : `State of ${ref}.`, ref, attr, value: state ?? null })
    }
    if (attr === 'power_modes') {
      const modes = (await powerModesFor(ref)).supportedPowerModes ?? null
      return json({
        summary: modes ? `${ref} supports ${modes.join(', ')}.` : `${ref} does not report power modes.`,
        ref,
        attr,
        value: modes
      })
    }
    const telemetry = await mdkClient.pullTelemetry(ref, 'metrics')
    return json({
      summary: unread(telemetry) ? `${ref} reports no readings${because(telemetry)}.` : `Live readings for ${ref}.`,
      ref,
      attr,
      value: telemetry ?? null
    })
  }
}
