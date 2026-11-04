/**
 * The headless half of the package: contract types, SSE transport, the turn
 * reducer and the conversation store. No React, no DOM.
 *
 * Exported as a subpath (`@tetherto/mdk-ui-agent/core`) so a consumer building
 * its own chat surface can reuse the protocol work without the components.
 */

export type {
  ChatMessage,
  Conversation,
  ConversationActions,
  ConversationState,
  ConversationStorage,
  ConversationStore,
  ConversationStoreOptions,
  MessageRole,
} from './conversation-store'
export {
  CONVERSATION_STORAGE_KEY,
  conversationStore,
  createConversationStore,
  deriveTitle,
  MAX_CONVERSATIONS,
  MAX_MESSAGES_PER_CONVERSATION,
  MAX_PERSISTED_TOOL_TEXT_CHARS,
  mergeConversations,
  MESSAGE_ROLE,
  newConversation,
} from './conversation-store'

export { AGENT_APP_ID, hasAgentApp } from './agent-app'

export { describeAgentError, GENERIC_TURN_ERROR } from './error-text'

export type {
  AgentEvent,
  DoneEvent,
  ErrorEvent,
  EventType,
  PendingApprovalEvent,
  TerminalEventType,
  TokenEvent,
  ToolArgs,
  ToolCallEvent,
  ToolResultEvent,
  WireEvent,
} from './events'
export {
  AGENT_CONTRACT_VERSION,
  EVENT,
  isAgentEvent,
  isTerminal,
  isWireEvent,
  TERMINAL_EVENTS,
} from './events'

export {
  formatClock,
  formatConversationMeta,
  formatConversationSummary,
  formatDay,
  formatMessageCount,
} from './format'

export { clipToBoundary, unwrapWholeAnswerFence } from './markdown'

export type { LeakedToolCall } from './prose'

export { parseLeakedToolCall } from './prose'
export { isSmallTalk } from './small-talk'

export type { ReadAgentStreamOptions, ReadFramesOptions } from './sse'
export {
  APPROVAL_IDLE_TIMEOUT_MS,
  ERR_STREAM_IDLE,
  ERR_STREAM_TRUNCATED,
  FIRST_EVENT_IDLE_TIMEOUT_MS,
  parseFrame,
  readAgentStream,
  readFrames,
  STREAM_IDLE_TIMEOUT_MS,
  StreamIdleError,
} from './sse'

export type { ToolLabels } from './tool-label'
export { formatDuration, humanizeToolName, toolLabel } from './tool-label'

export type {
  AgentErrorCode,
  AgentTransportOptions,
  StreamTurnOptions,
  TokenSource,
} from './transport'
export {
  AGENT_ERROR,
  AGENT_ROUTE_PREFIX,
  AgentApiError,
  createSession,
  decideApproval,
  deleteSession,
  streamTurn,
} from './transport'

export type { AgentTurnState, PendingApproval, ToolStatus, ToolStep, TurnStatus } from './turn'
export {
  abortTurn,
  createTurnState,
  failTurn,
  isRejectionResult,
  isTurnSettled,
  reduceTurn,
  TOOL_STATUS,
  TURN_STATUS,
} from './turn'

export { uuid } from './uuid'
