import { Button } from '@tetherto/mdk-react-devkit/primitives'
import type { JSX } from 'react'
import { memo } from 'react'

import { describeAgentError, isRetryableAgentError } from '../core/error-text'
import { WarningIcon } from './icons'

export type ErrorNoticeProps = {
  /** The raw value the turn ended on — a code wherever one was available. */
  error: string
  /**
   * The browser's view of the connection. A retry that cannot leave the machine
   * is shown disabled rather than hidden, so the affordance does not move.
   */
  isOnline?: boolean
  onRetry?: VoidFunction
}

/**
 * How a failed turn reads in the transcript.
 *
 * An icon, one sentence, and a retry offered only where re-sending could
 * plausibly work. What this replaces was a line of red text and an underlined
 * "Try again" that said nothing about what pressing it would do — and pressing
 * it on a stack with no agent app installed only ever failed again.
 *
 * The code stays, folded away: it is what a bug report needs and exactly what
 * the sentence is meant to spare everyone else.
 */
const ErrorNoticeView = ({ error, isOnline = true, onRetry }: ErrorNoticeProps): JSX.Element => {
  // Prose means the value was never a code, so there is nothing to fold away —
  // `describeAgentError` will have passed it straight through.
  const code = error.startsWith('ERR_') ? error : null
  const canRetry = onRetry && isRetryableAgentError(error)

  return (
    <div className="mdk-agent-error" role="alert">
      <span className="mdk-agent-error__icon" aria-hidden="true">
        <WarningIcon size={12} />
      </span>

      <div className="mdk-agent-error__body">
        <p className="mdk-agent-error__message">{describeAgentError(error)}</p>

        {code
          ? (
              <details className="mdk-agent-error__details">
                <summary>Details</summary>
                <code>{code}</code>
              </details>
            )
          : null}
      </div>

      {canRetry
        ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mdk-agent-error__retry"
              disabled={!isOnline}
              onClick={onRetry}
            >
              Try again
            </Button>
          )
        : null}
    </div>
  )
}

export const ErrorNotice = memo(ErrorNoticeView)
