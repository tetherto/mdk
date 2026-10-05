// Session history semantics. A turn either answers or leaves no trace: a failed turn must not
// leave an unanswered user message behind, or the next turn sends two user messages in a row.
// Both turn types (tool-enabled and plain chat) must behave identically here.

import test from 'brittle'
import { MockLanguageModelV3, convertArrayToReadableStream } from 'ai/test'
import { createAgent } from '../../src/agent.js'
import { Session } from '../../src/session.js'
import { MemorySessionStore, SESSION_GONE } from '../../src/session-store.js'
import { EVENT } from '../../src/events.js'
import { admitTools, AGENT_META_KEY, CAPABILITY, TOOL_CONTRACT_VERSION } from '../../src/tools.js'

const providerWith = (model) => ({ model: () => model })

// A session only ever receives admitted tools, so the fixture goes through admission too.
const { admitted: TOOLS } = admitTools([{
  name: 'summarize_site',
  description: 'How the site is doing.',
  inputSchema: { type: 'object', properties: {} },
  annotations: { readOnlyHint: true },
  _meta: {
    [AGENT_META_KEY]: {
      enabled: true,
      answers: 'How the site is doing.',
      useWhen: ['how is the site', 'site overview'],
      returns: 'a rollup with a one-line summary',
      minCapability: CAPABILITY.SMALL,
      contract: TOOL_CONTRACT_VERSION
    }
  }
}])
// A result that satisfies summarize_site's contract, or the loop reports the call as a contract
// breach and no turn here ever counts as answered.
const MCP = { callTool: async () => ({ text: '{"summary":"15 miners are up.","totals":{"devices":{"total":15}}}', isError: false }) }

const failingModel = () => new MockLanguageModelV3({
  doStream: async () => { throw new Error('model unreachable') }
})

// Replies with each text in turn, so a tool turn can be scripted as the call and then the answer.
const answeringModel = (...texts) => {
  let step = 0
  return new MockLanguageModelV3({
    doStream: async () => ({
      stream: convertArrayToReadableStream([
        { type: 'text-start', id: '0' },
        { type: 'text-delta', id: '0', delta: texts[Math.min(step++, texts.length - 1)] },
        { type: 'text-end', id: '0' },
        { type: 'finish', finishReason: { unified: 'stop' }, usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 } }
      ])
    })
  })
}

async function drain (session, text) {
  const events = []
  for await (const ev of session.send(text)) events.push(ev)
  return events
}

test('a failed tool turn leaves no trace in history', async (t) => {
  const session = new Session({ provider: providerWith(failingModel()), tools: TOOLS, mcp: MCP, limits: { maxSteps: 1 } })
  const events = await drain(session, 'how many miners?')
  t.ok(events.some((ev) => ev.type === EVENT.ERROR), 'the turn reported an error')
  t.is(session.messages.length, 0, 'the unanswered user message was dropped')
})

test('a failed plain chat turn leaves no trace in history', async (t) => {
  const session = new Session({ provider: providerWith(failingModel()), limits: { maxRetries: 0 } })
  const events = await drain(session, 'hello')
  t.ok(events.some((ev) => ev.type === EVENT.ERROR), 'the turn reported an error')
  t.is(session.messages.length, 0, 'both turn types discard a failed turn identically')
})

// An abort is a clean close to the SDK, so a stalled model ends the stream quietly. The tool
// loop checks the signal; the plain path set one and never looked at it, so a turn that timed
// out reported DONE with empty text and exit 0 — the operator told nothing, the caller told
// everything went fine.
test('a plain chat turn that times out says so, rather than answering nothing', async (t) => {
  const stalling = new MockLanguageModelV3({
    doStream: async ({ abortSignal }) => new Promise((resolve, reject) => {
      // A pending timer, so the process stays alive long enough for the unref'd deadline to fire.
      const keepAlive = setTimeout(() => {}, 10_000)
      abortSignal?.addEventListener('abort', () => { clearTimeout(keepAlive); reject(abortSignal.reason) })
    })
  })
  const session = new Session({ provider: providerWith(stalling), limits: { requestTimeoutMs: 120, maxRetries: 0 } })

  const events = await drain(session, 'how is the site?')
  const error = events.find((ev) => ev.type === EVENT.ERROR)

  t.ok(error, 'the turn reported an error')
  t.ok(/did not respond within/.test(error.error), 'and named the deadline rather than an abort code')
  t.absent(events.some((ev) => ev.type === EVENT.DONE), 'no done follows an error')
  t.is(session.messages.length, 0, 'and the unanswered question left no trace')
})

test('a successful tool turn records the exchange', async (t) => {
  // The call, then the answer: a figure stated without asking a tool for it is refused now, so
  // the turn this test is named after has to actually make one.
  const model = answeringModel('{"tool":"summarize_site","args":{}}', 'All 15 miners are up.')
  const session = new Session({ provider: providerWith(model), tools: TOOLS, mcp: MCP, limits: { maxSteps: 2 } })
  await drain(session, 'status?')
  // Four, not two: the tool step is kept as well as the answer. Recording only the answer left
  // a transcript in which the right response to "reboot X" is a sentence saying it happened,
  // and by the third repeat the model produced exactly that with no call behind it. The
  // stale-figure guard does not cover it — a write claim names a device rather than a number,
  // and the guard strips identifiers before looking for one. See tool-history.test.js.
  t.is(session.messages.length, 4, 'asked → called a tool → got a result → answered')
  t.alike(session.messages.at(-1), { role: 'assistant', content: 'All 15 miners are up.' })
})

// ── session state lives in the store ─────────────────────────────────────────

test('a session id is unguessable and unique, not a counter', (t) => {
  const a = new Session({ provider: providerWith(answeringModel('hi')) })
  const b = new Session({ provider: providerWith(answeringModel('hi')) })

  t.not(a.id, b.id)
  // It was `sess_001`, from a module-level counter — so two gateway processes both handed out
  // the same id, and the id travels in URLs an operator can see.
  t.ok(/^[0-9a-f-]{36}$/.test(a.id), 'a uuid, not a sequence')
  t.absent(/^sess_\d+$/.test(a.id))
})

test('a turn is written back to the store', async (t) => {
  const store = new MemorySessionStore()
  const record = await store.create({ userId: 'alice' })
  const session = new Session({
    provider: providerWith(answeringModel('There are 15 miners.')),
    store,
    id: record.id
  })

  await drain(session, 'how many miners?')

  const stored = await store.get(record.id)
  t.is(stored.messages.length, 2, 'the question and the answer are both persisted')
  t.alike(stored.messages.at(-1), { role: 'assistant', content: 'There are 15 miners.' })
})

// The store trims on save. A session that kept its own array would grow past the cap while the
// store looked bounded, and the next turn would send the untrimmed history to the model.
test('the store cap governs what the next turn sends', async (t) => {
  const store = new MemorySessionStore({ maxMessages: 2 })
  const record = await store.create({ userId: 'alice' })
  const session = new Session({ provider: providerWith(answeringModel('ok')), store, id: record.id })

  await drain(session, 'first')
  await drain(session, 'second')

  t.is(session.messages.length, 2, 'the working copy is trimmed, not just the record')
  t.is(session.messages[0].role, 'user', 'and never opens on an answer')
})

test('reset clears the store, not only the working copy', async (t) => {
  const store = new MemorySessionStore()
  const record = await store.create({ userId: 'alice' })
  const session = new Session({ provider: providerWith(answeringModel('ok')), store, id: record.id })

  await drain(session, 'hello')
  await session.reset()

  t.alike(session.messages, [])
  t.alike((await store.get(record.id)).messages, [], 'a resumed session does not get it back')
})

// The turn already happened; failing after the fact helps nobody.
test('a session whose record has gone answers anyway', async (t) => {
  const store = new MemorySessionStore()
  const record = await store.create({ userId: 'alice' })
  const session = new Session({ provider: providerWith(answeringModel('still here')), store, id: record.id })
  await store.delete(record.id)

  await drain(session, 'are you there?')

  t.is(session.messages.length, 2, 'the answer is kept in memory')
  t.is(session.store, null, 'and the session detaches rather than failing every later turn')
})

// A session with no store is the CLI's path, and must behave exactly as it always has.
test('no store configured changes nothing', async (t) => {
  const session = new Session({ provider: providerWith(answeringModel('15 miners.')) })
  await drain(session, 'how many?')
  t.is(session.messages.length, 2)
})

// ── createSession / resumeSession ────────────────────────────────────────────
// The reason the store exists: a gateway serves many people across many requests and has to
// find a conversation again between them.

// An external provider constructs its client without connecting, so this needs no server.
const PROVIDER = { kind: 'qvac', mode: 'external', baseURL: 'http://127.0.0.1:1/v1', model: 'test' }
const agentWith = async (store) => createAgent({ provider: PROVIDER, store, system: 'CHARTER' })

test('a conversation can be picked back up by id', async (t) => {
  const store = new MemorySessionStore()
  const agent = await agentWith(store)

  const first = await agent.createSession({ userId: 'alice' })
  first.provider = providerWith(answeringModel('There are 15 miners.'))
  await drain(first, 'how many miners?')

  const resumed = await agent.resumeSession(first.id, { userId: 'alice' })
  t.is(resumed.id, first.id)
  t.is(resumed.userId, 'alice', 'the owner comes back with it')
  t.is(resumed.messages.length, 2, 'and so does the history')
})

// A caller should not have to tell "never existed" from "expired": both mean start a new one.
test('resuming what is not there returns null, either way', async (t) => {
  let clock = 1_000_000
  const store = new MemorySessionStore({ ttlMs: 1000, now: () => clock })
  const agent = await agentWith(store)

  t.is(await agent.resumeSession('no-such-id', { userId: 'alice' }), null)

  const deleted = await agent.createSession({ userId: 'alice' })
  await store.delete(deleted.id)
  t.is(await agent.resumeSession(deleted.id, { userId: 'alice' }), null, 'deleted')

  const stale = await agent.createSession({ userId: 'alice' })
  clock += 1001
  t.is(await agent.resumeSession(stale.id, { userId: 'alice' }), null, 'expired')
})

test('createSession records the owner, so sessions can be listed per user', async (t) => {
  const store = new MemorySessionStore()
  const agent = await agentWith(store)

  await agent.createSession({ userId: 'alice', metadata: { title: 'Morning check' } })
  await agent.createSession({ userId: 'alice' })
  await agent.createSession({ userId: 'bob' })

  const alice = await store.listByUser('alice')
  t.is(alice.length, 2)
  t.is((await store.listByUser('bob')).length, 1, "and bob cannot see alice's")
  // Found rather than indexed: two sessions created in the same millisecond have no defined
  // order between them, and an assertion that relies on one passes or fails by timing.
  t.alike(alice.find((s) => s.metadata?.title)?.metadata, { title: 'Morning check' },
    'metadata a UI would keep a thread title in survives')
})

test('an agent with no store still hands out working sessions', async (t) => {
  const agent = await createAgent({ provider: PROVIDER, system: 'CHARTER' })
  const session = await agent.createSession()

  t.ok(session.id, 'it has an id')
  t.ok(agent.store, 'backed by the default in-memory store')
  t.is((await agent.store.get(session.id)).userId, 'local')
})

// A session id travels in URLs an operator can see, so an id alone is not authority to read the
// conversation behind it.
test('resuming somebody else\'s session is indistinguishable from one that is not there', async (t) => {
  const store = new MemorySessionStore()
  const agent = await agentWith(store)
  const alice = await agent.createSession({ userId: 'alice' })

  t.is(await agent.resumeSession(alice.id, { userId: 'bob' }), null, 'bob gets nothing')
  t.ok(await agent.resumeSession(alice.id, { userId: 'alice' }), 'and alice still gets hers')

  // Telling "wrong owner" from "no such session" would confirm the id exists, which is the
  // thing the check protects.
  t.is(await agent.resumeSession('never-existed', { userId: 'bob' }), null)
})

// Not defaulted, because a default is what a caller forgets — and forgetting must not be the
// permissive case.
test('resumeSession will not run without knowing who is asking', async (t) => {
  const agent = await agentWith(new MemorySessionStore())
  const session = await agent.createSession({ userId: 'alice' })

  try {
    await agent.resumeSession(session.id)
    t.fail('should have refused')
  } catch (err) {
    t.ok(/needs the userId/.test(err.message))
  }
})

// One network blip used to stop a live conversation persisting for the rest of its life.
test('a transient store failure is retried on the next turn', async (t) => {
  const store = new MemorySessionStore()
  const record = await store.create({ userId: 'alice' })
  let failNext = true
  const flaky = {
    save: async (r) => {
      if (failNext) { failNext = false; throw new Error('ECONNRESET') }
      return store.save(r)
    }
  }
  const session = new Session({ provider: providerWith(answeringModel('ok')), store: flaky, id: record.id })

  await drain(session, 'first')
  t.ok(session.store, 'still attached after a transient failure')
  t.ok(session.persistError, 'and the error is kept, not swallowed')

  await drain(session, 'second')
  t.absent(session.persistError, 'the next turn succeeds')
  t.is((await store.get(record.id)).messages.length, 4, 'and both turns are stored')
})

test('a record that is gone detaches the session, since it is not coming back', async (t) => {
  const store = new MemorySessionStore()
  const record = await store.create({ userId: 'alice' })
  const session = new Session({ provider: providerWith(answeringModel('ok')), store, id: record.id })
  await store.delete(record.id)

  await drain(session, 'hello')
  t.is(session.store, null)
})

test('caller options cannot bind a session to a record it does not own', async (t) => {
  const store = new MemorySessionStore()
  const agent = await agentWith(store)
  const alice = await agent.createSession({ userId: 'alice' })

  const stolen = await agent.createSession({ userId: 'bob', id: alice.id })
  t.not(stolen.id, alice.id, 'createSession keeps its own record')

  const bobOwn = await agent.createSession({ userId: 'bob' })
  const hijack = await agent.resumeSession(bobOwn.id, { userId: 'bob', id: alice.id })
  t.is(hijack.id, bobOwn.id, 'the session checked is the session returned')
})

test('options may still vary the charter, only never the identity', async (t) => {
  const agent = await agentWith(new MemorySessionStore())
  const session = await agent.createSession({ userId: 'alice', system: 'A DIFFERENT CHARTER' })
  t.is(session.system, 'A DIFFERENT CHARTER')
  t.is(session.userId, 'alice')
})

test('reset refuses to report success when the store rejected it', async (t) => {
  const store = new MemorySessionStore()
  const record = await store.create({ userId: 'alice' })
  await store.save({ id: record.id, messages: [{ role: 'user', content: 'remember me' }] })

  const session = new Session({
    provider: providerWith(answeringModel('ok')),
    store: { save: async () => { throw new Error('ECONNRESET') } },
    id: record.id,
    messages: [{ role: 'user', content: 'remember me' }]
  })

  try {
    await session.reset()
    t.fail('should have thrown')
  } catch (err) {
    t.is(err.message, 'ECONNRESET')
  }
  t.is(session.messages.length, 1, 'and the working copy matches the store again')
  t.is((await store.get(record.id)).messages.length, 1)
})

// The reason the store exists is a gateway, and a gateway request stops reading the moment its
// client disconnects. If the write only happened after the last event, that turn never landed.
test('a turn the consumer walks away from is still written back', async (t) => {
  const store = new MemorySessionStore()
  const record = await store.create({ userId: 'alice' })
  const session = new Session({
    provider: providerWith(answeringModel('There are 15 miners.')),
    store,
    id: record.id,
    userId: 'alice'
  })

  for await (const ev of session.send('how many miners?')) {
    if (ev.type === EVENT.TOKEN) break
  }

  const stored = await store.get(record.id)
  t.is(stored.messages.length, 2, 'the question and what had been answered are both there')
  t.is(stored.messages[0].content, 'how many miners?')
})

// Half a turn is still allowed to leave no trace — what it may not leave is a question with no
// answer, which the next turn would send as two user messages in a row.
test('an abandoned turn that answered nothing leaves no trace', async (t) => {
  const store = new MemorySessionStore()
  const record = await store.create({ userId: 'alice' })
  const session = new Session({
    provider: providerWith(answeringModel('{"tool":"summarize_site","args":{}}')),
    tools: TOOLS,
    mcp: MCP,
    store,
    id: record.id,
    userId: 'alice'
  })

  const turn = session.send('how many miners?')
  const first = await turn.next()
  t.is(first.value.type, EVENT.TOOL_CALL, 'stopped before anything was said to the operator')
  await turn.return()

  t.alike((await store.get(record.id)).messages, [])
})

test('a plain chat turn that answered nothing leaves no trace either', async (t) => {
  const session = new Session({ provider: providerWith(answeringModel('')) })
  await drain(session, 'how many miners?')

  t.alike(session.messages, [])
})

// reset asks for a conversation that is not there any more, and gets exactly that. Failing here
// made /new print "could not reset" and work only on the second attempt.
test('resetting a session whose record has gone is not a failure', async (t) => {
  const store = new MemorySessionStore()
  const record = await store.create({ userId: 'alice' })
  const session = new Session({
    provider: providerWith(answeringModel('ok')),
    store,
    id: record.id,
    userId: 'alice',
    messages: [{ role: 'user', content: 'remember me' }]
  })
  await store.delete(record.id)

  let refused = null
  try {
    await session.reset()
  } catch (err) {
    refused = err
  }
  t.is(refused, null, 'reset resolved')
  t.alike(session.messages, [])
  t.is(session.store, null, 'and the session has detached, since the record is not coming back')
})

test('a store that says gone by code detaches without matching on its wording', async (t) => {
  const gone = Object.assign(new Error('ERR_KEY_MISSING'), { code: SESSION_GONE })
  const session = new Session({
    provider: providerWith(answeringModel('ok')),
    store: { save: async () => { throw gone } },
    messages: []
  })

  t.is(await session.persist(), false)
  t.is(session.store, null)
})

test('reset still succeeds locally once the session has detached', async (t) => {
  const session = new Session({ provider: providerWith(answeringModel('ok')), messages: [{ role: 'user', content: 'x' }] })
  await session.reset()
  t.alike(session.messages, [])
})

test('closing the agent leaves the store alone', async (t) => {
  const store = new MemorySessionStore()
  const agent = await agentWith(store)
  const session = await agent.createSession({ userId: 'alice' })

  await agent.close()

  // A caller that supplied a store owns its lifetime; closing it here would reach past the
  // agent's boundary and disconnect a Redis client somebody else is using.
  t.ok(await store.get(session.id), 'the record survives')
})

// A model that emits a tool call on its first step of each turn, then prose. Enough to check
// what the session keeps, without a real provider.
const callThenAnswer = (call, answer) => {
  let step = 0
  return new MockLanguageModelV3({
    doStream: async () => {
      const text = step++ % 2 === 0 ? call : answer
      return {
        stream: convertArrayToReadableStream([
          { type: 'text-start', id: '0' },
          { type: 'text-delta', id: '0', delta: text },
          { type: 'text-end', id: '0' },
          { type: 'finish', finishReason: 'stop', usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 } }
        ])
      }
    }
  })
}

test('history records the tool step, not only the answer', async (t) => {
  // Keeping just the answer taught the model that the reply to a request is a bare sentence.
  // Asked the same thing again it obliged — claiming the action had happened, having called
  // nothing. History has to show the tool being used.
  const call = '{"tool":"summarize_site","args":{}}'
  const session = new Session({
    provider: providerWith(callThenAnswer(call, 'All 15 miners are up.')),
    tools: TOOLS,
    mcp: MCP,
    limits: { maxSteps: 2 }
  })

  await drain(session, 'how is the site?')

  t.alike(
    session.messages.map((m) => m.role),
    ['user', 'assistant', 'user', 'assistant'],
    'asked → called a tool → got a result → answered'
  )
  t.is(session.messages[1].content, call, 'the call is kept as the model emitted it')
  t.ok(session.messages[2].content.includes('summarize_site'), 'and the result it produced')
  t.is(session.messages.at(-1).content, 'All 15 miners are up.', 'the answer still lands last')
})

test('a second turn sees the first turn tool step', async (t) => {
  const call = '{"tool":"summarize_site","args":{}}'
  const session = new Session({
    provider: providerWith(callThenAnswer(call, 'All 15 miners are up.')),
    tools: TOOLS,
    mcp: MCP,
    limits: { maxSteps: 2 }
  })

  await drain(session, 'how is the site?')
  await drain(session, 'how is the site?')

  const toolCalls = session.messages.filter((m) => m.role === 'assistant' && m.content === call)
  t.is(toolCalls.length, 2, 'both turns are on record as having called the tool')
})
