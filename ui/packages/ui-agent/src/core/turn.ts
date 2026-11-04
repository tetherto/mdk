/**
 * Folds the event stream of one turn into a render model.
 *
 * Pure and synchronous: no fetch, no React, no timers. Every branch here is
 * driven by a contract invariant, so the fixtures in `src/test-utils/fixtures`
 * exercise it directly.
 */

import type { ToolArgs, WireEvent } from './events'
import { EVENT } from './events'

export const TURN_STATUS = {
  IDLE: 'idle',
  STREAMING: 'streaming',
  AWAITING_APPROVAL: 'awaiting-approval',
  COMPLETE: 'complete',
  ERROR: 'error',
} as const

export type TurnStatus = (typeof TURN_STATUS)[keyof typeof TURN_STATUS]

export const TOOL_STATUS = {
  RUNNING: 'running',
  AWAITING_APPROVAL: 'awaiting-approval',
  OK: 'ok',
  /** Refused — by the operator, or by the approval timing out. Not an error. */
  REJECTED: 'rejected',
  ERROR: 'error',
  /**
   * The turn ended before the tool reported back — an `error` event, a lost
   * connection, or the operator stopping the turn. Whether the tool ran is
   * genuinely unknown, which is why it is neither `ok` nor `error`.
   */
  INTERRUPTED: 'interrupted',
} as const

export type ToolStatus = (typeof TOOL_STATUS)[keyof typeof TOOL_STATUS]

/**
 * How a refused write comes back.
 *
 * The producer answers a declined approval with an ordinary `tool_result` and
 * **no `isError`** (`backend/core/agent/src/loop.js`), so without this a
 * rejected write renders with the same green tick as one that ran — telling the
 * operator their refusal succeeded in doing the thing they refused.
 *
 * An approval that expired with no decision comes back the same way, with its own
 * text, and the write did not run either, so it is a refusal too.
 *
 * Both are bare string literals over there, not exported constants, so they are
 * matched on a prefix and pinned by `turn.contract.test.ts`.
 */
const REFUSED_RESULT_PREFIXES = ['(rejected by operator', '(no operator decision']

export function isRejectionResult(text: string): boolean {
  return REFUSED_RESULT_PREFIXES.some((prefix) => text.startsWith(prefix))
}

export type ToolStep = {
  id: string
  name: string
  args: ToolArgs
  status: ToolStatus
  /** The tool's answer, once it has one. */
  text?: string
  /** The call itself failed. */
  isError?: boolean
  /** The tool answered, but the answer broke its verb's contract. Implies `isError`. */
  contractViolation?: string
  startedAt: number
  endedAt?: number
  /** What renders as `· 0.4s` on the chip. */
  durationMs?: number
}

export type PendingApproval = {
  approvalId: string
  name: string
  args: ToolArgs
  /** The `ToolStep` this approval gates. */
  toolStepId: string
  at: number
}

export type AgentTurnState = {
  turnId: string | null
  tools: ToolStep[]
  text: string
  status: TurnStatus
  error: string | null
  pendingApproval: PendingApproval | null
  usage: Record<string, unknown> | null
}

export function createTurnState(): AgentTurnState {
  return {
    turnId: null,
    tools: [],
    text: '',
    status: TURN_STATUS.IDLE,
    error: null,
    pendingApproval: null,
    usage: null,
  }
}

export function isTurnSettled(state: AgentTurnState): boolean {
  return state.status === TURN_STATUS.COMPLETE || state.status === TURN_STATUS.ERROR
}

function isOpen(step: ToolStep): boolean {
  return step.status === TOOL_STATUS.RUNNING || step.status === TOOL_STATUS.AWAITING_APPROVAL
}

/**
 * The OLDEST step of that name still waiting on its `tool_result`.
 *
 * The wire carries no id linking a result to its call, so attribution is by call
 * order: the producer runs tools one at a time and emits each result in the order
 * the calls were made, so the first unanswered call of a name is the one this
 * result belongs to. Matching the newest instead crossed durations and outputs
 * over as soon as a turn called the same tool twice.
 */
function findOpenStep(tools: ToolStep[], name: string): ToolStep | undefined {
  return tools.find((step) => isOpen(step) && step.name === name)
}

function replaceStep(tools: ToolStep[], id: string, next: ToolStep): ToolStep[] {
  return tools.map((step) => (step.id === id ? next : step))
}

/**
 * Closes every step still waiting on a result.
 *
 * A turn can end while a call is outstanding — an `error` event, a dropped
 * socket, the operator pressing stop — and a step left `running` renders as a
 * spinner that never resolves, which then gets persisted into the transcript and
 * read back as a turn still in flight.
 */
function settleOpenSteps(tools: ToolStep[], at: number): ToolStep[] {
  return tools.map((step) =>
    isOpen(step) ? { ...step, status: TOOL_STATUS.INTERRUPTED, endedAt: at } : step,
  )
}

/**
 * Ends a turn from outside the event stream: a transport failure, an idle
 * connection, or an unmount. `reduceTurn` handles the producer's own `error`
 * event; this is the same closing-down for the cases that never reach it.
 */
export function failTurn(state: AgentTurnState, error: string, at = Date.now()): AgentTurnState {
  return {
    ...state,
    status: TURN_STATUS.ERROR,
    error,
    pendingApproval: null,
    tools: settleOpenSteps(state.tools, at),
  }
}

/**
 * Ends a turn the operator stopped. Not an error — they meant it — so whatever
 * streamed is kept and no error is recorded, but an outstanding call is still
 * closed: it did not report back and now never will.
 */
export function abortTurn(state: AgentTurnState, at = Date.now()): AgentTurnState {
  return {
    ...state,
    pendingApproval: null,
    tools: settleOpenSteps(state.tools, at),
  }
}

/**
 * Applies one event. Returns a new state; never mutates the one passed in.
 *
 * Unknown event types fall through unchanged (invariant 5) — the caller has
 * usually filtered them already, but this must not throw either way.
 */
export function reduceTurn(state: AgentTurnState, event: WireEvent): AgentTurnState {
  const turnId = state.turnId ?? event.turnId

  switch (event.type) {
    case EVENT.TOKEN:
      return {
        ...state,
        turnId,
        text: state.text + event.text,
        status: TURN_STATUS.STREAMING,
      }

    case EVENT.TOOL_CALL:
      return {
        ...state,
        turnId,
        status: TURN_STATUS.STREAMING,
        tools: [
          ...state.tools,
          {
            id: `${event.turnId}:${event.seq}`,
            name: event.name,
            args: event.args,
            status: TOOL_STATUS.RUNNING,
            startedAt: event.ts,
          },
        ],
      }

    case EVENT.PENDING_APPROVAL: {
      // Only ever emitted between a `tool_call` and its `tool_result`
      // (invariant 3), so the gated step is the open one with the same name.
      const step = findOpenStep(state.tools, event.name)
      if (!step || !event.approvalId) return { ...state, turnId }
      return {
        ...state,
        turnId,
        status: TURN_STATUS.AWAITING_APPROVAL,
        tools: replaceStep(state.tools, step.id, {
          ...step,
          status: TOOL_STATUS.AWAITING_APPROVAL,
        }),
        pendingApproval: {
          approvalId: event.approvalId,
          name: event.name,
          args: event.args,
          toolStepId: step.id,
          at: event.ts,
        },
      }
    }

    case EVENT.TOOL_RESULT: {
      const step = findOpenStep(state.tools, event.name)
      if (!step) return { ...state, turnId }

      // A refusal only reaches us as this text — the decision is sent
      // out-of-band, and an approval that timed out server-side was never
      // decided here at all.
      const wasRefused
        = step.status === TOOL_STATUS.AWAITING_APPROVAL && isRejectionResult(event.text)

      const settled: ToolStep = {
        ...step,
        status: event.isError
          ? TOOL_STATUS.ERROR
          : wasRefused
            ? TOOL_STATUS.REJECTED
            : TOOL_STATUS.OK,
        text: event.text,
        endedAt: event.ts,
        // The operator's own deliberation is not the tool's runtime. On a gated call the
        // producer says how long the prompt was up, and it comes back off the clock.
        durationMs: Math.max(0, event.ts - step.startedAt - (event.approvalWaitMs ?? 0)),
        ...(event.isError === undefined ? {} : { isError: event.isError }),
        ...(event.contractViolation === undefined
          ? {}
          : { contractViolation: event.contractViolation }),
      }

      // Clears the approval whether the operator answered, the approval timed
      // out server-side, or the turn was declined — in every case the stream has
      // moved on and the prompt must stop being shown.
      const stillPending
        = state.pendingApproval && state.pendingApproval.toolStepId !== step.id
          ? state.pendingApproval
          : null

      return {
        ...state,
        turnId,
        tools: replaceStep(state.tools, step.id, settled),
        pendingApproval: stillPending,
        status: stillPending ? TURN_STATUS.AWAITING_APPROVAL : TURN_STATUS.STREAMING,
      }
    }

    case EVENT.ERROR:
      return {
        ...state,
        turnId,
        status: TURN_STATUS.ERROR,
        error: event.error,
        pendingApproval: null,
        tools: settleOpenSteps(state.tools, event.ts),
      }

    case EVENT.DONE:
      return {
        ...state,
        turnId,
        status: TURN_STATUS.COMPLETE,
        pendingApproval: null,
        // `done` may carry the whole answer. Only used when nothing streamed,
        // otherwise it would duplicate the text already accumulated.
        text: state.text === '' && event.text ? event.text : state.text,
        usage: event.usage ?? state.usage,
      }

    default:
      return state
  }
}
