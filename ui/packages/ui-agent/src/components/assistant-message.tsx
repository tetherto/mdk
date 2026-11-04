import { Loader } from '@tetherto/mdk-react-devkit/primitives'
import type { JSX } from 'react'
import { memo, useMemo } from 'react'

import type { ToolLabels } from '../core/tool-label'
import type { PendingApproval, ToolStep } from '../core/turn'
import { AGENT_LABELS } from '../branding'
import { parseLeakedToolCall } from '../core/prose'
import { isSmallTalk } from '../core/small-talk'
import { ApprovalCard, describeApprovalIntent } from './approval-card'
import { CollapsibleAnswer } from './collapsible-answer'
import { ErrorNotice } from './error-notice'
import { LeakedToolCallNotice } from './leaked-tool-call-notice'
import { NoToolsNote } from './no-tools-note'
import { ToolChip } from './tool-chip'

export type AssistantMessageProps = {
  text: string
  /** The operator message this answers — only read to decide whether it was a fleet question. */
  question?: string
  tools?: ToolStep[]
  /** The `error` the turn ended on. A raw `ERR_*` code is mapped before it is shown. */
  error?: string | null
  /** The turn was stopped before it finished, so this is a part of an answer. */
  interrupted?: boolean
  /** The turn is still running: render plain text and the thinking indicator. */
  streaming?: boolean
  /** Passed to the error notice, which will not offer a retry that cannot be sent. */
  isOnline?: boolean
  toolLabels?: ToolLabels
  approval?: PendingApproval | null
  isDecisionPending?: boolean
  onDecide?: (approved: boolean) => void
  /** Offered on a failed turn, so the operator does not retype the question. */
  onRetry?: VoidFunction
}

const AssistantMessageView = ({
  text,
  question = '',
  tools = [],
  error = null,
  interrupted = false,
  streaming = false,
  isOnline = true,
  toolLabels,
  approval = null,
  isDecisionPending = false,
  onDecide,
  onRetry,
}: AssistantMessageProps): JSX.Element => {
  // Only worth checking once the turn has settled — a partial answer can look
  // like a bare JSON object simply because the rest has not arrived yet.
  const leaked = useMemo(() => (streaming ? null : parseLeakedToolCall(text)), [streaming, text])

  const hasText = text.trim().length > 0
  const isThinking = streaming && !hasText && approval === null

  // The chip for the gated step is suppressed while its card is up: the card
  // already names the action, the device and the command, so the chip would just
  // restate it directly above.
  const chips = approval ? tools.filter((step) => step.id !== approval.toolStepId) : tools

  // Stated only once the turn has settled — mid-stream the tools may simply not
  // have been called *yet*. A leaked call and an errored turn already say their
  // own thing, so the note would only add noise there. Nor is it said against a
  // greeting: consulting nothing is the right answer to "hey", and the marker
  // was appearing on every one of them.
  const answeredWithoutTools
    = !streaming
      && tools.length === 0
      && hasText
      && leaked === null
      && !error
      && !isSmallTalk(question)

  return (
    <div className="mdk-agent-message mdk-agent-message--assistant">
      <p className="mdk-agent-message__role">
        <span className="mdk-agent-message__dot" aria-hidden="true" />
        {AGENT_LABELS.name}
        {answeredWithoutTools ? <NoToolsNote /> : null}
      </p>

      {chips.length > 0
        ? (
            <div className="mdk-agent-message__tools">
              {chips.map((step) => (
                <ToolChip key={step.id} step={step} toolLabels={toolLabels} />
              ))}
            </div>
          )
        : null}

      {approval
        ? (
            <p className="mdk-agent-message__intent">
              {describeApprovalIntent(approval, toolLabels)}
            </p>
          )
        : null}

      {/* `inline`, or the loader's 200px block height strands the dots ~100px below this
          label with dead space between, and the turn reads as frozen while it is working. */}
      {isThinking ? <Loader inline size={6} count={3} color="orange" /> : null}

      {hasText && leaked === null ? <CollapsibleAnswer text={text} streaming={streaming} /> : null}
      {hasText && leaked !== null ? <LeakedToolCallNotice call={leaked} /> : null}

      {approval && onDecide
        ? (
            <ApprovalCard
              approval={approval}
              toolLabels={toolLabels}
              pending={isDecisionPending}
              onDecide={onDecide}
            />
          )
        : null}

      {interrupted && !error
        ? <p className="mdk-agent-message__note">Stopped early — this is not the whole answer.</p>
        : null}

      {error
        ? <ErrorNotice error={error} isOnline={isOnline} {...(onRetry ? { onRetry } : {})} />
        : null}

    </div>
  )
}

export const AssistantMessage = memo(AssistantMessageView)
