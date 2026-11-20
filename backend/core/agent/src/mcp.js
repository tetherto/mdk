import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { ServiceAccountTokenSource, gatewayTokenRequest } from '@tetherto/mdk-identity'

// @tetherto/mdk-mcp frames every text result as untrusted data:
// `<untrusted-tool-output tool="id">\n…\n</untrusted-tool-output>\n<notice>`. The model reads the
// framed text; code that parses the payload unwraps it first. Text without the frame passes through.
const FRAME = /^<untrusted-tool-output[^>]*>\n([\s\S]*?)\n<\/untrusted-tool-output>(?:\n[^\n]*)?$/

export function unwrapToolText (text) {
  const m = typeof text === 'string' ? FRAME.exec(text.trim()) : null
  return m ? m[1].replaceAll('<\\/untrusted-tool-output', '</untrusted-tool-output') : text
}

function isHttpUrl (value) {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol)
  } catch {
    return false
  }
}

/**
 * How the agent proves who it is to an MCP server that checks agents against spec.rbac
 * (`mdk run mcp` answers 401 to a request without an agent's access token).
 *
 * `credential` is the long-running form: the service account `mdk sa add` created signs itself
 * in at the Gateway and renews its token before it expires. `token` is a fixed access token, and
 * `mdk sa token` mints one for ten minutes, so it suits a quick test rather than a gateway agent.
 *
 * Checked before anything connects, and every message names the field rather than its value:
 * neither the token nor the key may end up in a log.
 *
 * @param {{ token?: string, credential?: { file: string, gatewayUrl: string } }} [mcp]
 * @returns {{ getToken: () => Promise<string>, reset: ((refused: string) => void)|null }|null} null for no auth
 */
export function mcpAuth (mcp = {}) {
  const { token, credential } = mcp
  if (token !== undefined && credential !== undefined) {
    throw new Error('createAgent: mcp.token and mcp.credential are mutually exclusive')
  }
  if (token !== undefined) {
    if (typeof token !== 'string' || !token.trim()) throw new Error('createAgent: mcp.token must be a non-empty string')
    return { getToken: async () => token.trim(), reset: null }
  }
  if (credential === undefined) return null

  const { file, gatewayUrl } = credential ?? {}
  if (typeof file !== 'string' || !file.trim()) {
    throw new Error('createAgent: mcp.credential.file must name the credential file `mdk sa add` wrote')
  }
  if (!isHttpUrl(gatewayUrl)) throw new Error('createAgent: mcp.credential.gatewayUrl must be an http or https url')

  // Relative to the working directory, which for an app runtime under `mdk run` is the project.
  let body
  try {
    body = JSON.parse(readFileSync(resolve(file), 'utf8'))
  } catch (err) {
    // JSON.parse quotes the text it choked on, which here is the private key: say only which failed.
    throw new Error(`createAgent: mcp.credential.file ${file} is ${err.code ? `unreadable (${err.code})` : 'not JSON'}`)
  }
  if (typeof body?.name !== 'string' || typeof body.privateKeyPem !== 'string') {
    throw new Error(`createAgent: mcp.credential.file ${file} holds no { name, privateKeyPem }`)
  }
  let source
  try {
    source = new ServiceAccountTokenSource({ name: body.name, privateKey: body.privateKeyPem, request: gatewayTokenRequest(gatewayUrl) })
  } catch {
    throw new Error(`createAgent: mcp.credential.file ${file} holds no usable private key`)
  }
  // Requests refused together all saw the same token; only the first refusal of it signs in again.
  let current = null
  return {
    getToken: async () => {
      try {
        current = await source.getToken()
      } catch (err) {
        // A refusal carries its ERR_* code; a Gateway that is not there says only "fetch failed".
        if (err.code?.startsWith('ERR_')) throw err
        throw new Error(`could not sign in at ${gatewayUrl}: ${err.message}`, { cause: err })
      }
      return current
    },
    reset: (refused) => { if (refused === current) source.reset() }
  }
}

// Every request the transport makes carries the agent's token, read per request so a renewed
// one takes over without reconnecting. A 401 to a service account means the server refused its
// token: sign in afresh and send the request once more. A changed key or a deleted account fails
// that sign-in too, since mcpAuth() reads the credential file once.
// The SDK sends a string body, so the retry can resend it.
function authorizedFetch (auth) {
  const send = async (url, init = {}) => {
    const token = await auth.getToken()
    const headers = new Headers(init.headers)
    headers.set('authorization', `Bearer ${token}`)
    return { token, res: await fetch(url, { ...init, headers }) }
  }
  return async (url, init) => {
    const { token, res } = await send(url, init)
    if (res.status !== 401 || !auth.reset) return res
    await res.body?.cancel()
    auth.reset(token)
    return (await send(url, init)).res
  }
}

/**
 * Connect to an MCP tool server over Streamable HTTP.
 *
 * This is the agent's only window onto the fleet — the model never reaches hardware
 * directly, only through these tools.
 *
 * @param {string} url  e.g. http://127.0.0.1:3101/mcp
 * @param {ReturnType<typeof mcpAuth>} [auth]  from mcpAuth(); none sends no Authorization header
 * @returns {Promise<{ url, listTools, callTool, close }>}
 */
export async function connectMcp (url, auth = null) {
  const transport = new StreamableHTTPClientTransport(new URL(url), auth ? { fetch: authorizedFetch(auth) } : undefined)
  const client = new Client({ name: 'mdk-agent', version: '0.0.0' })
  try {
    await client.connect(transport)
  } catch (err) {
    // The SDK's own message for a 401 is "Error POSTing to endpoint:" and nothing after it.
    if (err?.code !== 401) throw err
    const fix = auth ? 'its token was refused; check the service account is registered and the Gateway is the one the MCP server trusts' : 'set mcp.credential to the agent\'s service account'
    throw new Error(`the MCP server at ${url} answered 401: ${fix}`, { cause: err })
  }

  return {
    url,

    // [{ name, description, inputSchema }]
    async listTools () {
      const res = await client.listTools()
      return res.tools ?? []
    },

    // Execute a tool; returns its result as a text string (content blocks flattened).
    async callTool (name, args = {}) {
      const res = await client.callTool({ name, arguments: args })
      const text = (res.content ?? [])
        .map((c) => (c.type === 'text' ? c.text : JSON.stringify(c)))
        .join('\n')
      return { text, isError: res.isError === true }
    },

    async close () {
      try { await client.close() } catch {}
    }
  }
}
