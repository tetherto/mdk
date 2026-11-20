import test from 'brittle'
import { parseArgs, evalOptions, resolveProviderArgs, runtimeOptions, describeProvider, mcpOptions, DEFAULT_API_KEY_ENV, MCP_TOKEN_ENV } from '../../src/args.js'
import { PROVIDER } from '../../src/provider.js'
import { CAPABILITY_LIMITS } from '../../src/constants.js'
import { CAPABILITY } from '../../src/tools.js'

const DAY_MS = 24 * 36e5

const rejection = (fn) => {
  try {
    fn()
    return null
  } catch (err) {
    return err.message
  }
}

test('parseArgs reads values and does not swallow the next flag', (t) => {
  t.alike(parseArgs(['--model', 'qwen3-4b', '--eval']), { model: 'qwen3-4b', eval: true })
  t.alike(parseArgs(['--tag', '--reps', '2']), { tag: true, reps: '2' }, 'a flag is never another flag\'s value')
  t.alike(parseArgs(['--tag']), { tag: true }, 'a trailing flag has no value')
  t.alike(parseArgs([]), {})
  t.alike(parseArgs(['stray', '--only', 'rank-']), { only: 'rank-' }, 'positional arguments are ignored')
})

// A flag whose value is missing parses as `true`. Falling back to null instead of rejecting it
// ran the whole 259-case battery in place of the subset asked for — twenty minutes reporting a
// number for questions nobody selected.
test('a value flag given without a value is rejected, not ignored', (t) => {
  for (const name of ['only', 'tag', 'out']) {
    let message = null
    try {
      evalOptions({ [name]: true })
    } catch (err) {
      message = err.message
    }
    t.is(message, `--${name} needs a value`, `--${name} is checked`)
  }
})

// The realistic trigger is a script passing --only "$FILTER" with FILTER unset. An empty
// filter matches every id, so it selects everything — the same outcome as the missing value
// this guard exists to catch.
test('an empty or blank value is treated as missing, not as a filter', (t) => {
  for (const name of ['only', 'tag', 'out']) {
    for (const value of ['', '   ']) {
      let message = null
      try {
        evalOptions({ [name]: value })
      } catch (err) {
        message = err.message
      }
      t.is(message, `--${name} needs a value`, `--${name} ${JSON.stringify(value)} is rejected`)
    }
  }
})

test('evalOptions normalises what runs and where it goes', (t) => {
  t.alike(evalOptions({}), { reps: 1, concurrency: 1, only: null, tag: null, out: null, battery: null, reapTtlMs: DAY_MS, reapDir: null })
  t.alike(evalOptions({ reps: '3', concurrency: '6', tag: 'rank', only: 'decline-', out: 'r.json' }),
    { reps: 3, concurrency: 6, only: 'decline-', tag: 'rank', out: 'r.json', battery: null, reapTtlMs: DAY_MS, reapDir: null })
})

// The flag was registered, documented and destructured by the runner, and dropped from this
// return, so --battery pointed at a second question set and the default one ran instead. Nothing
// failed: the run reported a full pass over questions nobody asked for.
test('evalOptions carries the question set it was told to run', (t) => {
  t.is(evalOptions({ battery: 'eval/tiered.json' }).battery, 'eval/tiered.json')
  t.is(evalOptions({}).battery, null, 'absent, the frozen battery runs')
  t.is(rejection(() => evalOptions({ battery: '   ' })), '--battery needs a value')
})

// The reaper shipped a fortnight before anything called it and ~/.qvac/kv-cache reached 587 GB,
// which is a full disk rather than a slow one. What prevents the repeat is the default, so that
// is the assertion worth holding: a run nobody configured still sweeps.
test('evalOptions reaps the kv-cache by default and can be told not to', (t) => {
  t.is(evalOptions({}).reapTtlMs, DAY_MS, 'an unconfigured run still reaps')
  t.is(evalOptions({ 'reap-ttl': '6h' }).reapTtlMs, 6 * 36e5)
  t.is(evalOptions({ 'reap-ttl': '90m' }).reapTtlMs, 90 * 6e4, 'the duration grammar the reaper already speaks')
  t.is(evalOptions({ 'no-reap': true }).reapTtlMs, null, '--no-reap leaves the cache alone')
})

// The agent and `qvac serve` need not share a home directory — under WSL against a Windows host
// they do not — and a sweep of the wrong root reports success having freed nothing.
test('evalOptions carries an explicit cache root', (t) => {
  t.is(evalOptions({ 'reap-dir': '/srv/.qvac/kv-cache' }).reapDir, '/srv/.qvac/kv-cache')
  t.is(evalOptions({}).reapDir, null, 'absent, the reaper chooses the root')
})

test('evalOptions rejects a reap duration it cannot parse', (t) => {
  t.is(rejection(() => evalOptions({ 'reap-ttl': 'soon' })),
    '--reap-ttl: invalid duration "soon" (expected e.g. 30m, 24h, 7d)')
  t.is(rejection(() => evalOptions({ 'reap-ttl': true })), '--reap-ttl needs a value')
  t.is(rejection(() => evalOptions({ 'reap-ttl': '   ' })), '--reap-ttl needs a value')
  t.is(rejection(() => evalOptions({ 'reap-dir': true })), '--reap-dir needs a value')
})

test('evalOptions rejects counts that would run nothing or make no sense', (t) => {
  const rejects = (args) => {
    try {
      evalOptions(args)
      return null
    } catch (err) {
      return err.message
    }
  }
  t.ok(/--reps/.test(rejects({ reps: '0' })))
  t.ok(/--reps/.test(rejects({ reps: '1.5' })))
  t.ok(/--reps/.test(rejects({ reps: 'many' })))
  t.ok(/--reps/.test(rejects({ reps: true })), 'a bare --reps is a missing value too')
  t.ok(/--concurrency/.test(rejects({ concurrency: '0' })))
  t.ok(/--concurrency/.test(rejects({ concurrency: '-2' })))
})

// ── resolveProviderArgs ──────────────────────────────────────────────────────

test('no --provider keeps the agent on the local model', (t) => {
  t.alike(resolveProviderArgs({}, {}), {
    kind: PROVIDER.QVAC,
    mode: 'external',
    baseURL: 'http://127.0.0.1:11500/v1',
    model: 'qwen3-4b',
    rpm: 0
  }, 'local is what you get by not asking for anything else')
})

test('a hosted provider is built from its preset', (t) => {
  const p = resolveProviderArgs({ provider: 'openai', model: 'gpt-5.5' }, { OPENAI_API_KEY: 'k' })
  t.is(p.kind, PROVIDER.OPENAI_COMPATIBLE)
  t.is(p.name, 'openai')
  t.is(p.baseURL, 'https://api.openai.com/v1')
  t.is(p.apiKey, 'k')

  // The preset is a shortcut, not a lock: an Azure deployment or a corporate proxy speaks the
  // same protocol at another address, and reaching it must not require abandoning the preset.
  const proxied = resolveProviderArgs({ provider: 'openai', model: 'gpt-5.5', 'base-url': 'https://proxy.internal/v1' }, { OPENAI_API_KEY: 'k' })
  t.is(proxied.baseURL, 'https://proxy.internal/v1', 'an explicit --base-url beats the preset')
})

// value() only rejects an empty string, so a typo reaches the CLI as a plausible-looking url and
// blows up in the off-site warning that builds a URL from it — a stack trace instead of the
// clean message every other misconfiguration gets.
test('a --base-url that is not an http url is refused here, not at the first request', (t) => {
  const bad = (url) => rejection(() => resolveProviderArgs({ provider: 'openai', model: 'm', 'base-url': url }, { OPENAI_API_KEY: 'k' }))
  const refused = /--base-url must be an http or https url/

  t.ok(refused.test(bad('not-a-url')))
  t.ok(refused.test(bad('api.openai.com/v1')), 'a missing scheme is the likely typo')
  // new URL() accepts any scheme, so parsing alone would let these through to a client that
  // only speaks http and fail somewhere with less to say about it.
  t.ok(refused.test(bad('ftp://proxy.internal/v1')))
  t.ok(refused.test(bad('file:///etc/passwd')))
  t.is(bad('https://proxy.internal/v1'), null, 'a real url passes')
  t.is(bad('http://127.0.0.1:11500/v1'), null, 'including a local one')
})

// HOSTED.constructor and HOSTED.toString are truthy through the prototype chain, so a plain
// lookup accepted provider names the error message never offered — and one of them reached the
// banner as "undefined (hosted)".
test('only the presets we declare are accepted as a provider', (t) => {
  const bad = (kind) => rejection(() => resolveProviderArgs({ provider: kind, model: 'm', 'base-url': 'https://x.test/v1' }, { MDK_AGENT_API_KEY: 'k' }))

  t.ok(/unknown --provider "constructor"/.test(bad('constructor')))
  t.ok(/unknown --provider "toString"/.test(bad('toString')))
  t.ok(/unknown --provider "__proto__"/.test(bad('__proto__')))
  t.is(bad('openai-compatible'), null, 'the escape hatch still works')
})

// The environment is checked before the flag, so a key in argv cannot silently shadow the one
// the operator meant to use — and so the safer habit is the one that wins.
test('the environment beats --api-key, and the generic variable is a fallback', (t) => {
  const args = { provider: 'openai', model: 'm', 'api-key': 'from-argv' }
  t.is(resolveProviderArgs(args, { OPENAI_API_KEY: 'from-env' }).apiKey, 'from-env')
  t.is(resolveProviderArgs(args, { [DEFAULT_API_KEY_ENV]: 'generic' }).apiKey, 'generic')
  t.is(resolveProviderArgs(args, {}).apiKey, 'from-argv', 'the flag still works when nothing else is set')
})

test('an exported-but-empty env variable is treated as missing and falls through', (t) => {
  const args = { provider: 'openai', model: 'm', 'api-key': 'from-argv' }
  t.is(resolveProviderArgs(args, { OPENAI_API_KEY: '', [DEFAULT_API_KEY_ENV]: 'generic' }).apiKey, 'generic')
  t.is(resolveProviderArgs(args, { OPENAI_API_KEY: '   ', [DEFAULT_API_KEY_ENV]: 'generic' }).apiKey, 'generic')
  t.is(resolveProviderArgs(args, { OPENAI_API_KEY: '', [DEFAULT_API_KEY_ENV]: '' }).apiKey, 'from-argv')
})

test('a hosted provider names whichever piece is missing', (t) => {
  t.ok(/needs an api key/.test(rejection(() => resolveProviderArgs({ provider: 'openai', model: 'm' }, {}))))
  t.ok(/needs --model/.test(rejection(() => resolveProviderArgs({ provider: 'openai' }, { OPENAI_API_KEY: 'k' }))))
  t.ok(/needs --base-url/.test(rejection(() => resolveProviderArgs({ provider: 'openai-compatible', model: 'm' }, { MDK_AGENT_API_KEY: 'k' }))))
  t.ok(/unknown --provider "bogus"/.test(rejection(() => resolveProviderArgs({ provider: 'bogus' }, {}))))
})

// A bare --rpm parses as `true`. The `typeof raw === 'string'` guard is what turns that into a
// rejection: without it Number(true) is 1, and the run would be throttled to one request per
// minute rather than the typo being reported. The integer check catches a different set.
test('--rpm is a positive integer or nothing at all', (t) => {
  const hosted = (extra) => resolveProviderArgs({ provider: 'openai', model: 'm', ...extra }, { OPENAI_API_KEY: 'k' })

  t.is(hosted().rpm, 0, 'unset means unpaced')
  t.is(hosted({ rpm: '30' }).rpm, 30)
  t.ok(/--rpm must be a positive integer/.test(rejection(() => hosted({ rpm: true }))), 'a bare --rpm is a typo, not one per minute')
  t.ok(/--rpm must be a positive integer/.test(rejection(() => hosted({ rpm: '0' }))))
  t.ok(/--rpm must be a positive integer/.test(rejection(() => hosted({ rpm: '2.5' }))))
  t.ok(/--rpm must be a positive integer/.test(rejection(() => hosted({ rpm: 'lots' }))))
  t.ok(/--rpm must be a positive integer/.test(rejection(() => resolveProviderArgs({ rpm: 'invalid' }))))
})

test('describeProvider formats provider names cleanly', (t) => {
  t.is(describeProvider({ kind: PROVIDER.QVAC, mode: 'external' }), 'qvac (external)')
  t.is(describeProvider({ kind: PROVIDER.OPENAI_COMPATIBLE, name: 'openai' }), 'openai (hosted)')
  t.is(describeProvider({ kind: PROVIDER.OPENAI_COMPATIBLE, baseURL: 'https://api.groq.com/openai/v1' }), 'api.groq.com (hosted)')
})

// ── runtimeOptions: the capability is one knob for tools AND turn budget ───────────

// Written as literals rather than read from CAPABILITY_LIMITS: comparing the function's output
// against the table the function reads asserts that the table equals itself, and stays green
// with every tier collapsed to the same numbers.
test('each capability carries its own step and token budget', (t) => {
  const budget = (capability) => {
    const { maxSteps, maxOutputTokens } = runtimeOptions({ capability }).limits
    return { maxSteps, maxOutputTokens }
  }

  t.alike(budget('small'), { maxSteps: 6, maxOutputTokens: 2048 })
  t.alike(budget('mid'), { maxSteps: 8, maxOutputTokens: 4096 })
  t.alike(budget('large'), { maxSteps: 10, maxOutputTokens: 8192 })
  t.is(runtimeOptions({}).capability, CAPABILITY.SMALL, 'the floor is the default')
})

// The property the table exists for. Three identical rows satisfy every per-row assertion above,
// and ship a --capability large that buys nothing — a failure that shows up only as answers
// arriving short, which is the hardest symptom to trace back to its cause.
test('a higher capability buys a strictly larger budget', (t) => {
  const steps = Object.values(CAPABILITY).map((c) => CAPABILITY_LIMITS[c].maxSteps)
  const tokens = Object.values(CAPABILITY).map((c) => CAPABILITY_LIMITS[c].maxOutputTokens)

  t.alike(steps, [...steps].sort((a, b) => a - b), 'steps rise with capability')
  t.alike(tokens, [...tokens].sort((a, b) => a - b), 'so do tokens')
  t.is(new Set(steps).size, steps.length, 'and no two capabilities spend the same')
  t.is(new Set(tokens).size, tokens.length)
})

// Adopting a capability is not accepting all of it: an override moves one number and leaves the
// rest of the tier alone.
test('an explicit budget overrides its tier, one number at a time', (t) => {
  const steps = runtimeOptions({ capability: 'small', 'max-steps': '12' }).limits
  t.is(steps.maxSteps, 12, 'the override wins')
  t.is(steps.maxOutputTokens, 2048, 'and the untouched number still comes from the tier')

  const tokens = runtimeOptions({ capability: 'small', 'max-output-tokens': '9000' }).limits
  t.is(tokens.maxOutputTokens, 9000)
  t.is(tokens.maxSteps, 6)

  t.ok(/--max-steps must be a positive integer/.test(rejection(() => runtimeOptions({ 'max-steps': '0' }))))
  t.ok(/--max-output-tokens must be a positive integer/.test(rejection(() => runtimeOptions({ 'max-output-tokens': true }))))
})

test('an unknown capability is named, not read as a missing budget', (t) => {
  t.ok(/--capability must be one of small, mid, large/.test(rejection(() => runtimeOptions({ capability: 'huge' }))))
})

// A model name is not evidence of what is behind it: an alias, a fine-tune or a local tag says
// nothing, and guessing upward is the direction that produces runaway turns. So a bigger local
// model is declared, never detected — including one whose name announces its size.
test('nothing is inferred from the model name', (t) => {
  for (const model of ['qwen3-4b', 'llama-70b', 'some-huge-model', 'my-finetune']) {
    const o = runtimeOptions({ model }, { kind: 'qvac' })
    t.is(o.capability, CAPABILITY.SMALL, `${model} still defaults to the floor`)
    t.absent(o.declared, 'and reports that nobody chose it')
  }
})

// Reaching for a hosted endpoint is already the decision to use a frontier model, and it is read
// from the provider rather than from the name — so it cannot go stale the way a lookup would.
test('a hosted endpoint defaults to large, a local one to small', (t) => {
  t.is(runtimeOptions({}, { kind: 'openai-compatible' }).capability, CAPABILITY.LARGE)
  t.is(runtimeOptions({}, { kind: 'qvac' }).capability, CAPABILITY.SMALL)
  t.is(runtimeOptions({}).capability, CAPABILITY.SMALL, 'and no provider at all is the floor')
})

test('an explicit capability beats the provider default, in both directions', (t) => {
  const hosted = runtimeOptions({ capability: 'small' }, { kind: 'openai-compatible' })
  t.is(hosted.capability, CAPABILITY.SMALL, 'a hosted endpoint can be held down')
  t.ok(hosted.declared)

  const local = runtimeOptions({ capability: 'mid' }, { kind: 'qvac' })
  t.is(local.capability, CAPABILITY.MID, 'and a local one raised')
  t.ok(local.declared, 'both report that somebody chose')
})

// The commonest reason an answer arrives short is a capability nobody set, so the CLI has to be
// able to say which it was rather than printing a number with no provenance.
test('a chosen capability is told apart from a fallen-back one', (t) => {
  t.absent(runtimeOptions({}, { kind: 'qvac' }).declared)
  t.absent(runtimeOptions({}, { kind: 'openai-compatible' }).declared, 'a provider default is not a declaration')
  t.ok(runtimeOptions({ capability: 'small' }, { kind: 'qvac' }).declared,
    'declaring the same value the default would have given still counts as declaring it')
})

const MCP = 'http://127.0.0.1:3947/mcp'
const GATEWAY = 'http://127.0.0.1:3847'
const CRED = '.mdk/credentials/agents/operator-agent.json'

test('no --mcp-url is plain chat, whatever the environment holds', (t) => {
  t.is(mcpOptions({}, {}), null)
  t.is(mcpOptions({}, { [MCP_TOKEN_ENV]: 'tok' }), null, 'an exported token does not conjure a server')
})

test('--mcp-url alone connects without signing in', (t) => {
  t.alike(mcpOptions({ 'mcp-url': MCP }, {}), { url: MCP })
})

test('--mcp-credential with --gateway-url signs in as the service account', (t) => {
  t.alike(
    mcpOptions({ 'mcp-url': MCP, 'mcp-credential': CRED, 'gateway-url': GATEWAY }, {}),
    { url: MCP, credential: { file: CRED, gatewayUrl: GATEWAY } }
  )
})

test('a fixed token comes from the environment before --mcp-token', (t) => {
  t.alike(mcpOptions({ 'mcp-url': MCP, 'mcp-token': 'flag' }, {}), { url: MCP, token: 'flag' })
  t.alike(mcpOptions({ 'mcp-url': MCP, 'mcp-token': 'flag' }, { [MCP_TOKEN_ENV]: ' env ' }), { url: MCP, token: 'env' })
  t.alike(mcpOptions({ 'mcp-url': MCP }, { [MCP_TOKEN_ENV]: '  ' }), { url: MCP }, 'an exported-but-empty token is missing')
})

test('mcpOptions names the sign-in flag that is missing or in conflict', (t) => {
  t.ok(/need --mcp-url/.test(rejection(() => mcpOptions({ 'mcp-credential': CRED, 'gateway-url': GATEWAY }, {}))), 'credential without a server')
  t.ok(/need --mcp-url/.test(rejection(() => mcpOptions({ 'mcp-token': 'tok' }, {}))), 'token without a server')
  t.ok(/--mcp-credential needs --gateway-url/.test(rejection(() => mcpOptions({ 'mcp-url': MCP, 'mcp-credential': CRED }, {}))))
  t.ok(/--gateway-url needs --mcp-credential/.test(rejection(() => mcpOptions({ 'mcp-url': MCP, 'gateway-url': GATEWAY }, {}))))
  t.ok(/mutually exclusive/.test(rejection(() => mcpOptions({ 'mcp-url': MCP, 'mcp-credential': CRED, 'gateway-url': GATEWAY }, { [MCP_TOKEN_ENV]: 'tok' }))))
  t.ok(/--mcp-url needs a value/.test(rejection(() => mcpOptions({ 'mcp-url': true }, {}))), 'a bare --mcp-url')
})
