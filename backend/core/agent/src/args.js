import { CAPABILITY } from './tools.js'
import { CAPABILITY_LIMITS, DEFAULT_ENDPOINTS } from './constants.js'
import { PROVIDER } from './provider.js'
import { parseDuration, DEFAULT_TTL } from './cache-reaper.js'

export const DEFAULT_API_KEY_ENV = 'MDK_AGENT_API_KEY'
export const MCP_TOKEN_ENV = 'MDK_AGENT_MCP_TOKEN'

// Kept out of bin/, which has top-level await and process.exit and so cannot be imported by
// any test — logic living there is unreachable rather than merely uncovered.

/**
 * Hosted endpoints we know the shape of. Anything else reaches the same code path through
 * `--provider openai-compatible --base-url ...`; a preset only saves typing a URL and names
 * the environment variable that endpoint's key conventionally lives in.
 */
export const HOSTED = Object.freeze({
  openai: Object.freeze({
    name: 'openai',
    baseURL: 'https://api.openai.com/v1',
    env: 'OPENAI_API_KEY'
  })
})

function value (args, name) {
  const raw = args[name]
  if (raw === undefined) return undefined
  if (typeof raw !== 'string' || !raw.trim()) throw new TypeError(`--${name} needs a value`)
  return raw.trim()
}

function positiveInteger (args, name) {
  const raw = args[name]
  if (raw === undefined) return undefined
  const n = typeof raw === 'string' || typeof raw === 'number' ? Number(raw) : NaN
  if (!Number.isInteger(n) || n < 1) throw new TypeError(`--${name} must be a positive integer`)
  return n
}

/**
 * Describe a provider for display in the banner and /info CLI views.
 */
export function describeProvider (provider) {
  if (provider.kind === PROVIDER.QVAC) return `qvac (${provider.mode})`
  const label = provider.name ?? (() => {
    try { return new URL(provider.baseURL).host } catch { return 'hosted' }
  })()
  return `${label} (hosted)`
}

/**
 * Build the provider config. `--provider` names a known hosted endpoint, or `openai-compatible`
 * with an explicit `--base-url`; absent, the agent stays on qvac.
 *
 * `env` is injected rather than read from process.env so this is testable without mutating the
 * real environment — and so a test can never accidentally pick up a developer's live key.
 *
 * The key is read from the environment first and only then from `--api-key`: an argument is
 * visible to every other process via `ps` and lands in shell history, so the flag is the
 * convenience, not the recommendation.
 *
 * @param {Record<string, string|true>} args
 * @param {Record<string, string|undefined>} env
 * @returns {{kind: string, name?: string, mode?: string, baseURL: string, apiKey?: string, model: string, rpm?: number}}
 * @throws {TypeError} on an unknown provider, a missing key, model or base url, a base url that
 *   is not http(s), or a malformed `--rpm` — so the CLI reports it before connecting to anything.
 */
export function resolveProviderArgs (args = {}, env = {}) {
  const rpm = positiveInteger(args, 'rpm') ?? 0
  const kind = value(args, 'provider')
  if (!kind || kind === PROVIDER.QVAC) {
    return {
      kind: PROVIDER.QVAC,
      mode: value(args, 'mode') ?? 'external',
      baseURL: value(args, 'base-url') ?? DEFAULT_ENDPOINTS.model,
      model: value(args, 'model') ?? 'qwen3-4b',
      rpm
    }
  }

  const preset = Object.hasOwn(HOSTED, kind) ? HOSTED[kind] : (kind === PROVIDER.OPENAI_COMPATIBLE ? {} : null)
  if (!preset) throw new TypeError(`unknown --provider "${kind}" (expected qvac, openai-compatible, ${Object.keys(HOSTED).join(', ')})`)

  const baseURL = value(args, 'base-url') ?? preset.baseURL
  if (!baseURL) throw new TypeError(`--provider ${kind} needs --base-url`)
  const scheme = (() => {
    try {
      return new URL(baseURL).protocol
    } catch {
      return null
    }
  })()
  if (!['http:', 'https:'].includes(scheme)) {
    throw new TypeError(`--base-url must be an http or https url, got "${baseURL}"`)
  }

  const envVal = (k) => k && env[k] && env[k].trim() ? env[k].trim() : null
  const apiKey = envVal(preset.env) ?? envVal(DEFAULT_API_KEY_ENV) ?? value(args, 'api-key')
  if (!apiKey) throw new TypeError(`--provider ${kind} needs an api key — set ${preset.env ?? DEFAULT_API_KEY_ENV} or pass --api-key`)

  const model = value(args, 'model')
  if (!model) throw new TypeError(`--provider ${kind} needs --model`)

  return { kind: PROVIDER.OPENAI_COMPATIBLE, name: preset.name, baseURL, apiKey, model, rpm }
}

/**
 * Build the MCP config, or null for plain chat. `--mcp-credential` with `--gateway-url` signs the
 * agent in as its service account; a fixed token is read from the environment first and only
 * then from `--mcp-token`, for the same reason as the api key. createAgent checks the values.
 *
 * @param {Record<string, string|true>} args
 * @param {Record<string, string|undefined>} env
 * @returns {{url: string, credential?: {file: string, gatewayUrl: string}, token?: string}|null}
 * @throws {TypeError} on a sign-in flag without --mcp-url, a credential without a Gateway (or the
 *   reverse), or a credential and a token together.
 */
export function mcpOptions (args = {}, env = {}) {
  const url = value(args, 'mcp-url')
  const file = value(args, 'mcp-credential')
  const gatewayUrl = value(args, 'gateway-url')
  const flagToken = value(args, 'mcp-token')
  if (!url) {
    if (file || gatewayUrl || flagToken) throw new TypeError('--mcp-credential, --gateway-url and --mcp-token need --mcp-url')
    return null
  }
  if (file && !gatewayUrl) throw new TypeError('--mcp-credential needs --gateway-url, the Gateway the agent signs in at')
  if (gatewayUrl && !file) throw new TypeError('--gateway-url needs --mcp-credential, the service account that signs in there')

  const token = env[MCP_TOKEN_ENV]?.trim() || flagToken
  if (file && token) throw new TypeError(`--mcp-credential and a token (${MCP_TOKEN_ENV} or --mcp-token) are mutually exclusive`)
  if (file) return { url, credential: { file, gatewayUrl } }
  if (token) return { url, token }
  return { url }
}

/**
 * Decide the capability and what a turn of it may spend.
 *
 * Nothing is inferred from the model id. A name is not evidence — an alias, a fine-tune or a
 * local tag says nothing about what is behind it, and a wrong guess upward is the expensive
 * direction. A bigger local model is declared, and the default is the floor.
 *
 * A hosted endpoint is the one exception, and it is read from the provider rather than the
 * name: reaching for one is already the decision to use a frontier model.
 *
 * @param {Record<string, string|true>} args
 * @param {{kind?: string}} [provider] the resolved provider, for the hosted default
 * @returns {{capability: string, declared: boolean, limits: {maxSteps: number, maxOutputTokens: number}}}
 * @throws {TypeError} on an unknown capability or a non-positive budget override.
 */
export function runtimeOptions (args = {}, provider = {}) {
  const asked = value(args, 'capability')
  const byProvider = provider.kind === PROVIDER.OPENAI_COMPATIBLE ? CAPABILITY.LARGE : CAPABILITY.SMALL
  const capability = asked ?? byProvider
  if (!Object.values(CAPABILITY).includes(capability)) {
    throw new TypeError(`--capability must be one of ${Object.values(CAPABILITY).join(', ')}`)
  }

  const budget = CAPABILITY_LIMITS[capability]
  return {
    capability,
    declared: asked !== undefined,
    limits: {
      maxSteps: positiveInteger(args, 'max-steps') ?? budget.maxSteps,
      maxOutputTokens: positiveInteger(args, 'max-output-tokens') ?? budget.maxOutputTokens
    }
  }
}

/**
 * Parse `--flag value` pairs. A flag with no value, or one followed by another flag, is `true`
 * rather than swallowing the next flag as its value.
 *
 * @param {string[]} argv
 * @returns {Record<string, string|true>}
 */
export function parseArgs (argv) {
  const out = {}
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue
    const key = argv[i].slice(2)
    const next = argv[i + 1]
    out[key] = (next == null || next.startsWith('--')) ? true : argv[++i]
  }
  return out
}

// Flags that select what runs or where output goes. Checked as a set rather than one at a
// time: guarding them individually is how --tag was added without one and silently ran the
// whole battery instead of the subset asked for.
const VALUE_FLAGS = ['only', 'tag', 'out', 'battery', 'reap-ttl', 'reap-dir']

/**
 * How long a KV-cache entry survives an eval run, in ms, or `null` when `--no-reap` asked for
 * no sweep at all. Defaulted rather than opt-in: `qvac serve` reclaims nothing by itself, so a
 * run that does not sweep leaves its cache on the server's disk permanently.
 *
 * @throws {TypeError} on a duration the reaper cannot parse.
 */
function reapTtl (args) {
  if (Object.hasOwn(args, 'no-reap')) return null
  try {
    return parseDuration(args['reap-ttl'] ?? DEFAULT_TTL)
  } catch (err) {
    throw new TypeError(`--reap-ttl: ${err.message}`)
  }
}

/**
 * Validate the `--eval` flags and return them normalised.
 *
 * @param {Record<string, string|true>} args
 * @returns {{reps: number, concurrency: number, only: string|null, tag: string|null, out: string|null, battery: string|null, reapTtlMs: number|null, reapDir: string|null}}
 * @throws {TypeError} on any malformed flag, so the CLI can report it before connecting to
 *   anything — waiting on a model load to then reject a typo costs a minute per attempt.
 */
export function evalOptions (args = {}) {
  const reps = positiveInteger(args, 'reps') ?? 1
  const concurrency = positiveInteger(args, 'concurrency') ?? 1
  // Empty counts as missing. A script passing --only "$FILTER" with FILTER unset would
  // otherwise select nothing to filter on and quietly run the whole battery.
  for (const name of VALUE_FLAGS) {
    const raw = args[name]
    if (raw === undefined) continue
    if (typeof raw !== 'string' || !raw.trim()) throw new TypeError(`--${name} needs a value`)
  }
  return {
    reps,
    concurrency,
    only: typeof args.only === 'string' ? args.only : null,
    tag: typeof args.tag === 'string' ? args.tag : null,
    out: typeof args.out === 'string' ? args.out : null,
    // A second question set is named, never appended to battery.json: that file's hash is what
    // makes a gate comparison mean anything, and it must not move.
    battery: typeof args.battery === 'string' ? args.battery : null,
    reapTtlMs: reapTtl(args),
    // Null leaves the root to the reaper's default. The two are not the same machine in the
    // shared-inference shape, nor the same home directory when the agent runs under WSL and
    // `qvac serve` runs on the Windows host.
    reapDir: typeof args['reap-dir'] === 'string' ? args['reap-dir'] : null
  }
}
