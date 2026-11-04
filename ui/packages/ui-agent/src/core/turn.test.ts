import { describe, expect, it } from 'vitest'

import type { WireEvent } from './events'
import { FIXTURES } from '../test-utils/fixtures'
import { EVENT } from './events'
import {
  abortTurn,
  createTurnState,
  failTurn,
  isTurnSettled,
  reduceTurn,
  TOOL_STATUS,
  TURN_STATUS,
} from './turn'

function replay(events: WireEvent[], upTo = events.length) {
  return events.slice(0, upTo).reduce(reduceTurn, createTurnState())
}

describe('reduceTurn — read turn', () => {
  const fixture = FIXTURES.readCount!

  it('accumulates tokens into one answer', () => {
    const state = replay(fixture.events)
    expect(state.text.length).toBeGreaterThan(0)
    expect(state.text).toBe(
      fixture.events
        .filter((event) => event.type === EVENT.TOKEN)
        .map((event) => event.text)
        .join(''),
    )
  })

  it('settles the tool step with a duration taken from the envelope timestamps', () => {
    const state = replay(fixture.events)
    const step = state.tools[0]!

    expect(step.status).toBe(TOOL_STATUS.OK)
    expect(step.durationMs).toBe(step.endedAt! - step.startedAt)
  })

  it('ends complete, with no approval outstanding', () => {
    const state = replay(fixture.events)
    expect(state.status).toBe(TURN_STATUS.COMPLETE)
    expect(state.pendingApproval).toBeNull()
    expect(isTurnSettled(state)).toBe(true)
  })
})

describe('reduceTurn — approval', () => {
  const fixture = FIXTURES.writeApproved!
  const approvalIndex = fixture.events.findIndex(
    (event) => event.type === EVENT.PENDING_APPROVAL,
  )

  it('pauses on pending_approval and exposes the approvalId to echo back', () => {
    const state = replay(fixture.events, approvalIndex + 1)

    expect(state.status).toBe(TURN_STATUS.AWAITING_APPROVAL)
    expect(state.pendingApproval?.approvalId).toBe(fixture.events[approvalIndex]!.approvalId)
    expect(state.tools[0]?.status).toBe(TOOL_STATUS.AWAITING_APPROVAL)
  })

  it('gates the approval to the tool step it belongs to', () => {
    const state = replay(fixture.events, approvalIndex + 1)
    expect(state.pendingApproval?.toolStepId).toBe(state.tools[0]?.id)
  })

  it('clears the approval when the stream resumes', () => {
    // Deliberately driven by the tool_result rather than by a decision, because
    // an unanswered approval is auto-rejected server-side and resumes on its own
    // — the prompt has to disappear then too, not only when the operator clicks.
    const state = replay(fixture.events, approvalIndex + 2)

    expect(state.pendingApproval).toBeNull()
    expect(state.status).toBe(TURN_STATUS.STREAMING)
  })

  it('settles a rejected write without an error', () => {
    const state = replay(FIXTURES.writeRejected!.events)

    expect(state.status).toBe(TURN_STATUS.COMPLETE)
    expect(state.error).toBeNull()
    expect(state.pendingApproval).toBeNull()
  })

  it('marks a refused write rejected, not ok', () => {
    // The producer answers a declined approval with an ordinary tool_result and
    // no isError, so without this the chip claims success for a command the
    // operator just refused.
    const state = replay(FIXTURES.writeRejected!.events)
    const step = state.tools[0]!

    expect(step.status).toBe(TOOL_STATUS.REJECTED)
    expect(step.isError).toBeUndefined()
  })

  it('marks a write whose approval expired rejected, not ok', () => {
    // No decision arrived, so the write never ran; the chip must not show a success tick.
    const events = FIXTURES.writeRejected!.events.map((event) =>
      event.type === EVENT.TOOL_RESULT
        ? { ...event, text: '(no operator decision — approval expired, not executed)' }
        : event,
    )
    expect(replay(events).tools[0]!.status).toBe(TOOL_STATUS.REJECTED)
  })

  it('only treats a refusal as such when the step was awaiting approval', () => {
    // A read tool answering with that prose is still a normal result.
    const events: WireEvent[] = [
      { turnId: 't', seq: 0, ts: 0, type: EVENT.TOOL_CALL, name: 'get_device', args: {} },
      {
        turnId: 't',
        seq: 1,
        ts: 5,
        type: EVENT.TOOL_RESULT,
        name: 'get_device',
        text: '(rejected by operator — not executed)',
      },
    ]
    expect(events.reduce(reduceTurn, createTurnState()).tools[0]?.status).toBe(TOOL_STATUS.OK)
  })
})

describe('reduceTurn — failure shapes', () => {
  it('marks a contract violation as an error and keeps the reason', () => {
    const state = replay(FIXTURES.toolContractViolation!.events)
    const step = state.tools.find((candidate) => candidate.contractViolation !== undefined)

    expect(step).toBeDefined()
    expect(step?.status).toBe(TOOL_STATUS.ERROR)
    expect(step?.isError).toBe(true)
    expect(step?.contractViolation).toBeTruthy()
  })

  it('ends on error, keeping whatever text had already streamed', () => {
    const state = replay(FIXTURES.errorMidturn!.events)

    expect(state.status).toBe(TURN_STATUS.ERROR)
    expect(state.error).toBeTruthy()
  })

  it('distinguishes a decline from an error — tokens and done, no tool call', () => {
    const state = replay(FIXTURES.decline!.events)

    expect(state.status).toBe(TURN_STATUS.COMPLETE)
    expect(state.error).toBeNull()
    expect(state.tools).toHaveLength(0)
    expect(state.text.length).toBeGreaterThan(0)
  })
})

describe('reduceTurn — edges', () => {
  const envelope = { turnId: 't', seq: 0, ts: 0 } as const

  it('falls back to done.text only when nothing streamed', () => {
    const fromDone = reduceTurn(createTurnState(), {
      ...envelope,
      type: EVENT.DONE,
      text: 'whole answer',
    })
    expect(fromDone.text).toBe('whole answer')

    const streamed = [
      { ...envelope, type: EVENT.TOKEN, text: 'streamed' },
      { ...envelope, seq: 1, type: EVENT.DONE, text: 'streamed' },
    ].reduce(reduceTurn, createTurnState())
    expect(streamed.text).toBe('streamed')
  })

  it('ignores a tool_result with no open call of that name', () => {
    const state = reduceTurn(createTurnState(), {
      ...envelope,
      type: EVENT.TOOL_RESULT,
      name: 'nobody_called_me',
      text: 'x',
    })
    expect(state.tools).toHaveLength(0)
  })

  it('ignores a pending_approval that carries no approvalId', () => {
    const called = reduceTurn(createTurnState(), {
      ...envelope,
      type: EVENT.TOOL_CALL,
      name: 'act_device',
      args: {},
    })
    const state = reduceTurn(called, {
      ...envelope,
      seq: 1,
      type: EVENT.PENDING_APPROVAL,
      name: 'act_device',
      args: {},
    })

    expect(state.pendingApproval).toBeNull()
    expect(state.tools[0]?.status).toBe(TOOL_STATUS.RUNNING)
  })

  it('settles the oldest open call when a tool is called twice', () => {
    // Nothing on the wire links a result to its call, so attribution is by call
    // order — the producer runs tools one at a time and answers them in order.
    // Matching the newest instead handed the second call the first one's result,
    // crossing over both the output and the duration.
    const events: WireEvent[] = [
      { ...envelope, type: EVENT.TOOL_CALL, name: 'get_device', args: { ref: 'a' } },
      { ...envelope, seq: 1, ts: 10, type: EVENT.TOOL_CALL, name: 'get_device', args: { ref: 'b' } },
      { ...envelope, seq: 2, ts: 30, type: EVENT.TOOL_RESULT, name: 'get_device', text: 'a done' },
    ]
    const state = events.reduce(reduceTurn, createTurnState())

    expect(state.tools[0]?.status).toBe(TOOL_STATUS.OK)
    expect(state.tools[0]?.text).toBe('a done')
    expect(state.tools[0]?.durationMs).toBe(30)
    expect(state.tools[1]?.status).toBe(TOOL_STATUS.RUNNING)
  })

  it('closes an outstanding call when the turn ends on an error', () => {
    // A step left running is persisted as a spinner that never resolves, and reads
    // back later as a turn still in flight.
    const events: WireEvent[] = [
      { ...envelope, type: EVENT.TOOL_CALL, name: 'get_device', args: {} },
      { ...envelope, seq: 1, ts: 50, type: EVENT.ERROR, error: 'ERR_AGENT_MODEL_FAILED' },
    ]
    const state = events.reduce(reduceTurn, createTurnState())

    expect(state.tools[0]?.status).toBe(TOOL_STATUS.INTERRUPTED)
    expect(state.tools[0]?.endedAt).toBe(50)
    expect(state.status).toBe(TURN_STATUS.ERROR)
  })

  it('records the raw error code, leaving the wording to the renderer', () => {
    const state = reduceTurn(createTurnState(), {
      ...envelope,
      type: EVENT.ERROR,
      error: 'ERR_AGENT_STREAM_TRUNCATED',
    })

    expect(state.error).toBe('ERR_AGENT_STREAM_TRUNCATED')
  })

  it('does not count the operator reading the approval card as tool time', () => {
    // The gap between a call and its result spans the wait, so a card left open for
    // fourteen seconds read as a fourteen-second tool.
    const events: WireEvent[] = [
      { ...envelope, type: EVENT.TOOL_CALL, name: 'act_device', args: { ref: 'miner-001' } },
      {
        ...envelope,
        seq: 1,
        ts: 40,
        type: EVENT.PENDING_APPROVAL,
        name: 'act_device',
        args: { ref: 'miner-001' },
        approvalId: 'a1',
      },
      {
        ...envelope,
        seq: 2,
        ts: 14_500,
        type: EVENT.TOOL_RESULT,
        name: 'act_device',
        text: 'done',
        approvalWaitMs: 14_200,
      },
    ]
    const state = events.reduce(reduceTurn, createTurnState())

    expect(state.tools[0]?.durationMs).toBe(300)
  })

  it('floors the duration at zero if the wait overruns the clock', () => {
    // The producer measures the wait and the gateway stamps the timestamps, so rounding can
    // leave the two disagreeing by a millisecond. A negative duration must never render.
    const events: WireEvent[] = [
      { ...envelope, type: EVENT.TOOL_CALL, name: 'act_device', args: {} },
      {
        ...envelope,
        seq: 1,
        ts: 100,
        type: EVENT.TOOL_RESULT,
        name: 'act_device',
        text: 'done',
        approvalWaitMs: 150,
      },
    ]
    const state = events.reduce(reduceTurn, createTurnState())

    expect(state.tools[0]?.durationMs).toBe(0)
  })

  it('never mutates the state it was given', () => {
    const before = createTurnState()
    const snapshot = structuredClone(before)
    reduceTurn(before, { ...envelope, type: EVENT.TOKEN, text: 'hi' })

    expect(before).toEqual(snapshot)
  })
})

describe('ending a turn from outside the stream', () => {
  const envelope = { turnId: 't', seq: 0, ts: 0 } as const

  function midCall() {
    return reduceTurn(createTurnState(), {
      ...envelope,
      type: EVENT.TOOL_CALL,
      name: 'act_device',
      args: {},
    })
  }

  it('failTurn errors the turn and closes the open call', () => {
    // The transport can fail without the producer emitting an `error` event at all
    // — a dropped socket, a connection gone quiet — so the reducer never sees it.
    const state = failTurn(midCall(), 'The connection to the agent was lost.', 900)

    expect(state.status).toBe(TURN_STATUS.ERROR)
    expect(state.error).toBe('The connection to the agent was lost.')
    expect(state.tools[0]?.status).toBe(TOOL_STATUS.INTERRUPTED)
    expect(state.tools[0]?.endedAt).toBe(900)
  })

  it('abortTurn closes the open call without recording an error', () => {
    // The operator stopping a turn is not a failure, but the tool still never
    // answered.
    const state = abortTurn(midCall(), 900)

    expect(state.error).toBeNull()
    expect(state.pendingApproval).toBeNull()
    expect(state.tools[0]?.status).toBe(TOOL_STATUS.INTERRUPTED)
  })

  it('leaves settled steps alone', () => {
    const events: WireEvent[] = [
      { ...envelope, type: EVENT.TOOL_CALL, name: 'get_device', args: {} },
      { ...envelope, seq: 1, ts: 20, type: EVENT.TOOL_RESULT, name: 'get_device', text: 'ok' },
    ]
    const state = abortTurn(events.reduce(reduceTurn, createTurnState()), 900)

    expect(state.tools[0]?.status).toBe(TOOL_STATUS.OK)
    expect(state.tools[0]?.endedAt).toBe(20)
  })
})
