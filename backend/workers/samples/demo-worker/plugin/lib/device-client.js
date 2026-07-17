'use strict'

// The "vendor SDK" for the firmware v3 HTTP JSON API. Plain device I/O — no
// MDK concepts, no base classes. This is all a plugin author writes to talk
// to their own firmware.
function createClient ({ host, port }) {
  const base = `http://${host || '127.0.0.1'}:${port}`

  const call = async (path, opts) => {
    const res = await fetch(base + path, opts)
    const body = await res.json()
    if (!res.ok || body.ok === false) {
      throw new Error(body.error || `ERR_DEVICE_CALL_FAILED: ${res.status}`)
    }
    return body
  }

  const command = (cmd, args) => call('/api/v3/command', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ cmd, ...args })
  })

  return {
    getSummary: () => call('/api/v3/summary'),
    reboot: () => command('reboot'),
    setPowerMode: (mode) => command('set-power-mode', { mode })
  }
}

module.exports = { createClient }
