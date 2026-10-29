import { resolveProvider } from './provider.js'
import { connectMcp } from './mcp.js'
import { Session } from './session.js'
import { MemorySessionStore } from './session-store.js'
import { admitTools, CAPABILITY } from './tools.js'
import { charterVersionFor } from './charter.js'

/**
 * QVAC model endpoint. `external` talks to an already-running server; `managed` spawns one.
 *
 * @typedef {object} ProviderConfig
 * @property {'qvac'} kind
 * @property {string} model                        e.g. `'qwen3-4b'`
 * @property {'external'|'managed'} [mode]         default `'external'` when `baseURL` is set, else `'managed'`
 * @property {string} [baseURL]                    required in external mode, e.g. `'http://127.0.0.1:11500/v1'`
 * @property {string} [apiKey]                     default `'qvac'`
 * @property {object} [modelConfig]                managed-mode serve overrides (`ctx_size`, `reasoning_budget`, …)
 */

/**
 * Streamable HTTP MCP tool server. Omit the whole object for plain grounded chat (no tools).
 *
 * @typedef {object} McpConfig
 * @property {string} url                          e.g. `'http://127.0.0.1:3101/mcp'`
 */

/**
 * Per-turn generation caps. Missing fields fall back to `{ maxSteps: 4, maxOutputTokens: 512 }`.
 *
 * @typedef {object} AgentLimits
 * @property {number} [maxSteps]
 * @property {number} [maxOutputTokens]
 */

/**
 * @typedef {object} CreateSessionOptions
 * @property {string} [userId]                     default `'local'`
 * @property {object} [metadata]
 */

/**
 * @typedef {object} ResumeSessionOptions
 * @property {string} userId                       required — who is asking; no default
 */

/**
 * @typedef {object} Agent
 * @property {object} provider
 * @property {object|null} mcp
 * @property {object[]} tools
 * @property {object[]} skipped
 * @property {string} charterVersion            version stamp of the charter this agent runs
 * @property {boolean} strictToolGating         whether small-model tool gating is in force
 * @property {import('./session-store.js').MemorySessionStore} store
 * @property {(opts?: { timeoutMs?: number, onWait?: function }) => Promise<number>} waitReady
 * @property {(opts?: CreateSessionOptions) => Promise<import('./session.js').Session>} createSession
 * @property {(id: string, opts: ResumeSessionOptions) => Promise<import('./session.js').Session|null>} resumeSession
 * @property {() => Promise<void>} close
 */

/**
 * @typedef {object} AgentConfig
 * @property {ProviderConfig} provider             required
 * @property {McpConfig} [mcp]                     `{ url }` of a Streamable HTTP MCP server
 * @property {AgentLimits} [limits]
 * @property {string} [system]                     override the operator-assistant charter
 * @property {string} [charter]                    alias for `system`; the agent's standing instruction
 * @property {string} [charterVersion]            version stamp for the charter; default `'v2'`, or `'custom'` for a custom charter with no version given
 * @property {boolean} [strictToolGating]          small-model tool gating; default `true`. `false` admits standard MCP tools for a stronger domain agent
 * @property {'small'|'mid'|'large'} [capability]  tool-admission floor; default `'small'`, or `'mid'` when strictToolGating is false
 * @property {string[]} [notCovered]               topics the prompt says tools do not cover; `[]` drops the block
 * @property {import('./session-store.js').MemorySessionStore} [store]  default in-memory; supply Redis/SQL for a gateway
 */

/**
 * Create an agent — the sole public factory.
 *
 * The agent is long-lived and owns the shared provider connection and, when `config.mcp`
 * is given, the MCP tool connection. Sessions are cheap and per-conversation.
 *
 * Tools are admitted here and only here, so every session shares one filtered, identically
 * ordered list — which is what keeps their prompt prefix identical.
 *
 * @param {AgentConfig} [config]
 * @returns {Promise<Agent>}
 */
export async function createAgent (config = {}) {
  if (!config.provider) throw new Error('createAgent: config.provider is required')

  const provider = await resolveProvider(config.provider)
  const limits = config.limits ?? {}
  // `charter` is the named alias; `system` is kept as the back-compatible spelling. A caller that
  // supplies both gets `charter`, since it is the more specific name.
  const system = config.charter ?? config.system
  if (system !== undefined && (typeof system !== 'string' || !system.trim())) {
    throw new Error('createAgent: charter must be a non-empty string')
  }
  const strictToolGating = config.strictToolGating ?? true
  const capability = config.capability ?? (strictToolGating ? CAPABILITY.SMALL : CAPABILITY.MID)
  if (!strictToolGating && capability === CAPABILITY.SMALL) {
    throw new Error(`createAgent: strictToolGating:false requires capability "mid" or higher, got "${capability}"`)
  }
  const charterVersion = config.charterVersion ?? charterVersionFor(system)
  const notCovered = config.notCovered
  const store = config.store ?? new MemorySessionStore()

  let mcp = null
  let tools = []
  let skipped = []
  if (config.mcp?.url) {
    mcp = await connectMcp(config.mcp.url)
    ;({ admitted: tools, skipped } = admitTools(await mcp.listTools(), { capability, strictToolGating }))
  }

  /**
   * Build a session around a store record.
   *
   * Identity is applied after the caller's options and cannot be overridden: a caller may still
   * vary the charter or the limits, but not bind a session to a record it does not own. One
   * function rather than two, so the rule cannot hold in one path and lapse in the other.
   */
  const sessionFrom = (record, opts = {}) => new Session({
    provider,
    system,
    limits,
    tools,
    mcp,
    notCovered,
    ...opts,
    charterVersion,
    strictToolGating,
    store,
    id: record.id,
    userId: record.userId,
    messages: record.messages
  })

  return {
    provider,
    mcp,
    tools,
    skipped,
    system,
    charterVersion,
    strictToolGating,

    waitReady (opts) {
      return provider.waitReady(opts)
    },

    store,

    /**
     * Start a conversation. Async because the store is asked for the record first, which over a
     * network is a round trip.
     */
    async createSession (opts = {}) {
      const { userId = 'local', metadata, ...rest } = opts
      return sessionFrom(await store.create({ userId, metadata }), rest)
    },

    /**
     * Pick a conversation back up by id.
     *
     * `userId` says who is asking and has no default: a session id travels in URLs an operator
     * can see, so an id alone is not authority to read the conversation behind it, and a default
     * is what a caller forgets. Returns null for never-existed, expired, and owned by somebody
     * else alike — distinguishing them would confirm the id exists.
     */
    async resumeSession (id, { userId, ...opts } = {}) {
      if (typeof userId !== 'string' || !userId.trim()) {
        throw new TypeError('resumeSession needs the userId of whoever is asking')
      }
      const record = await store.get(id)
      if (!record || record.userId !== userId) return null
      return sessionFrom(record, opts)
    },

    /**
     * Release what the agent opened: the MCP connection and the provider.
     *
     * Not the store. A caller that supplied one owns its lifetime — closing somebody else's
     * Redis client here would be the agent reaching past its own boundary — and the default
     * in-memory one dies with the agent that holds it.
     */
    async close () {
      await mcp?.close()
      await provider.close?.()
    }
  }
}
