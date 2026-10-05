// Multi-turn operator conversations against a live model and fleet.
//
// The battery opens a fresh session per question, so nothing exercises what happens when the
// model has prior context to work from — which is exactly where the charter's "never answer
// fleet state from memory" rule lives, and where a confabulated answer is most likely.
//
//   node eval/threads.mjs [--in <threads.json>] [--out <transcripts.json>] [--limit N]
//                         [--model <id>] [--base-url <url>] [--mcp-url <url>] [--concurrency N]

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import process from 'node:process'
import { createAgent } from '../src/agent.js'
import { EVENT } from '../src/events.js'
import { parseArgs } from '../src/args.js'
import { DEFAULT_ENDPOINTS } from '../src/constants.js'
import { fleetIds, idShape, analyse } from '../src/ids.js'

// The shared parser, not a local one: it is the only reader that refuses to swallow the next
// flag as a value, so `--limit --model x` is a missing value rather than a limit named "--model".
const args = parseArgs(process.argv.slice(2))
const arg = (name, fallback) => (typeof args[name] === 'string' ? args[name] : fallback)

const IN = arg('in', fileURLToPath(new URL('./conversations.json', import.meta.url)))
const OUT = arg('out', 'operator-transcripts.json')
const LIMIT = Number(arg('limit', '0'))
const MODEL = arg('model', 'qwen3-4b')
const MCP = arg('mcp-url', DEFAULT_ENDPOINTS.mcp)
const BASE_URL = arg('base-url', DEFAULT_ENDPOINTS.model)

const agent = await createAgent({
  provider: { kind: 'qvac', mode: 'external', baseURL: BASE_URL, model: MODEL },
  mcp: { url: MCP },
  limits: { maxOutputTokens: 512, maxSteps: 4 }
})
await agent.waitReady()

const { ids: known, complete } = await fleetIds(agent.mcp)
const shape = idShape(known)
if (!complete) console.log('⚠ the fleet is larger than list_devices will name — invented ids will not be scored\n')
if (!shape) console.log(`⚠ this site's ${known.size} device ids do not fit the id shape — no id can be recognised in an answer\n`)
const { threads } = JSON.parse(readFileSync(IN, 'utf8'))
const selected = LIMIT ? threads.slice(0, LIMIT) : threads
const totalTurns = selected.reduce((n, t) => n + t.turns.length, 0)
console.log(`${selected.length} threads · ${totalTurns} turns · ${MODEL}\n`)

const CONCURRENCY = Number(arg('concurrency', '6'))
const transcripts = []
let done = 0

// Turns within a thread must stay ordered — that is the context being tested. Threads are
// independent sessions, so they run side by side.
async function runThread (thread) {
  const session = await agent.createSession()
  const record = { id: thread.id, persona: thread.persona, turns: [] }

  for (const question of thread.turns) {
    const calls = []
    const toolTexts = []
    let answer = ''
    let error = null
    let approvals = 0

    const iter = session.send(question)
    let sent
    for (;;) {
      const { value: ev, done: fin } = await iter.next(sent)
      sent = undefined
      if (fin) break
      if (ev.type === EVENT.TOOL_CALL) calls.push({ name: ev.name, args: ev.args })
      else if (ev.type === EVENT.TOOL_RESULT) toolTexts.push(ev.text)
      else if (ev.type === EVENT.TOKEN) answer += ev.text
      else if (ev.type === EVENT.ERROR) error = ev.error
      else if (ev.type === EVENT.PENDING_APPROVAL) { approvals++; sent = false }
    }

    answer = answer.trim()
    record.turns.push({
      question,
      calls,
      answer,
      approvals,
      error,
      answeredWithoutTool: calls.length === 0,
      ...analyse(answer, toolTexts, { known, shape, complete })
    })
    done++
    if (done % 50 === 0) console.log(`  ${done}/${totalTurns} turns`)
  }
  return record
}

for (let i = 0; i < selected.length; i += CONCURRENCY) {
  const batch = await Promise.all(selected.slice(i, i + CONCURRENCY).map(runThread))
  transcripts.push(...batch)
  writeFileSync(OUT, JSON.stringify({ model: MODEL, threads: transcripts }, null, 2))
}

console.log(`\ndone — ${done} turns across ${transcripts.length} threads → ${OUT}`)
await agent.close()
