import type { LiveAction, PendingSubmissionAction } from '@tetherto/mdk-ui-foundation'
import type { ReactNode } from 'react'

/** Props for the {@link ActionsSidebar} panel. */
export type ActionsSidebarProps = {
  /** Extra class names merged onto the sidebar root element. */
  className?: string
}

/** The single card used across every section (drafts, in-review, requested). */
export type ActionCardProps = {
  /** Submitter email — shown only for other users' requested actions. */
  submitterEmail?: string
  /** Primary heading (e.g. "ADD POOL CONFIG: DEV-6. DESCRIPTION: TESTING POOL"). */
  title: string
  /** Secondary line (e.g. the `URLS: [...]` summary). */
  detail?: string
  /** Server action id — omitted for local drafts (no id yet). */
  actionId?: string
  createdAt?: number
  /** Pre-computed human-readable badge text. */
  badge: string
  /** Visual treatment of the badge / card per section. */
  badgeVariant: 'draft' | 'submitted' | 'requested'
  /** Action buttons (Discard/Submit, Cancel Request, or Reject/Approve). */
  children?: ReactNode
}

/** A titled, counted group of cards within the sidebar (Drafts / In review / Requested). */
export type SectionProps = {
  title: string
  count: number
  children: ReactNode
}

/** A transient "Action Submitted" card shown after a single submit, before the poll confirms it. */
export type OptimisticEntry = {
  /** The staged draft that was submitted. */
  draft: PendingSubmissionAction
  /** Server-assigned action id once the submit response returns it. */
  serverId?: string
  /** Unix-ms timestamp the card was created, used for the TTL countdown. */
  addedAt: number
}

export type RequestedSectionProps = {
  othersVoting: LiveAction[]
  busyActionId: string | null
  isWorking: boolean
  onReject: (id: string) => void
  onApprove: (id: string) => void
  onRejectAll: () => void
  onApproveAll: () => void
}

export type InReviewSectionProps = {
  visibleOptimistic: OptimisticEntry[]
  inReview: LiveAction[]
  busyActionId: string | null
  /** Returns the click handler for a given optimistic entry, or `undefined` when the entry cannot be cancelled. */
  onCancelOptimistic: (entry: OptimisticEntry) => (() => void) | undefined
  onCancelConfirmed: (id: string) => void
}

export type DraftsSectionProps = {
  pendingSubmissions: PendingSubmissionAction[]
  pendingCount: number
  isOtherWorking: boolean
  isSubmitting: boolean
  submittingActionId: number | null
  onDiscard: (id: number) => void
  onSubmit: (draft: PendingSubmissionAction) => void
  onDiscardAll: () => void
  onSubmitAll: () => void
}
