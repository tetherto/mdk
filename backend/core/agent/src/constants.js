import { VERB, CAPABILITY } from './tools.js'

/**
 * What each capability is allowed to spend on one turn.
 *
 * The capability already decides which tools are admitted. It has to decide this too, because
 * the two are the same judgement: a model trusted with harder tools is a model trusted to take
 * more steps to use them.
 *
 * A step is one model call, not one tool call — the answer costs a step of its own, as does a
 * repair after malformed JSON and an acknowledgement after a rejected write. So `small` affords
 * about five tool calls, not six. A question that fans out over the whole fleet does not fit any
 * of these numbers and belongs in a tool that fans out internally, not in a larger budget.
 *
 * `small` is a 4B — the model this agent was measured on, and the floor it is expected to run
 * against. Anything below that is not supported: the tool loop asks for JSON on demand and a
 * sub-billion model does not reliably produce it.
 *
 * maxOutputTokens rises faster than steps because a reasoning model spends this same budget on
 * its thinking before emitting a visible token, and a local model served with thinking disabled
 * spends all of it on the answer.
 */
export const CAPABILITY_LIMITS = Object.freeze({
  [CAPABILITY.SMALL]: Object.freeze({ maxSteps: 6, maxOutputTokens: 2048 }),
  [CAPABILITY.MID]: Object.freeze({ maxSteps: 8, maxOutputTokens: 4096 }),
  [CAPABILITY.LARGE]: Object.freeze({ maxSteps: 10, maxOutputTokens: 8192 })
})

export const DEFAULT_LIMITS = CAPABILITY_LIMITS[CAPABILITY.SMALL]

export const MAX_REPAIR_RETRIES = 2
export const MAX_ARG_FIXES = 2
export const MAX_ECHO_RETRIES = 1
// Two, not one: a single retry was measured recovering the first ungrounded answer but not the
// shape a conversation with history falls into, where the model narrates a tool call in prose
// ("summarize_site was called. 12 workers and 143 devices are online.") and repeats the narration
// when nudged once. The second attempt is what reaches the tool.
export const MAX_STALE_RETRIES = 2

/**
 * How long a model call may go without producing anything before the turn is abandoned.
 *
 * Not a deadline on the turn: the timer resets on every part that arrives, so a long answer is
 * never cut off for being long. It covers the case retries do not — a request that succeeds and
 * then goes quiet. Retries fire when a request *fails*; a stalled stream never fails, so the loop
 * parks on a read, the gateway holds the SSE socket open, and the operator watches the thinking
 * dots until they give up.
 *
 * Two minutes because the same window has to cover prefill, which on a cold KV cache with a full
 * transcript is the slowest thing that happens in a healthy turn. Override per deployment with
 * `limits.stallTimeoutMs`.
 */
export const DEFAULT_STALL_TIMEOUT_MS = 120_000

/**
 * Where the pieces listen when nothing says otherwise — the local QVAC server and the demo's
 * MCP endpoint.
 *
 * Here rather than at each use because these were written out in six files: the flag default,
 * the error that hints at the flag, and both eval runners. Literals that mean the same thing in
 * several places do not stay the same, and the one that drifts is found by someone debugging
 * why a runner cannot reach a server everything else can.
 */
export const DEFAULT_ENDPOINTS = Object.freeze({
  model: 'http://127.0.0.1:11500/v1',
  mcp: 'http://127.0.0.1:3101/mcp'
})

/**
 * How long one model call may take before the turn gives up on it.
 *
 * Nothing bounded a request until a batch run stopped dead on one that never answered — the
 * server was healthy and replying to everything else, and a single stream simply stopped. There
 * is no upper bound in the protocol, so without one here a turn can wait forever: at a CLI that
 * is a prompt that never returns, and behind a gateway it is a request handler that never
 * returns while its session stays locked mid-turn.
 *
 * Generous on purpose. A local 4B with tools answers in seconds and a hosted reasoning model
 * has been seen to take twenty-five, so two minutes never fires on a slow answer — only on one
 * that is not coming. It bounds a call, not a turn: a turn may make several.
 */
export const REQUEST_TIMEOUT_MS = 120_000

// Read verbs, for servers that do not annotate their tools. Derived from the taxonomy rather
// than a list of names, which would go stale the moment a tool is renamed.
const READ_VERBS = Object.values(VERB).filter((v) => v !== VERB.ACT)

/**
 * Does this tool call need explicit human approval?
 *
 * Fails safe: gated unless known read-only, either by the server's readOnlyHint or by a read
 * verb in the name, so a new, renamed or unrecognised write tool is never executed silently.
 * `tool` is the MCP tool descriptor and may be undefined.
 *
 * A server stating only destructiveHint has still said the call writes, and that outranks the
 * name — guessing from a verb is the fallback for a server that said nothing, not a way to
 * overrule one that spoke. readOnlyHint stays authoritative where both are present.
 */
export function requiresApproval (name, tool) {
  const hints = tool?.annotations ?? {}
  if (hints.readOnlyHint === true) return false // server says read-only
  if (hints.readOnlyHint === false) return true // server says it writes
  if (hints.destructiveHint === true) return true // said only that it is destructive
  return !READ_VERBS.some((verb) => String(name).startsWith(`${verb}_`))
}
