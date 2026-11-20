'use strict'

// The minimal `http.post(path, opts) -> { body }` surface F2MinerpoolApi was
// written against (the bfx HTTP facility), on the platform fetch: no facility
// lifecycle to start or stop, so a finished host can exit.
const DEFAULT_TIMEOUT_MS = 30000

module.exports = (baseUrl) => ({
  async post (apiPath, { headers = {}, body, timeout = DEFAULT_TIMEOUT_MS, signal } = {}) {
    const signals = [AbortSignal.timeout(timeout)]
    if (signal) signals.push(signal)
    const res = await fetch(new URL(apiPath, baseUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.any(signals)
    })
    if (!res.ok) throw new Error(`ERR_POOL_API: HTTP ${res.status}`)
    return { body: await res.json() }
  }
})
