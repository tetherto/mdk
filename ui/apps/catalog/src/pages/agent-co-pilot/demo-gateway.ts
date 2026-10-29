/**
 * A stand-in for the agent gateway plugin, so this page works with no backend.
 *
 * It speaks the same four routes and the same SSE framing as
 * the `mdk-app-agent` app, including the parts that are easy to get wrong when
 * mocking: events arrive over time rather than all at once, a write pauses the
 * stream on `pending_approval` until a decision lands on its own request, and
 * the envelope carries `turnId` / `seq` / `ts`.
 *
 * Device names are synthetic.
 */

import type { AgentEvent, WireEvent } from '@tetherto/mdk-ui-agent'
import { EVENT } from '@tetherto/mdk-ui-agent'

/** One event before the gateway stamps its envelope onto it. */
type Emittable = AgentEvent & { approvalId?: string }

/** Roughly the cadence of a 4B model answering off a local endpoint. */
const TOKEN_DELAY_MS = 45
const TOOL_DELAY_MS = 420

type Script = {
  tool?: { name: string, args: Record<string, unknown>, result: string, write?: boolean }
  answer: string
}

const READ_SCRIPT: Script = {
  tool: {
    name: 'summarize_site',
    args: {},
    result: '{"workers":2,"devices":8,"online":8}',
    },
  answer: [
    'The site is healthy — **8 of 8** devices are online across 2 workers.',
    '',
    '| device | state | hashrate |',
    '| --- | --- | --- |',
    '| demo-miner-a-0 | online | 112 TH/s |',
    '| demo-miner-a-1 | online | 108 TH/s |',
    '',
    'Nothing is reporting an error.',
  ].join('\n'),
}

const COUNT_SCRIPT: Script = {
  tool: {
    name: 'count_devices',
    args: { family: 'miner', state: 'all' },
    result: '{"summary":"8 miners.","count":8}',
  },
  answer: 'There are **8** miners, and all of them are online.',
}

const WRITE_SCRIPT: Script = {
  tool: {
    name: 'act_device',
    args: { ref: 'demo-miner-a-0', action: 'reboot' },
    result: '{"summary":"Reboot on demo-miner-a-0: queued.","outcome":"queued"}',
    write: true,
  },
  answer: 'Reboot queued on `demo-miner-a-0`. It should be back within a couple of minutes.',
}

const DECLINE_SCRIPT: Script = {
  answer:
    'I can only answer from the fleet tools I have, and none of them report energy cost. '
    + 'Ask me about device state, telemetry or power instead.',
}

/** Crude on purpose — the point is to exercise the UI, not to route well. */
function pickScript(text: string): Script {
  const lower = text.toLowerCase()
  if (/reboot|restart|set |power mode|sleep/.test(lower)) return WRITE_SCRIPT
  if (/cost|price|invoice|revenue|last week/.test(lower)) return DECLINE_SCRIPT
  if (/how many|count/.test(lower)) return COUNT_SCRIPT
  return READ_SCRIPT
}

function frame(event: WireEvent): Uint8Array {
  return new TextEncoder().encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`)
}

const wait = (ms: number) => new Promise((resolve) => {
  setTimeout(resolve, ms)
})

export type DemoGateway = {
  fetchImpl: typeof fetch
}

export function createDemoGateway(): DemoGateway {
  let sessions = 0
  let turns = 0
  // Resolved by the decision request, exactly as the real approval round-trip works.
  const approvals = new Map<string, (approved: boolean) => void>()

  const streamTurn = (text: string): ReadableStream<Uint8Array> => {
    const script = pickScript(text)
    turns += 1
    const turnId = `demo-turn-${turns}`
    const startedAt = Date.now()

    let seq = 0
    const emit = (
      controller: ReadableStreamDefaultController<Uint8Array>,
      event: Emittable,
    ) => {
      controller.enqueue(frame({ ...event, turnId, seq: seq++, ts: Date.now() - startedAt }))
    }

    return new ReadableStream<Uint8Array>({
      async start(controller) {
        if (script.tool) {
          const { name, args, result, write } = script.tool
          emit(controller, { type: EVENT.TOOL_CALL, name, args })

          let approved = true
          if (write) {
            const approvalId = `demo-approval-${turns}`
            emit(controller, { type: EVENT.PENDING_APPROVAL, name, args, approvalId })
            // The stream genuinely pauses here, as the real one does.
            approved = await new Promise<boolean>((resolve) => approvals.set(approvalId, resolve))
          }

          await wait(TOOL_DELAY_MS)
          emit(controller, {
            type: EVENT.TOOL_RESULT,
            name,
            text: approved ? result : '(rejected by operator — not executed)',
          })

          if (!approved) {
            for (const word of 'Understood — I did not run that.'.split(' ')) {
              await wait(TOKEN_DELAY_MS)
              emit(controller, { type: EVENT.TOKEN, text: `${word} ` })
            }
            emit(controller, { type: EVENT.DONE })
            controller.close()
            return
          }
        }

        // Word by word, so the streaming state is actually visible.
        for (const word of script.answer.split(' ')) {
          await wait(TOKEN_DELAY_MS)
          emit(controller, { type: EVENT.TOKEN, text: `${word} ` })
        }

        emit(controller, { type: EVENT.DONE })
        controller.close()
      },
    })
  }

  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)

    if (url.endsWith('/agent/sessions') && init?.method === 'POST') {
      sessions += 1
      return Response.json({ sessionId: `demo-session-${sessions}` })
    }

    if (url.endsWith('/messages')) {
      const body = JSON.parse(String(init?.body ?? '{}')) as { text?: string }
      return new Response(streamTurn(body.text ?? ''), {
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
      })
    }

    const approvalMatch = /\/approvals\/([^/]+)$/.exec(url)
    if (approvalMatch) {
      const approvalId = approvalMatch[1]!
      const decide = approvals.get(approvalId)
      const approved = (JSON.parse(String(init?.body ?? '{}')) as { approved?: unknown }).approved === true
      if (!decide) {
        // Same as the gateway: an approval that already settled is a 404, and
        // the two cases are deliberately indistinguishable.
        return Response.json({ statusCode: 404, message: 'ERR_AGENT_APPROVAL_NOT_FOUND' }, { status: 404 })
      }
      approvals.delete(approvalId)
      decide(approved)
      return Response.json({ approvalId, approved })
    }

    return Response.json({ statusCode: 404, message: 'ERR_NOT_FOUND' }, { status: 404 })
  }) as typeof fetch

  return { fetchImpl }
}
