import test from 'brittle'
import { MockLanguageModelV3, convertArrayToReadableStream } from 'ai/test'
import { runToolLoop } from '../../src/loop.js'
import { EVENT } from '../../src/events.js'
import { admitTools, AGENT_META_KEY, CAPABILITY, TOOL_CONTRACT_VERSION } from '../../src/tools.js'

const toolFixture = ({ name, answers, readOnlyHint }) => ({
  name,
  description: answers,
  inputSchema: { type: 'object', properties: {} },
  annotations: { readOnlyHint },
  _meta: {
    [AGENT_META_KEY]: {
      enabled: true,
      answers,
      useWhen: [`${name} question`],
      returns: 'a result',
      minCapability: CAPABILITY.SMALL,
      contract: TOOL_CONTRACT_VERSION
    }
  }
})

const { admitted: TOOLS } = admitTools([
  toolFixture({ name: 'get_site_overview', answers: 'How the site is doing.', readOnlyHint: true })
])
const { admitted: WRITE_TOOLS } = admitTools([
  toolFixture({ name: 'act_device', answers: 'Acts on a device.', readOnlyHint: false })
])
const MCP = { callTool: async () => ({ text: '{"miners":15}', isError: false }) }

// Emits each text in turn, one per step, so a test can script a tool call followed by an answer.
function scriptedModel (texts) {
  let step = 0
  return new MockLanguageModelV3({
    doStream: async () => {
      const text = texts[Math.min(step++, texts.length - 1)]
      return {
        stream: convertArrayToReadableStream([
          { type: 'text-start', id: '0' },
          { type: 'text-delta', id: '0', delta: text },
          { type: 'text-end', id: '0' },
          { type: 'finish', finishReason: { unified: 'stop' }, usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 } }
        ])
      }
    }
  })
}

// Runs the loop to completion, answering every approval prompt with `approve`, and returns
// the messages the model saw on the LAST step.
async function historyOnFinalStep (texts, { approve = true, maxSteps = 3, tools = TOOLS, prompt = 'how many miners?' } = {}) {
  let seen = []
  const model = scriptedModel(texts)
  const inner = model.doStream
  model.doStream = async (opts) => {
    seen = opts.prompt.filter((m) => m.role !== 'system')
    return inner(opts)
  }
  const loop = runToolLoop({
    model,
    system: 'charter',
    messages: [{ role: 'user', content: prompt }],
    tools,
    mcp: MCP,
    maxSteps
  })
  let sent
  for (;;) {
    const { value: ev, done } = await loop.next(sent)
    sent = undefined
    if (done) break
    if (ev.type === EVENT.PENDING_APPROVAL) sent = approve
  }
  return seen
}

const assistantText = (history) => {
  const m = history.find((msg) => msg.role === 'assistant')
  if (!m) return null
  return typeof m.content === 'string' ? m.content : m.content.map((p) => p.text ?? '').join('')
}

// The KV cache keys on the conversation, so a rewritten assistant turn misses it and the
// whole conversation is re-prefilled. Re-serializing the same call is enough to break it:
// `{"tool": "x", "args": {}}` and `{"tool":"x","args":{}}` are different keys.
const SPACED_CALL = '{"tool": "get_site_overview", "args": {}}'

test('a tool call is replayed to the model exactly as it was emitted', async (t) => {
  const history = await historyOnFinalStep([SPACED_CALL, '15 miners.'])
  t.is(assistantText(history), SPACED_CALL, 'the spacing the model produced survives the round trip')
})

test('a rejected tool call is also replayed exactly as emitted', async (t) => {
  const emitted = '{"tool": "act_device", "args": {"id": "antminer-3"}}'
  const history = await historyOnFinalStep([emitted, 'Cancelled.'], {
    approve: false,
    tools: WRITE_TOOLS,
    prompt: 'reboot antminer-3'
  })
  t.is(assistantText(history), emitted)
})

test('trailing braces the parser tolerates are replayed too, and the loop still resolves', async (t) => {
  // extractJsonObject deliberately accepts `{...}}}}`; replaying it verbatim means the model
  // sees its own malformed output. Pin that the turn still completes.
  const messy = '{"tool": "get_site_overview", "args": {}}}}'
  const history = await historyOnFinalStep([messy, '15 miners.'])
  t.is(assistantText(history), messy)
})

test('the tool result is fed back as a user message after the assistant turn', async (t) => {
  const history = await historyOnFinalStep([SPACED_CALL, '15 miners.'])
  const roles = history.map((m) => m.role)
  t.alike(roles, ['user', 'assistant', 'user'])
  t.ok(history.at(-1).content.at(0).text.includes('{"miners":15}'), 'the raw tool output reaches the model')
})

// --- what the turn leaves behind for the NEXT turn ---------------------------
//
// Distinct from everything above, which pins what the model sees *within* one turn. The loop
// also returns the exchange for the session to persist. Recording only the prose answer left
// history saying "the reply to `reboot X` is a sentence", and by the third repeat the model
// obliged — claiming the reboot ran, with no tool call behind it.

// Drains the loop and returns its return value: the messages the session should keep.
async function turnHistory (texts, { approve = true, tools = TOOLS, prompt = 'how is the site?' } = {}) {
  const loop = runToolLoop({
    model: scriptedModel(texts),
    system: 'You are an operator agent.',
    messages: [{ role: 'user', content: prompt }],
    tools,
    mcp: MCP
  })
  let sent
  for (;;) {
    const { value, done } = await loop.next(sent)
    sent = undefined
    if (done) return value
    if (value.type === EVENT.PENDING_APPROVAL) sent = approve
  }
}

test('the turn hands back the tool call and its result for the session to keep', async (t) => {
  const kept = await turnHistory([SPACED_CALL, '15 miners.'])

  t.alike(kept.map((m) => m.role), ['assistant', 'user'], 'the call, then what it answered')
  t.is(kept[0].content, SPACED_CALL, 'the call is kept verbatim, as the model emitted it')
  t.ok(kept[1].content.includes('get_site_overview'), 'the result names the tool it came from')
  t.ok(kept[1].content.includes('{"miners":15}'), 'and carries what the tool said')
})

test('a turn that called nothing leaves no tool exchange behind', async (t) => {
  const kept = await turnHistory(['Just chatting.'])
  t.alike(kept, [], 'nothing to record when no tool ran')
})

test('a rejected write is recorded as rejected, not as a result', async (t) => {
  // Otherwise history shows a write that looks like it went through, which is the pattern the
  // model then repeats.
  const kept = await turnHistory(['{"tool": "act_device", "args": {"id": "antminer-3"}}', 'Cancelled.'], {
    approve: false,
    tools: WRITE_TOOLS,
    prompt: 'reboot antminer-3'
  })

  t.is(kept.length, 2)
  t.ok(kept[1].content.includes('did NOT run'), 'the record says plainly that nothing happened')
})

test('an approval that expires is not recorded as an operator rejection', async (t) => {
  // A host resolves an unanswered approval to null. The write must still be blocked, but telling
  // the model the operator refused it makes the agent report a decision nobody took.
  const kept = await turnHistory(['{"tool": "act_device", "args": {"id": "antminer-3"}}', 'Not done.'], {
    approve: null,
    tools: WRITE_TOOLS,
    prompt: 'reboot antminer-3'
  })

  t.is(kept.length, 2)
  t.ok(kept[1].content.includes('did NOT run'), 'the write is still recorded as not run')
  t.ok(kept[1].content.includes('approval expired'), 'and says the approval expired')
  t.absent(kept[1].content.includes('rejected'), 'not that the operator rejected it')
})

test('a long tool result is clamped before it is kept', async (t) => {
  // list_devices on a real fleet is kilobytes; persisting those verbatim every turn crowds out
  // the instructions that keep routing working.
  const big = { callTool: async () => ({ text: 'x'.repeat(5000), isError: false }) }
  const loop = runToolLoop({
    model: scriptedModel([SPACED_CALL, '15 miners.']),
    system: 'You are an operator agent.',
    messages: [{ role: 'user', content: 'how is the site?' }],
    tools: TOOLS,
    mcp: big
  })
  let kept
  for (;;) {
    const { value, done } = await loop.next()
    if (done) { kept = value; break }
  }

  t.ok(kept[1].content.length < 700, 'kept short enough to live in the transcript')
  t.ok(kept[1].content.includes('truncated'), 'and says it was cut, so nothing reads as complete')
})
