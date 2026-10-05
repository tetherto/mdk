// Where the time actually goes on a turn: model prefill, tool round-trips, and how long the
// operator waits before seeing anything at all.
//
//   node eval/latency.mjs [--reps 3] [--model qwen3-4b] [--base-url ...] [--mcp-url ...]

import process from 'node:process'
import { performance } from 'node:perf_hooks'
import { createAgent } from '../src/agent.js'
import { EVENT } from '../src/events.js'
import { parseArgs } from '../src/args.js'
import { DEFAULT_ENDPOINTS } from '../src/constants.js'

const args = parseArgs(process.argv.slice(2))
const arg = (name, fallback) => (typeof args[name] === 'string' ? args[name] : fallback)
const REPS = Number(arg('reps', '3'))
const MODEL = arg('model', 'qwen3-4b')
const MCP = arg('mcp-url', DEFAULT_ENDPOINTS.mcp)
const BASE_URL = arg('base-url', DEFAULT_ENDPOINTS.model)

const agent = await createAgent({
  provider: { kind: 'qvac', mode: 'external', baseURL: BASE_URL, model: MODEL },
  mcp: { url: MCP },
  limits: { maxOutputTokens: 512, maxSteps: 4 }
})
await agent.waitReady()

/**
 * The shapes a turn comes in: no tool, one cheap tool, one tool over the whole fleet, and the
 * fan-out that reads telemetry per device.
 *
 * The labels carry the fleet's own numbers, read at run time. Written in by hand they were the
 * demo's — "26 items", "over 15" — and quietly became false at any other site, which is the one
 * thing a latency report must not do while looking authoritative.
 */
async function buildCases (mcp) {
  const read = async (tool, params) => JSON.parse((await mcp.callTool(tool, params)).text)

  const all = await read('count_devices', { family: 'all', state: 'all' })
  const miners = await read('count_devices', { family: 'miner', state: 'all' })
  const named = (await read('list_devices', { family: 'miner', state: 'all' })).items?.[0]

  const devices = all.count
  const minerCount = miners.count
  const sample = named?.deviceId ?? named?.id
  if (!sample) throw new Error(`latency: ${MCP} reports no miners — nothing to ask about`)

  return [
    { label: 'decline (no tool)', q: 'What is the bitcoin price?' },
    { label: 'count (1 tool)', q: 'How many miners are there?' },
    { label: 'summarize (1 tool)', q: 'How is the site doing?' },
    { label: `list all (1 tool, ${devices} items)`, q: 'List every device on the site' },
    { label: 'get device (1 tool)', q: `What is ${sample} reporting?` },
    { label: `rank (fan-out over ${minerCount})`, q: 'Which miner has the lowest power?' },
    { label: 'act (gated, rejected)', q: `Restart ${sample}` }
  ]
}

// The agent already holds an MCP connection; opening a second one to read three numbers would
// leave a second thing to close. A failure here must still close the agent, or the run leaves
// the model connection and the MCP client open behind it.
let CASES
try {
  CASES = await buildCases(agent.mcp)
} catch (err) {
  await agent.close()
  console.error(err.message)
  process.exit(1)
}

const pct = (xs, p) => xs.slice().sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(xs.length * p))]

console.log(`${CASES.length} shapes x ${REPS} reps, sequential (true single-user latency)\n`)
console.log('  shape'.padEnd(32) + 'total    first-token   tool-time   steps')

const all = []
for (const c of CASES) {
  const totals = []; const ttfts = []; const tools = []; const steps = []
  for (let r = 0; r < REPS; r++) {
    const session = await agent.createSession()
    const t0 = performance.now()
    let ttft = null
    let toolMs = 0
    let calls = 0
    let toolStart = null

    const iter = session.send(c.q)
    let sent
    for (;;) {
      const { value: ev, done } = await iter.next(sent)
      sent = undefined
      if (done) break
      if (ev.type === EVENT.TOOL_CALL) {
        calls++
        toolStart = performance.now()
      } else if (ev.type === EVENT.TOOL_RESULT) {
        if (toolStart) {
          toolMs += performance.now() - toolStart
          toolStart = null
        }
      } else if (ev.type === EVENT.PENDING_APPROVAL) {
        sent = false
        toolStart = null
      } else if (ev.type === EVENT.TOKEN && ttft === null) {
        ttft = performance.now() - t0
      }
    }
    const total = performance.now() - t0
    totals.push(total); ttfts.push(ttft ?? total); tools.push(toolMs); steps.push(calls)
  }
  const med = (xs) => (pct(xs, 0.5) / 1000).toFixed(1) + 's'
  console.log('  ' + c.label.padEnd(30) + med(totals).padEnd(9) + med(ttfts).padEnd(14) +
    med(tools).padEnd(12) + (steps.reduce((a, b) => a + b, 0) / steps.length).toFixed(1))
  all.push(...totals)
}

console.log('\n  across all turns:  median ' + (pct(all, 0.5) / 1000).toFixed(1) +
  's   p90 ' + (pct(all, 0.9) / 1000).toFixed(1) + 's   max ' + (Math.max(...all) / 1000).toFixed(1) + 's')
await agent.close()
