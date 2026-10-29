import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

// @tetherto/mdk-mcp frames every text result as untrusted data:
// `<untrusted-tool-output tool="id">\n…\n</untrusted-tool-output>\n<notice>`. The model reads the
// framed text; code that parses the payload unwraps it first. Text without the frame passes through.
const FRAME = /^<untrusted-tool-output[^>]*>\n([\s\S]*?)\n<\/untrusted-tool-output>(?:\n[^\n]*)?$/

export function unwrapToolText (text) {
  const m = typeof text === 'string' ? FRAME.exec(text.trim()) : null
  return m ? m[1].replaceAll('<\\/untrusted-tool-output', '</untrusted-tool-output') : text
}

/**
 * Connect to an MCP tool server over Streamable HTTP.
 *
 * This is the agent's only window onto the fleet — the model never reaches hardware
 * directly, only through these tools.
 *
 * @param {string} url  e.g. http://127.0.0.1:3101/mcp
 * @returns {Promise<{ url, listTools, callTool, close }>}
 */
export async function connectMcp (url) {
  const transport = new StreamableHTTPClientTransport(new URL(url))
  const client = new Client({ name: 'mdk-agent', version: '0.0.0' })
  await client.connect(transport)

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
