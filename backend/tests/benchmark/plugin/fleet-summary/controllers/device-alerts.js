'use strict'

// Single-device alerts read through the Gateway (Consumer → Gateway →
// Kernel → alert source) — the "Alert visible via Gateway" half of the
// alerts path that pollAlerts (lib/load.js) can't reach on its own, since
// that one goes straight to the Kernel client.
//
// `services` is a test-only seam: a real gateway route call always passes
// just `req`, so this falls through to the plugin's own ambient client
// (lib/client.js, lazily required so this file stays requirable outside a
// plugin load — see @tetherto/mdk-gateway/plugin). Tests pass `{ mdkClient }`
// directly instead of loading the plugin.
module.exports = async function deviceAlerts (req, services) {
  const mdkClient = services === undefined ? require('../lib/client') : services.mdkClient
  if (!mdkClient) throw new Error('ERR_MDK_CLIENT_UNAVAILABLE')

  const deviceId = req.params.id
  // Filter to this device: `list` pages at 100 devices by default, so an
  // unfiltered query never returns a device past the first page.
  const res = await mdkClient.pullTelemetry(deviceId, { type: 'list', status: true, query: { id: deviceId }, limit: 1 })
  const thing = (res?.things || []).find((t) => t.id === deviceId)
  return { deviceId, alerts: thing?.last?.alerts || [] }
}
