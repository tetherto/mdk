import type { JSX, ReactNode } from 'react'
import { useCallback, useState } from 'react'

import type { ToolLabels } from '../core/tool-label'
import type { UseAgentChatResult } from '../hooks/use-agent-chat'
import type { PanelView } from './panel-header'
import { AGENT_LABELS } from '../branding'
import { formatConversationSummary } from '../core/format'
import { Composer } from './composer'
import { ConversationList } from './conversation-list'
import { MessageList } from './message-list'
import { PANEL_VIEW, PanelHeader } from './panel-header'

export type CoPilotPanelProps = {
  /** The single hook instance. Both entries own one and pass it down. */
  chat: UseAgentChatResult
  title?: string
  status?: ReactNode
  toolLabels?: ToolLabels
  placeholder?: string
  /** Omitted by the route page, which has nothing to collapse into. */
  onClose?: VoidFunction | undefined
  className?: string
}

/** The panel body, shared by the docked overlay and the full-page route. */
export const CoPilotPanel = ({
  chat,
  title = AGENT_LABELS.name,
  status,
  toolLabels,
  placeholder,
  onClose,
  className,
}: CoPilotPanelProps): JSX.Element => {
  const [view, setView] = useState<PanelView>(PANEL_VIEW.CHAT)

  const toggleConversations = useCallback(() => {
    setView((current) => (current === PANEL_VIEW.CHAT ? PANEL_VIEW.CONVERSATIONS : PANEL_VIEW.CHAT))
  }, [])

  const handleNewConversation = useCallback(() => {
    chat.newConversation()
    setView(PANEL_VIEW.CHAT)
  }, [chat])

  const handleSelectConversation = useCallback(
    (id: string) => {
      chat.selectConversation(id)
      setView(PANEL_VIEW.CHAT)
    },
    [chat],
  )

  const isConversations = view === PANEL_VIEW.CONVERSATIONS

  // The conversations view describes the list rather than the connection — the
  // host-supplied status is about the agent, which is not what is on screen.
  const headerStatus = isConversations
    ? formatConversationSummary(chat.conversations.length, chat.isStreaming)
    : status

  return (
    <section className={`mdk-agent-panel${className ? ` ${className}` : ''}`} aria-label={title}>
      <PanelHeader
        view={view}
        title={isConversations ? AGENT_LABELS.conversations : title}
        status={headerStatus}
        actionsDisabled={chat.isStreaming}
        onNewConversation={handleNewConversation}
        onToggleConversations={toggleConversations}
        onClose={onClose}
      />

      {isConversations
        ? (
            <ConversationList
              conversations={chat.conversations}
              activeId={chat.active?.id ?? null}
              runningId={chat.isStreaming ? (chat.active?.id ?? null) : null}
              onSelect={handleSelectConversation}
              onCreate={handleNewConversation}
              onDelete={chat.removeConversation}
            />
          )
        : (
            <>
              <MessageList
                messages={chat.messages}
                live={chat.live}
                toolLabels={toolLabels}
                pendingApproval={chat.pendingApproval}
                isDecisionPending={chat.isDecisionPending}
                isOnline={chat.isOnline}
                onDecide={chat.decide}
                onRetry={chat.retry}
              />
              <Composer
                disabled={!chat.canSend}
                isStreaming={chat.isStreaming}
                placeholder={placeholder}
                focusKey={chat.active?.id ?? null}
                onSend={chat.send}
                onStop={chat.abort}
              />
            </>
          )}
    </section>
  )
}
