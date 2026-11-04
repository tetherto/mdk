/**
 * Operator-readable text for the failures a turn can end on.
 *
 * `reduceTurn` stores whatever the `error` event carried, which is a bare code
 * like `ERR_AGENT_STREAM_TRUNCATED` — useful in a bug report, meaningless in a
 * transcript. The raw code stays on the message; this is applied at render time,
 * so the stored history keeps the diagnosable value.
 */

import { ERR_STREAM_IDLE, ERR_STREAM_TRUNCATED } from './sse'
import { AGENT_ERROR } from './transport'

/** Shown when a turn dies before the gateway said anything useful. */
export const GENERIC_TURN_ERROR = 'The agent could not complete that request.'

/**
 * The request never reached the gateway — `fetch` rejected rather than
 * answering. Synthesised by the hook; no wire code carries this, because
 * nothing ever got far enough to produce one.
 */
export const ERR_OFFLINE = 'ERR_AGENT_OFFLINE'

const SESSION_EXPIRED = 'Your session expired. Sign in again.'
const TROUBLE = 'The agent is having trouble right now. Try again in a moment.'

const TEXT_FOR_CODE: Record<string, string> = {
  [ERR_OFFLINE]: "You're offline. Check your connection and try again.",
  [AGENT_ERROR.UNAVAILABLE]: 'The agent is not configured on this gateway.',
  [AGENT_ERROR.TURN_ACTIVE]: 'A turn is already running in this conversation.',
  [AGENT_ERROR.TEXT_REQUIRED]: 'Type a message first.',
  [AGENT_ERROR.SESSION_NOT_FOUND]: 'That conversation is no longer open on the gateway.',
  [AGENT_ERROR.ROUTES_NOT_MOUNTED]:
    'This stack has no agent app installed, so the gateway serves no agent routes.',
  [ERR_STREAM_TRUNCATED]: 'The connection to the agent ended before the answer finished.',
  [ERR_STREAM_IDLE]: 'The agent stopped responding, so the connection was assumed lost.',
}

/**
 * The status behind a code `codeFor` synthesised for a reply that carried none
 * of its own, or `undefined` for a code that names its own failure.
 */
const SYNTHESISED_STATUS = /^ERR_AGENT_HTTP_(\d{3})$/

function statusOf(code: string): number | undefined {
  const status = Number(SYNTHESISED_STATUS.exec(code)?.[1])
  return status || undefined
}

/**
 * What to say about a status that stood in for a missing code.
 *
 * Grouped by what the operator can do about it rather than enumerated one by
 * one: every 5xx reads the same from here, and a status this release has never
 * thought about still says something true.
 */
function describeStatus(status: number): string {
  if (status === 401 || status === 403) return SESSION_EXPIRED
  if (status >= 500) return TROUBLE
  return GENERIC_TURN_ERROR
}

/**
 * Maps a code to a sentence, passing anything that is not one through unchanged.
 *
 * The producer's codes are all `ERR_*`, so a value in that shape that is not in
 * the table is a code this release has never seen — it becomes the generic
 * sentence rather than being shown verbatim. Anything else is already prose.
 */
export function describeAgentError(error: string | null | undefined): string | null {
  if (!error) return null
  if (TEXT_FOR_CODE[error]) return TEXT_FOR_CODE[error]

  const status = statusOf(error)
  if (status !== undefined) return describeStatus(status)

  return error.startsWith('ERR_') ? GENERIC_TURN_ERROR : error
}

/**
 * Whether offering "Try again" on this failure is honest.
 *
 * Re-sending the same question to a stack with no agent app, or one that just
 * refused the token, fails identically — the button would only teach the
 * operator that it does nothing.
 */
const NOT_RETRYABLE = new Set<string>([
  AGENT_ERROR.ROUTES_NOT_MOUNTED,
  AGENT_ERROR.UNAVAILABLE,
  AGENT_ERROR.TEXT_REQUIRED,
])

export function isRetryableAgentError(error: string | null | undefined): boolean {
  if (!error) return false
  if (NOT_RETRYABLE.has(error)) return false

  const status = statusOf(error)
  return status !== 401 && status !== 403
}
