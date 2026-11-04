import { Button } from '@tetherto/mdk-react-devkit/primitives'
import type { JSX, ReactNode } from 'react'
import { memo } from 'react'

import { AGENT_LABELS } from '../branding'
import { BackIcon, CloseIcon, ListLayoutIcon, MessagePlusIcon } from './icons'

export const PANEL_VIEW = { CHAT: 'chat', CONVERSATIONS: 'conversations' } as const

export type PanelView = (typeof PANEL_VIEW)[keyof typeof PANEL_VIEW]

export type PanelHeaderProps = {
  view: PanelView
  title: string
  /**
   * The line under the title. Nothing on the gateway reports the model name or
   * the tool count — the agent is built lazily on the first session and its MCP
   * tools are never enumerated over HTTP — so the host supplies this or it stays
   * empty.
   */
  status?: ReactNode
  /** Disabled mid-turn: starting or switching conversation would strand the stream. */
  actionsDisabled?: boolean
  onNewConversation: VoidFunction
  onToggleConversations: VoidFunction
  onClose?: VoidFunction | undefined
}

const PanelHeaderView = ({
  view,
  title,
  status,
  actionsDisabled = false,
  onNewConversation,
  onToggleConversations,
  onClose,
}: PanelHeaderProps): JSX.Element => (
  <header className="mdk-agent-header">
    <div className="mdk-agent-header__titles">
      <h2 className="mdk-agent-header__title">
        {/* The back control's space is reserved in both views, so the title
            starts at the same x whichever one is showing. Switching used to
            shunt it 20px sideways while the taller control grew the row, and
            between that and the status line appearing the whole header
            jumped. */}
        {view === PANEL_VIEW.CONVERSATIONS
          ? (
              <Button
                variant="icon"
                className="mdk-agent-header__back"
                aria-label={AGENT_LABELS.backToConversation}
                icon={<BackIcon size={16} />}
                onClick={onToggleConversations}
              />
            )
          : <span className="mdk-agent-header__back-slot" aria-hidden="true" />}
        {title}
      </h2>
      {status ? <p className="mdk-agent-header__status">{status}</p> : null}
    </div>

    <div className="mdk-agent-header__actions">
      <Button
        variant="icon"
        aria-label={AGENT_LABELS.newConversation}
        disabled={actionsDisabled}
        icon={<MessagePlusIcon size={16} />}
        onClick={onNewConversation}
      />
      <Button
        variant="icon"
        aria-label={AGENT_LABELS.conversations}
        aria-pressed={view === PANEL_VIEW.CONVERSATIONS}
        icon={<ListLayoutIcon size={16} />}
        onClick={onToggleConversations}
      />
      {onClose
        ? (
            <Button
              variant="icon"
              aria-label={AGENT_LABELS.close}
              icon={<CloseIcon size={16} />}
              onClick={onClose}
            />
          )
        : null}
    </div>
  </header>
)

export const PanelHeader = memo(PanelHeaderView)
