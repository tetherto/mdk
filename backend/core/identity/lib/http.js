'use strict'

// Sign-in over HTTP, through an MDK Gateway: what an AI agent (or any program
// outside the stack) uses with ServiceAccountTokenSource when it reaches the
// stack by HTTP (the MCP server, Gateway routes) rather than HRPC.
//
//   const source = new ServiceAccountTokenSource({ name, privateKey, request: gatewayTokenRequest('http://gw:3847') })
//   headers.authorization = `Bearer ${await source.getToken()}`

const PATHS = { 'auth.token': '/auth/token', 'auth.refresh': '/auth/refresh' }

const SLASH = '/'.charCodeAt(0)

// Trailing `/` stripped by index, not by `/\/+$/`: that pattern retries the same
// run of slashes from every start position, so a long run costs quadratic time.
// Walking back once and slicing once is linear.
function _stripTrailingSlashes (value) {
  let end = value.length
  while (end > 0 && value.charCodeAt(end - 1) === SLASH) end--
  return end === value.length ? value : value.slice(0, end)
}

/**
 * @param {string} baseUrl - the Gateway's origin
 * @param {typeof fetch} [fetchImpl]
 * @returns {(action: string, payload: object) => Promise<object>} replies `{ error }` on a refusal
 */
function gatewayTokenRequest (baseUrl, fetchImpl) {
  const base = _stripTrailingSlashes(String(baseUrl || ''))
  return async (action, payload) => {
    const path = PATHS[action]
    if (!path) return { error: `ERR_IDENTITY_ACTION_UNSUPPORTED: ${action}` }
    const res = await (fetchImpl || globalThis.fetch)(`${base}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(payload)
    })
    let body = {}
    try {
      body = await res.json()
    } catch {}
    if (!res.ok) return { error: typeof body.message === 'string' ? body.message : `ERR_IDENTITY_HTTP_${res.status}` }
    return body
  }
}

module.exports = { gatewayTokenRequest }
