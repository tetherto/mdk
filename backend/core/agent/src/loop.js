import { generateText, streamText } from 'ai'
import { DEFAULT_LIMITS, REQUEST_TIMEOUT_MS, requiresApproval, MAX_REPAIR_RETRIES, MAX_ARG_FIXES, MAX_ECHO_RETRIES, MAX_STALE_RETRIES } from './constants.js'
import { EVENT } from './events.js'
import { renderTools, renderCoverage, RESULT, validateToolResult, agentMeta, verbOf } from './tools.js'
import { unwrapToolText } from './mcp.js'

export const TRUNCATED_NOTE = '\n\n[cut off at the output limit — ask for fewer items, or raise the token limit]'

export const LAST_STEP = 'You cannot call any more tools this turn. Answer the operator NOW in plain text, ' +
  'using only what the tools already returned. If you could not check everything they asked about, say what ' +
  'you did check and what is still unknown. Do not reply with JSON and do not name a tool.'

export const LEAD = Object.freeze({
  TOOL: 'tool',
  PROSE: 'prose',
  UNKNOWN: 'unknown'
})

export const TOOL_MATCH = Object.freeze({
  YES: 'yes',
  MAYBE: 'maybe',
  NO: 'no'
})

// How much of a rejected argument error to feed back so the model can fix its call.
const MAX_ARG_REJECTION_CHARS = 300

// How much of a failed tool error to include in prompt context before truncating.
const MAX_TOOL_ERROR_CHARS = 120

/**
 * How much of a tool result is worth keeping in the session transcript.
 *
 * Within a turn the model needs the whole payload to answer from. Across turns it only needs
 * evidence that the tool ran, and `list_devices` on a real fleet is kilobytes — persisting
 * those verbatim would grow the prompt without bound and push out the instructions that keep
 * routing working.
 */
const HISTORY_RESULT_CHARS = 400

/**
 * A token shaped like a fleet id: letters and hyphens carrying at least one digit, which is what
 * every family's ids look like (`demo-miner-a-0`, `antminer-3`, `container-1`). Used both to keep
 * ids out of the figures check and to notice an answer naming one.
 */
const ID_SHAPED = /\b[a-z][\w-]*\d[\w-]*\b/gi

/**
 * Keeps a tool result short enough to live in the transcript for the rest of the session.
 *
 * Cut on a line boundary where possible so the kept part stays parseable-looking rather than
 * ending mid-token, and say that it was cut — a silently truncated payload reads as the whole
 * answer, and the model will happily quote a number that was never there.
 */
function clampForHistory (text) {
  const result = String(text ?? '')
  if (result.length <= HISTORY_RESULT_CHARS) return result

  const head = result.slice(0, HISTORY_RESULT_CHARS)
  const lastLineBreak = head.lastIndexOf('\n')
  const kept = lastLineBreak > HISTORY_RESULT_CHARS / 2 ? head.slice(0, lastLineBreak) : head

  return `${kept}\n… (result truncated for history)`
}

/**
 * Key-order invariant fingerprinting so {ref, attr} and {attr, ref} produce the same string.
 */
function canonicalFingerprint (tool, args) {
  if (!args || typeof args !== 'object') return `${tool}:${JSON.stringify(args)}`
  const sorted = Object.keys(args).sort().reduce((acc, key) => {
    acc[key] = args[key]
    return acc
  }, {})
  return `${tool}:${JSON.stringify(sorted)}`
}

/**
 * Run one prompt-based tool turn, yielding the typed event stream (see docs/CONTRACT.md).
 *
 * qvac serve ignores the OpenAI `tools` parameter, so tools are described in the prompt and
 * the model's JSON reply is parsed here. Each step the model returns either a tool call or a
 * plain-text answer; tool calls run against the MCP server and their result is fed back,
 * until an answer arrives or maxSteps is reached.
 */
export async function * runToolLoop ({ model, system, messages, tools, mcp, notCovered, strictToolGating = true, maxSteps = DEFAULT_LIMITS.maxSteps, maxOutputTokens = DEFAULT_LIMITS.maxOutputTokens, requestTimeoutMs = REQUEST_TIMEOUT_MS, abortSignal }) {
  const toolSystem = buildToolSystem(system, tools, { notCovered, strictToolGating })
  const toolByName = new Map((tools ?? []).map((t) => [t.name, t])) // for readOnlyHint lookup
  const toolNames = [...toolByName.keys()].sort((a, b) => b.length - a.length)
  const convo = messages.map((m) => ({ ...m })) // working copy we can append tool turns to
  // What this turn should leave behind in the session transcript. Built alongside `convo`
  // rather than sliced off it: `convo` carries full tool payloads and coaching prompts that
  // are useful for this turn only, while history keeps a compact record of what ran.
  const history = []
  let repairs = 0 // bounded retries when the model emits malformed tool-call JSON
  let argFixes = 0 // bounded retries when the server rejects an argument value
  let answered = false // has any tool in this turn returned a usable result?
  const seen = new Set() // calls already made this turn, so the model cannot ask the same thing twice
  const lastUserMessage = () => [...convo].reverse().find((m) => m.role === 'user')?.content ?? ''
  let echoes = 0 // bounded retries when the model answers with the question itself
  let stale = 0 // bounded retries when it states fleet figures without asking a tool for them

  for (let step = 0; step < maxSteps; step++) {
    let text = ''
    let decided = false
    let streamedProse = false
    let finishReason = null
    const asked = lastUserMessage()
    const signal = deadline(requestTimeoutMs, abortSignal)
    try {
      // onError is a noop because stream errors surface as part.type === 'error' parts in
      // the stream below and are yielded as EVENT.ERROR; the SDK's default would print the
      // raw error object on top of that.
      const result = streamText({ model, system: toolSystem, messages: convo, maxOutputTokens, maxRetries: 2, onError: () => {}, abortSignal: signal })
      for await (const part of result.stream) {
        if (part.type === 'error') { yield { type: EVENT.ERROR, error: String(part.error) }; return }
        if (part.type === 'finish') finishReason = part.finishReason
        if (part.type !== 'text-delta') continue
        const t = part.text ?? part.delta ?? ''
        if (!t) continue
        text += t
        if (!decided) {
          const lead = text.replace(/^\s+/, '')
          if (echoesQuestion(lead, asked)) continue
          const kind = leadKind(lead, toolNames)
          if (kind === LEAD.UNKNOWN) continue // not enough yet to tell a call from an answer
          decided = true
          // With tools present, prose is not streamed token-by-token until a tool has returned successfully
          // (or no tools are connected). This ensures ungrounded figures emitted before running tools are caught
          // and rejected rather than streamed to the operator.
          streamedProse = kind === LEAD.PROSE && (answered || !toolNames.length)
          if (streamedProse) yield { type: EVENT.TOKEN, text: lead } // flush what we buffered
        } else if (streamedProse) {
          if (t.includes('{') || attemptedTool(text, toolNames)) { streamedProse = false; continue }
          yield { type: EVENT.TOKEN, text: t }
        }
      }
    } catch (err) {
      if (abortSignal?.aborted) return // the caller stopped the turn: nobody is waiting for an error
      yield { type: EVENT.ERROR, error: describeCallError(err, requestTimeoutMs) }
      return
    }

    if (signal?.aborted) { // not redundant: the SDK reports an abort as a clean close, not a throw
      if (abortSignal?.aborted) return
      yield { type: EVENT.ERROR, error: describeCallError(signal.reason, requestTimeoutMs) }
      return
    }

    if (streamedProse) {
      let out = text.trim()
      if (finishReason === 'length') {
        yield { type: EVENT.TOKEN, text: TRUNCATED_NOTE }
        out += TRUNCATED_NOTE
      }
      yield { type: EVENT.DONE, text: out }
      return history
    }

    if (decided && !streamedProse && !answered && !attemptedTool(text, toolNames)) {
      const said = text.trim()
      // Ids are fleet data too. The figures check strips id-shaped tokens to avoid reading
      // "demo-miner-a-0" as the number 0 — which left an answer made of nothing but ids invisible
      // to it: an operator asking "list the devices please" was given ten devices that do not
      // exist, assembled out of the prompt's own family vocabulary, with no tool call behind any
      // of them. An id the operator did not name and no tool returned came from the same place a
      // remembered figure does.
      const namedIds = (said.match(ID_SHAPED) ?? [])
        .filter((id) => !asked.toLowerCase().includes(id.toLowerCase()))
      const figures = said.replace(ID_SHAPED, '')
      if ((/\d/.test(figures) || namedIds.length > 0) && stale < MAX_STALE_RETRIES) {
        stale++
        convo.push({ role: 'assistant', content: text })
        convo.push({
          role: 'user',
          content: 'That answer states fleet data but no tool ran this turn, so it came from ' +
            'earlier in the conversation or from nowhere at all. Reply with ONLY the JSON object ' +
            'for the tool that answers the question — {"tool":"<name>","args":{...}} — and nothing ' +
            'else. Do not describe a tool, do not say a tool was called, and do not name a device ' +
            'or a figure that no tool has returned to you. If no tool covers the question, call ' +
            'nothing and say plainly that you do not have that ability — a question you cannot ' +
            'answer is not a reason to reach for a tool that cannot answer it either.'
        })
        continue
      }
      yield * answerOperator(said, toolNames)
      return history
    }

    if (!streamedProse && echoesQuestion(text.trim(), asked) && echoes < MAX_ECHO_RETRIES) {
      echoes++
      convo.push({ role: 'assistant', content: text })
      convo.push({ role: 'user', content: `That repeated the question instead of answering it. ${LAST_STEP}` })
      continue
    }

    const call = parseToolCall(text)

    if (!call && attemptedTool(text, toolNames) && repairs < MAX_REPAIR_RETRIES) {
      repairs++
      convo.push({ role: 'assistant', content: text })
      convo.push({ role: 'user', content: 'That was not valid JSON. Reply with ONLY a valid JSON object like {"tool":"<name>","args":{...}}, or with a plain-text answer.' })
      continue
    }

    if (!call) {
      yield * answerOperator(text, toolNames)
      return history
    }

    const fingerprint = canonicalFingerprint(call.tool, call.args)
    if (seen.has(fingerprint)) {
      convo.push({ role: 'assistant', content: text })
      convo.push({ role: 'user', content: 'You already made that exact call this turn and its result is above.' })
      break
    }
    seen.add(fingerprint)

    yield { type: EVENT.TOOL_CALL, name: call.tool, args: call.args }

    // How long the operator held the turn at the prompt. Carried on the result so a consumer
    // can take it back off the clock: the gap between a tool_call and its tool_result spans the
    // wait, so a card left open for fourteen seconds reported the tool as taking fourteen
    // seconds. The eval runner already subtracts this; the UI could not, because nothing told it.
    let approvalWaitMs
    if (requiresApproval(call.tool, toolByName.get(call.tool))) {
      const askedAt = Date.now()
      const approved = yield { type: EVENT.PENDING_APPROVAL, name: call.tool, args: call.args }
      approvalWaitMs = Date.now() - askedAt
      if (!approved) {
        // `false` is an operator's rejection. `null`/`undefined` means no decision arrived: the
        // approval expired or the client went away. Both block the write, but only a rejection
        // may be reported as one, or the operator is told they refused something they never saw.
        // Both texts stay bare literals: ui-agent matches them (turn.contract.test.ts).
        const undecided = approved == null
        if (undecided) {
          yield { type: EVENT.TOOL_RESULT, name: call.tool, text: '(no operator decision — approval expired, not executed)', approvalWaitMs }
        } else {
          yield { type: EVENT.TOOL_RESULT, name: call.tool, text: '(rejected by operator — not executed)', approvalWaitMs }
        }
        convo.push({ role: 'assistant', content: text })
        history.push(
          { role: 'assistant', content: text },
          {
            role: 'user',
            content: undecided
              ? `Result of ${call.tool}: (no operator decision before the approval expired — it did NOT run)`
              : `Result of ${call.tool}: (rejected by the operator — it did NOT run)`
          }
        )
        convo.push({
          role: 'user',
          content: undecided
            ? 'Nobody approved that action before the approval expired, so it did NOT run. Do not retry it. Tell them in ONE sentence that it was not carried out because no approval arrived in time, naming the device and never the tool.'
            : 'The operator REJECTED that action, so it did NOT run. Do not retry it. Tell them in ONE sentence that it was not carried out, naming the device and never the tool.'
        })
        continue
      }
    }

    let result
    let failed = false
    let violation = null
    try {
      const r = await mcp.callTool(call.tool, call.args)
      result = r.text
      failed = r.isError
      if (!failed) {
        violation = contractViolation(toolByName.get(call.tool), result)
        if (violation) {
          result = `The ${call.tool} result did not satisfy its contract: ${violation}`
          failed = true
        }
      }
    } catch (err) {
      result = `Error: ${String(err?.message ?? err)}`
      failed = true
    }
    yield {
      type: EVENT.TOOL_RESULT,
      name: call.tool,
      text: result,
      isError: failed,
      ...(violation ? { contractViolation: violation } : {}),
      ...(approvalWaitMs === undefined ? {} : { approvalWaitMs })
    }
    if (!failed) answered = true

    // Verbatim, not JSON.stringify(call): the server's KV cache keys on the conversation, so
    // re-serializing the same call misses it and re-prefills. See tests/unit/tool-history.test.js.
    history.push(
      { role: 'assistant', content: text },
      { role: 'user', content: `Result of ${call.tool}:\n${clampForHistory(result)}` }
    )

    convo.push({ role: 'assistant', content: text })
    if (failed && rejectedArguments(result) && argFixes < MAX_ARG_FIXES) {
      argFixes++
      convo.push({
        role: 'user',
        content: `The ${call.tool} call was REJECTED because an argument was not valid:\n${result.slice(0, MAX_ARG_REJECTION_CHARS)}\n\n` +
          'Call it again using only the values listed for that parameter, or answer the operator ' +
          'with what you already have. Do not tell the operator about this — it is not their problem.'
      })
    } else if (failed && answered) {
      convo.push({
        role: 'user',
        content: `The ${call.tool} call failed, but you already have what you need from the earlier ` +
          'tool results. Answer the operator\'s ORIGINAL question now using those results. ' +
          'Do not mention the failed call.'
      })
    } else if (failed) {
      convo.push({
        role: 'user',
        content: `The ${call.tool} call FAILED with an internal error (${result.slice(0, MAX_TOOL_ERROR_CHARS)}). ` +
          `You therefore have NO value for ${JSON.stringify(call.args)}. Do not state one, do not ` +
          'compare it with anything, do not estimate it, and do not reuse a value from earlier in ' +
          'this conversation. Tell the operator in ONE plain sentence which reading is unavailable ' +
          'right now and that they can retry shortly. Do NOT repeat the raw error code. Do not call ' +
          'the same tool again.'
      })
    } else {
      convo.push({ role: 'user', content: `Result of ${call.tool}:\n${result}\n\nUse this to answer the operator, or call another tool.` })
    }
  }

  convo.push({ role: 'user', content: LAST_STEP })

  let final
  try {
    const { text, finishReason } = await generateText({ model, system: toolSystem, messages: convo, maxOutputTokens, maxRetries: 1, abortSignal: deadline(requestTimeoutMs, abortSignal) })
    final = text + (finishReason === 'length' ? TRUNCATED_NOTE : '')
  } catch (err) {
    yield { type: EVENT.ERROR, error: describeCallError(err, requestTimeoutMs) }
    return // error is terminal — do not also emit done (contract invariant 1)
  }
  yield * answerOperator(final, toolNames)
  return history
}

/**
 * What the operator is told when the model's own words cannot be shown to them — they attempted a
 * tool, named one, or said nothing at all.
 *
 * Exported so a caller can recognise it in the answer it just streamed: this is the agent
 * admitting it produced nothing usable, not something the assistant said, and it must never be
 * recorded as a turn (see Session.send).
 */
export const UNSPEAKABLE_FALLBACK = 'Sorry, I could not complete that request — please try again.'

function * answerOperator (text, toolNames = []) {
  const trimmed = (text ?? '').trim()
  const speakable = isOperatorProse(trimmed, toolNames)
  const out = speakable ? trimmed : UNSPEAKABLE_FALLBACK
  // Suppression is invisible from the outside — the operator sees the fallback and the model's
  // actual words are gone. Written down because the reason matters when a turn that answers
  // correctly in a fresh session starts falling back once a conversation has history.
  if (!speakable) {
    const why = trimmed.length === 0
      ? 'empty'
      : mentionsATool(trimmed, toolNames)
        ? 'named a tool'
        : leaksScaffolding(trimmed) ? 'restated the prompt' : 'attempted a tool'
    process.stderr.write(`[mdk:agent] answer suppressed (${why}): ${JSON.stringify(trimmed.slice(0, 300))}\n`)
  }
  yield { type: EVENT.TOKEN, text: out }
  yield { type: EVENT.DONE, text: out }
}

function isOperatorProse (text, toolNames = []) {
  return text.length > 0 && !attemptedTool(text, toolNames) && !mentionsATool(text, toolNames) &&
    !leaksScaffolding(text)
}

export function buildToolSystem (system, tools, { notCovered, strictToolGating = true } = {}) {
  if (!tools || !tools.length) return system
  const coverage = renderCoverage(tools, { notCovered, strictToolGating })
  return [
    system,
    '',
    'You can call tools to get live data about the mining fleet. Available tools:',
    '',
    renderTools(tools, { strictToolGating }),
    ...(coverage ? ['', coverage] : []),
    '',
    'To call a tool, reply with ONLY a JSON object and nothing else:',
    '{"tool": "<tool_name>", "args": { ... }}',
    '',
    'Where a parameter lists allowed values in [brackets], use one of those values exactly as',
    'written — never a synonym or a paraphrase. Where it shows an id, copy an id you have seen.',
    '',
    'When you have enough information, reply with a short plain-text answer for the',
    'operator (no JSON). Never invent fleet data — only use what the tools return.'
  ].join('\n')
}

export function extractJsonObject (text) {
  const start = text.indexOf('{')
  if (start === -1) return null
  let depth = 0
  let inStr = false
  let esc = false
  for (let i = start; i < text.length; i++) {
    const c = text[i]
    if (inStr) {
      if (esc) esc = false
      else if (c === '\\') esc = true
      else if (c === '"') inStr = false
      continue
    }
    if (c === '"') { inStr = true; continue }
    if (c === '{') depth++
    else if (c === '}' && --depth === 0) return text.slice(start, i + 1)
  }
  return null
}

export function parseToolCall (text) {
  const raw = extractJsonObject(text)
  if (!raw) return null
  try {
    const obj = JSON.parse(raw)
    if (obj && typeof obj.tool === 'string') return { tool: obj.tool, args: obj.args ?? {} }
  } catch {}
  return null
}

/**
 * Decide from the first characters whether this is a tool call to buffer or an answer to stream,
 * before the rest has arrived.
 *
 * A leading ``` fence hides the real first character. Hosted models wrap tool-call JSON in
 * ```json far more often than local ones do, and judging on the backtick alone streams the call
 * at the operator as if it were the answer — the tool then never runs. So a fence keeps the
 * decision open until the body behind it starts. (exported for tests)
 */
export function leadKind (lead, toolNames = []) {
  if (!lead) return LEAD.UNKNOWN // still only whitespace
  if (lead[0] !== '`') return bodyKind(lead, toolNames)
  if (!/^`{3}/.test(lead)) return lead.length < 3 ? LEAD.UNKNOWN : LEAD.PROSE // inline `code`, not a fence
  const nl = lead.indexOf('\n')
  if (nl === -1) return LEAD.UNKNOWN // still reading the fence header (```json)
  const body = lead.slice(nl + 1).replace(/^\s+/, '')
  if (!body) return LEAD.UNKNOWN
  return bodyKind(body, toolNames)
}

function bodyKind (text, toolNames) {
  if (text[0] === '{') return LEAD.TOOL
  const named = namesATool(text, toolNames)
  return named === TOOL_MATCH.MAYBE ? LEAD.UNKNOWN : (named === TOOL_MATCH.YES ? LEAD.TOOL : LEAD.PROSE)
}

/**
 * Is this output still nothing but the operator's own question handed back?
 *
 * True while the text is a prefix of the question as well as when it matches it whole, so the
 * streaming path can withhold an echo in progress rather than discovering it once the tokens
 * are already out. Punctuation, case and a leading pronoun are ignored — the model answering its
 * own question flips `you`/`I`, so "I already made that call" is still an echo of "You already
 * made that call". Anything the model adds of its own makes it false immediately.
 * (exported for tests)
 */
export function echoesQuestion (text, question) {
  const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
    .replace(/^(i|you|we|it)\s+/, '')
  const a = norm(text)
  const q = norm(question)
  if (!a || !q) return false
  return q.startsWith(a) || a === q
}

/**
 * Is this text a tool call written without the JSON we asked for?
 *
 * A 4B drifts off the format under conversational pressure and emits the call as a bare name —
 * `list_devices family=container state=all limit=50`. That has no brace and no `"tool":`, so the
 * two gates both read it as prose and streamed the agent's internals at the operator while the
 * tool never ran. One judgement, shared by both, so they cannot disagree again.
 *
 * `maybe` means the text is still a prefix of some tool name and the stream has to keep waiting
 * rather than commit — the decision must never flip once made. (exported for tests)
 */
export function namesATool (text, toolNames = []) {
  const lead = String(text ?? '').replace(/^\s+/, '')
  if (!lead) return TOOL_MATCH.NO
  for (const name of toolNames) {
    if (lead === name) return TOOL_MATCH.YES
    if (lead.startsWith(name) && /[\s({=:[]/.test(lead[name.length])) return TOOL_MATCH.YES
  }
  return toolNames.some((name) => name.startsWith(lead)) ? TOOL_MATCH.MAYBE : TOOL_MATCH.NO
}

/**
 * The vocabulary of the machinery, which an answer to an operator never needs.
 *
 * A model nudged back onto the JSON format sometimes restates the nudge instead of following it,
 * and the restatement is addressed to the operator: "I understand. Please provide your request as
 * a JSON object or a plain text answer." Nothing about a mining fleet requires these words, and an
 * operator reading them has been handed the prompt's plumbing.
 */
const SCAFFOLDING = /\bjson\b|plain[- ]text answer|tool call|args\s*:/i

/** Is this answer talking about the format of a tool call rather than about the fleet? */
export function leaksScaffolding (text) {
  return SCAFFOLDING.test(String(text ?? ''))
}

/**
 * Does this answer name one of the tools anywhere in it?
 *
 * A different question from `attemptedTool`, which asks whether the text IS a call and is
 * anchored at the lead so a streaming decision can be made before the rest arrives. This asks
 * whether the finished answer leaks the machinery, wherever it surfaced. An operator was shown
 * "I apologize.\n\nsummarize_site was called. 12 workers and 68 devices are online." — the lead
 * is ordinary prose, so the anchored check passed it, and the tool name rode out in the middle of
 * a sentence. The charter's last rule is that tools are never mentioned, "not even on failure";
 * this is that rule enforced rather than merely asked for.
 *
 * Matched on word boundaries against snake_case identifiers, which do not occur in prose about a
 * fleet, so a legitimate answer has nothing to trip over. (exported for tests)
 */
export function mentionsATool (text, toolNames = []) {
  const body = String(text ?? '')

  return toolNames.some((name) => name && new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(body))
}

export const deadline = (ms, abortSignal) => {
  const timeout = ms > 0 ? AbortSignal.timeout(ms) : undefined
  if (!abortSignal) return timeout
  return timeout ? AbortSignal.any([timeout, abortSignal]) : abortSignal
}

/**
 * The ways a model call fails, each with what an operator can do about it.
 *
 * Matched against the provider's message, most specific first. An SDK's own words are written
 * for whoever wired the provider up, not for whoever is running the site: "AI_RetryError: Failed
 * after 3 attempts. Last error: Cannot connect to API: connect ECONNREFUSED 127.0.0.1:11434"
 * names a library, a retry count and a loopback port, none of which an operator can act on, and
 * it reaches them mid-shift with a fleet to run.
 */
const CALL_FAILURE = Object.freeze([
  { test: /econnrefused|enotfound|eai_again|ehostunreach|enetunreach|econnreset|epipe|socket hang ?up|fetch failed|network error|cannot connect|connection (refused|closed|error)|terminated/i, reason: 'the assistant could not reach its model' },
  { test: /\b(401|403)\b|unauthori[sz]ed|forbidden|invalid api ?key|authentication|permission denied/i, reason: 'the assistant was refused access to its model' },
  { test: /\b429\b|rate ?limit|too many requests|overloaded|capacity|quota|insufficient_quota/i, reason: 'the model is busy right now' },
  { test: /model .*(not found|does not exist)|no such model|unknown model|\b404\b/i, reason: 'the configured model is not available' },
  { test: /context (length|window)|too many tokens|maximum context/i, reason: 'the conversation grew too long for the model' },
  { test: /\b5\d\d\b|internal server error|bad gateway|service unavailable|upstream/i, reason: 'the model service failed' }
])

/** When nothing matches. Says what the operator observes, and claims nothing about why. */
const UNDESCRIBED_FAILURE = 'the assistant could not complete that request'

/**
 * Say which kind of not-answering this was, in the operator's terms, and write the cause down.
 *
 * A deadline means the model stopped responding; anything else means the call itself failed, and
 * the remedies differ. The provider's message decides which of `CALL_FAILURE` this was, but never
 * reaches the operator itself: it is a library's diagnostic, and passing it through puts stack
 * frames, retry counts and internal addresses on the panel of someone who wanted the site status.
 *
 * It is logged here rather than left to the caller, which is the one impurity in this module and
 * is deliberate. When this first shipped the raw message was simply dropped, on the reasoning that
 * the caller still held the error — and no caller logged it. A turn then failed under load with
 * "the assistant could not complete that request" on the panel, nothing in the gateway log, and no
 * way to tell a queued request from a dead provider. Every call site would have to remember; this
 * one place cannot forget.
 */
export function describeCallError (err, requestTimeoutMs = REQUEST_TIMEOUT_MS) {
  const message = String(err?.message ?? err)
  const aborted = err?.name === 'TimeoutError' || err?.name === 'AbortError' || /abort|timed? ?out/i.test(message)
  const reason = aborted
    ? `the model did not respond within ${Math.round(requestTimeoutMs / 1000)}s`
    : (CALL_FAILURE.find((candidate) => candidate.test.test(message))?.reason ?? UNDESCRIBED_FAILURE)

  // stderr, not stdout: the gateway's log captures it, and it never joins the event stream.
  process.stderr.write(`[mdk:agent] model call failed — shown as "${reason}" — cause: ${message}\n`)

  return reason
}

/**
 * Did the server reject the arguments, as opposed to failing to do the work?
 *
 * The difference decides who has to act. A bad argument is the model's mistake and the model
 * can correct it; a backend that is down is nobody's mistake and the operator has to be told.
 * Conflating them means a model that guessed an enum value wrong makes the operator believe
 * their fleet data is unavailable. (exported for tests)
 */
export function rejectedArguments (text) {
  return /-32602|invalid argument|input validation|validation error|invalid_enum|invalid enum|required|expected .* received/i.test(String(text ?? ''))
}

/**
 * Why this tool's JSON result breaks the contract it declared, or null if it does not.
 *
 * Judged only for tools declaring agent metadata, so a server predating this taxonomy still
 * works. (exported for tests)
 */
export function contractViolation (tool, text) {
  const meta = agentMeta(tool)
  if (!meta || meta.synthesized === true || meta.contractChecked !== true) return null
  if (!Object.hasOwn(RESULT, verbOf(tool.name))) return null

  let payload
  try {
    payload = JSON.parse(unwrapToolText(text))
  } catch {
    return null // not JSON, so not a contract this agent can judge
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null

  const { ok, errors } = validateToolResult(tool.name, payload)
  return ok ? null : errors.join('; ')
}

function attemptedTool (text, toolNames = []) {
  const lead = String(text ?? '').trimStart()
  return lead[0] === '{' ||
    /"\s*tool\s*"\s*:/.test(lead) ||
    namesATool(lead, toolNames) === 'yes'
}
