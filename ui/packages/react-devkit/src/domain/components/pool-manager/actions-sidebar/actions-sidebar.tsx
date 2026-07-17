import { ChevronRightIcon, Cross2Icon } from '@radix-ui/react-icons'
import type { PendingSubmissionAction } from '@tetherto/mdk-ui-foundation'
import {
  useActions,
  useCancelAction,
  useLiveActions,
  useSubmitPendingActions,
  useSubmitSingleAction,
  useVoteOnAction,
} from '@tetherto/mdk-react-adapter'
import { useState } from 'react'

import { Button, cn, Dialog, DialogContent, DialogFooter, PinIcon, UnPinIcon } from '@primitives'

import { notifyError, notifySuccess } from '../../../utils/notification-utils'
import { ACTION_SIDEBAR_REQUESTED_BADGE, ACTION_SIDEBAR_STATUS_LABELS } from '../pool-manager-constants'
import {
  describeLiveAction,
  describePendingActionExpanded,
  extractSubmittedActionId,
  formatActionTimestamp,
  getActionErrorMessage,
  isAssignPoolAction,
} from '../pending-actions/pending-actions-utils'
import './actions-sidebar.scss'
import type {
  ActionCardProps,
  ActionsSidebarProps,
  DraftsSectionProps,
  InReviewSectionProps,
  OptimisticEntry,
  RequestedSectionProps,
  SectionProps,
} from './actions-sidebar.types'
import { useOptimisticSubmissions } from './use-optimistic-submissions'

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * The single card used across every section. Renders whatever data it's given:
 * an optional submitter email (requested actions), title, badge, optional detail
 * line, optional `#id - timestamp` meta (omitted for local drafts), and action
 * buttons passed as children (Discard/Submit, Cancel Request, or Reject/Approve).
 */
const ActionCard = ({
  submitterEmail,
  title,
  detail,
  actionId,
  createdAt,
  badge,
  badgeVariant,
  children,
}: ActionCardProps) => {
  const timestamp = formatActionTimestamp(createdAt)
  return (
    <div className="mdk-actions-sidebar__card">
      {submitterEmail && (
        <p className="mdk-actions-sidebar__card__submitter">
          <span>{submitterEmail}</span>
          <ChevronRightIcon />
        </p>
      )}
      <p className="mdk-actions-sidebar__card__title">{title.toUpperCase()}</p>
      <span
        className={cn(
          'mdk-actions-sidebar__card__badge',
          `mdk-actions-sidebar__card__badge--${badgeVariant}`,
        )}
      >
        {badge}
      </span>
      {detail && <p className="mdk-actions-sidebar__card__description">{detail.toUpperCase()}</p>}
      {(actionId || timestamp) && (
        <p className="mdk-actions-sidebar__card__meta">
          {actionId && `#${actionId}`}
          {timestamp && actionId ? ` - ${timestamp}` : timestamp}
        </p>
      )}
      {children && <div className="mdk-actions-sidebar__card__buttons">{children}</div>}
    </div>
  )
}

const Section = ({ title, count, children }: SectionProps) => (
  <div className="mdk-actions-sidebar__section">
    <div className="mdk-actions-sidebar__section-header">
      <span className="mdk-actions-sidebar__section-title">{title}</span>
      <span className="mdk-actions-sidebar__section-count">{count}</span>
    </div>
    <div className="mdk-actions-sidebar__section-body">{children}</div>
  </div>
)

const RequestedSection = ({
  othersVoting,
  busyActionId,
  isWorking,
  onReject,
  onApprove,
  onRejectAll,
  onApproveAll,
}: RequestedSectionProps) => (
  <Section title="Requested" count={othersVoting.length}>
    <div className="mdk-actions-sidebar__cards">
      {othersVoting.map((action) => {
        const { title, detail } = describeLiveAction(action)
        return (
          <ActionCard
            key={action.id}
            submitterEmail={action.votesPos?.[0]}
            title={title}
            detail={detail}
            actionId={action.id}
            createdAt={action.createdAt ?? Number(action.id)}
            badge={ACTION_SIDEBAR_REQUESTED_BADGE}
            badgeVariant="requested"
          >
            <Button type="button" variant="secondary" size="md" disabled={busyActionId === action.id} onClick={() => onReject(action.id)}>
              Reject
            </Button>
            <Button type="button" variant="primary" size="md" disabled={busyActionId === action.id} onClick={() => onApprove(action.id)}>
              Approve
            </Button>
          </ActionCard>
        )
      })}
    </div>
    {othersVoting.length > 1 && (
      <div className="mdk-actions-sidebar__section-footer">
        <Button type="button" variant="tertiary" size="md" disabled={isWorking} onClick={onRejectAll}>
          Reject All
        </Button>
        <Button type="button" variant="primary" size="md" disabled={isWorking} onClick={onApproveAll}>
          Approve All
        </Button>
      </div>
    )}
  </Section>
)

const InReviewSection = ({
  visibleOptimistic,
  inReview,
  busyActionId,
  onCancelOptimistic,
  onCancelConfirmed,
}: InReviewSectionProps) => (
  <Section title="In review" count={visibleOptimistic.length + inReview.length}>
    <div className="mdk-actions-sidebar__cards">
      {/* Optimistic entries — shown right after submit, before server poll confirms */}
      {visibleOptimistic.map((entry) => {
        const { title } = describePendingActionExpanded(entry.draft)
        const handleCancel = onCancelOptimistic(entry)
        return (
          <ActionCard
            key={`optimistic-${entry.draft.id}`}
            title={title}
            actionId={entry.serverId ?? ''}
            createdAt={entry.addedAt}
            badge={ACTION_SIDEBAR_STATUS_LABELS.voting ?? 'Action Submitted'}
            badgeVariant="submitted"
          >
            {handleCancel && (
              <Button type="button" variant="secondary" size="md" disabled={busyActionId === entry.serverId} onClick={handleCancel}>
                Cancel Request
              </Button>
            )}
          </ActionCard>
        )
      })}
      {/* Server-confirmed actions */}
      {inReview.map((action) => {
        const { title, detail, statusBadge } = describeLiveAction(action)
        const isVotingStatus = (action.status ?? 'voting').toLowerCase() === 'voting'
        return (
          <ActionCard
            key={action.id}
            title={title}
            detail={detail}
            actionId={action.id}
            createdAt={action.createdAt ?? Number(action.id)}
            badge={statusBadge}
            badgeVariant="submitted"
          >
            {isVotingStatus && (
              <Button type="button" variant="secondary" size="md" disabled={busyActionId === action.id} onClick={() => onCancelConfirmed(action.id)}>
                Cancel Request
              </Button>
            )}
          </ActionCard>
        )
      })}
    </div>
  </Section>
)

const DraftsSection = ({
  pendingSubmissions,
  pendingCount,
  isOtherWorking,
  isSubmitting,
  submittingActionId,
  onDiscard,
  onSubmit,
  onDiscardAll,
  onSubmitAll,
}: DraftsSectionProps) => (
  <Section title="Drafts" count={pendingCount}>
    <div className="mdk-actions-sidebar__cards">
      {pendingSubmissions.map((action) => {
        const { title, badge, description } = describePendingActionExpanded(action)
        const isThisCardSubmitting = submittingActionId === action.id
        return (
          <ActionCard key={action.id} title={title} detail={description} badge={badge} badgeVariant="draft">
            <Button type="button" variant="secondary" size="md" disabled={isThisCardSubmitting} onClick={() => onDiscard(action.id)}>
              Discard
            </Button>
            <Button type="button" variant="primary" size="md" disabled={isThisCardSubmitting} onClick={() => onSubmit(action)}>
              {isThisCardSubmitting ? 'Submitting…' : 'Submit'}
            </Button>
          </ActionCard>
        )
      })}
    </div>
    {pendingCount > 1 && (
      <div className="mdk-actions-sidebar__section-footer">
        <Button type="button" variant="tertiary" size="md" disabled={isOtherWorking} onClick={onDiscardAll}>
          Discard All
        </Button>
        <Button type="button" variant="primary" size="md" disabled={isOtherWorking} onClick={onSubmitAll}>
          {isSubmitting ? 'Submitting…' : 'Submit All'}
        </Button>
      </div>
    )}
  </Section>
)

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * Full-height side panel for the MiningOS voting/approval workflow.
 *
 * Three sections (only rendered when non-empty):
 * - **Draft** — locally-staged actions not yet sent to the server.
 * - **In review** — actions this user submitted, awaiting votes.
 * - **Requested** — other users' voting actions this user can approve/reject
 *   (only shown when the current token has `actions:w`).
 *
 * Open/close state is driven by `actionsStore.sidebarOpen` so the header
 * `PendingActionsButton` and any in-page code can open it without prop-drilling.
 * Mount this once at the app root — it renders nothing when closed.
 *
 * @example
 * ```tsx
 * // Mount once at the app root alongside the main content outlet.
 * // The sidebar reads all state from actionsStore internally — no props needed.
 * import { ActionsSidebar } from '@tetherto/mdk-react-devkit'
 *
 * export function App() {
 *   return (
 *     <div className="app-layout">
 *       <main><Outlet /></main>
 *       <ActionsSidebar />
 *     </div>
 *   )
 * }
 * ```
 *
 * @category dashboards
 * @kernelCapability pool-performance
 * @domain mining-operations
 * @tier agent-ready
 */
export const ActionsSidebar = ({ className }: ActionsSidebarProps) => {
  const {
    pendingSubmissions,
    removePendingSubmissionAction,
    clearAllPendingSubmissions,
    sidebarOpen: open,
    setSidebarOpen,
    sidebarPinned: pinned,
    setSidebarPinned,
  } = useActions()

  const { submit, isSubmitting, pendingCount } = useSubmitPendingActions()
  const { myVoting, myReady, myExecuting, othersVoting, canApprove, isLoading: isLiveLoading } = useLiveActions()
  const { cancel, isCancelling } = useCancelAction()
  const { vote, isVoting } = useVoteOnAction()
  const { submitSingle, isSubmitting: isSingleSubmitting, submittingActionId } = useSubmitSingleAction()

  const [confirmMode, setConfirmMode] = useState<
    | { kind: 'submit-all' }
    | { kind: 'discard-all' }
    | { kind: 'approve-all' }
    | { kind: 'reject-all' }
    | null
  >(null)

  // Per-card op state for live actions (cancel / approve / reject) so a single
  // card's buttons disable without freezing the rest of the sidebar.
  const [busyActionId, setBusyActionId] = useState<string | null>(null)

  const onClose = () => setSidebarOpen(false)
  const togglePin = () => setSidebarPinned(!pinned)

  // Assign-pool (SETUP_POOLS) actions are fire-and-forget: they surface only as a
  // transient optimistic card (max 10s, no Cancel Request) and are never shown as
  // a persisted, server-polled "In review" card — that avoids duplicate cards and
  // a redundant "Executing…" state for pool assignments.
  const inReview = [...myVoting, ...myReady, ...myExecuting].filter(
    (action) => !isAssignPoolAction(action),
  )

  // Normalise to String — the server may return numeric ids while the optimistic
  // serverId is already coerced to string via String(...) at submit time.
  const serverActionIds = new Set(inReview.map((action) => String(action.id)))
  const { visibleOptimistic, addOptimistic, removeOptimisticByDraftId, removeOptimisticByServerId } =
    useOptimisticSubmissions(serverActionIds)

  // "Other working" = any global/bulk operation. Used to gate the bulk footers
  // and the confirmation dialog (not individual cards).
  const isOtherWorking = isSubmitting || isCancelling || isVoting
  const isWorking = isOtherWorking || isSingleSubmitting

  /** Run a single-card live-action op: flag the card busy, notify, then clear. */
  const runCardOp = (
    id: string,
    op: () => Promise<unknown>,
    onSuccess: () => void,
    errorTitle: string,
    errorMessage: string,
  ) => {
    setBusyActionId(id)
    op()
      .then(() => onSuccess())
      .catch(() => notifyError(errorTitle, errorMessage))
      .finally(() => setBusyActionId(null))
  }

  const hasDrafts = pendingCount > 0
  const hasInReview = inReview.length > 0 || visibleOptimistic.length > 0
  const hasRequests = othersVoting.length > 0
  const isEmpty = !hasDrafts && !hasInReview && !hasRequests && !isLiveLoading

  const totalCount = pendingCount + inReview.length + visibleOptimistic.length + othersVoting.length
  const sidebarTitle = `${totalCount} ${totalCount === 1 ? 'Action' : 'Actions'} Pending Submission`

  const requestConfirm = (kind: NonNullable<typeof confirmMode>['kind']) =>
    setConfirmMode({ kind })
  const clearConfirm = () => setConfirmMode(null)

  const executeConfirmed = async () => {
    if (!confirmMode) return
    try {
      if (confirmMode.kind === 'submit-all') {
        await submit()
        notifySuccess('Actions submitted', `${pendingCount} action${pendingCount === 1 ? '' : 's'} sent for approval`)
      } else if (confirmMode.kind === 'discard-all') {
        clearAllPendingSubmissions()
        notifySuccess('Discarded', 'All draft actions were discarded')
      } else if (confirmMode.kind === 'approve-all') {
        await Promise.all(othersVoting.map((action) => vote({ id: action.id, approve: true })))
        notifySuccess('Approved', `${othersVoting.length} action${othersVoting.length === 1 ? '' : 's'} approved`)
      } else if (confirmMode.kind === 'reject-all') {
        await Promise.all(othersVoting.map((action) => vote({ id: action.id, approve: false })))
        notifySuccess('Rejected', `${othersVoting.length} action${othersVoting.length === 1 ? '' : 's'} rejected`)
      }
    } catch (err: unknown) {
      notifyError('Operation failed', getActionErrorMessage(err, 'Could not complete the action'))
    } finally {
      clearConfirm()
    }
  }

  /**
   * Submit a single draft. For assign-pool (SETUP_POOLS) actions only, show an
   * optimistic card bridging the gap until the 10-second TTL expires — those
   * actions are filtered out of `inReview` so they never get a server-confirmed
   * card. All other action types (update/create pool config, etc.) appear in
   * `inReview` on the next poll and don't need an optimistic card.
   */
  const handleSubmitDraft = (draft: PendingSubmissionAction) => {
    submitSingle(draft.id)
      .then((resp) => {
        if (isAssignPoolAction(draft)) {
          addOptimistic(draft, extractSubmittedActionId(resp))
        }
      })
      .catch((err: unknown) =>
        notifyError('Submit failed', getActionErrorMessage(err, 'Could not submit the action')),
      )
  }

  const handleReject = (id: string) =>
    runCardOp(
      id,
      () => vote({ id, approve: false }),
      () => notifySuccess('Rejected', 'The action was rejected'),
      'Reject failed',
      'Could not reject the action',
    )

  const handleApprove = (id: string) =>
    runCardOp(
      id,
      () => vote({ id, approve: true }),
      () => notifySuccess('Approved', 'The action was approved'),
      'Approve failed',
      'Could not approve the action',
    )

  const handleCancelConfirmed = (id: string) => {
    removeOptimisticByServerId(id)
    runCardOp(
      id,
      () => cancel({ ids: [id], type: 'voting' }),
      () => notifySuccess('Request cancelled', 'The action request was cancelled'),
      'Cancel failed',
      'Could not cancel the action',
    )
  }

  const getOptimisticCancelHandler = (entry: OptimisticEntry): (() => void) | undefined => {
    if (!entry.serverId || isAssignPoolAction(entry.draft)) return undefined
    return () =>
      runCardOp(
        entry.serverId!,
        () => cancel({ ids: [entry.serverId!], type: 'voting' }),
        () => {
          removeOptimisticByDraftId(entry.draft.id)
          notifySuccess('Request cancelled', 'The action request was cancelled')
        },
        'Cancel failed',
        'Could not cancel the action',
      )
  }

  const confirmLabels: Record<NonNullable<typeof confirmMode>['kind'], string> = {
    'submit-all': 'Submit all drafts to the approval workflow?',
    'discard-all': 'Discard all draft actions? This cannot be undone.',
    'approve-all': `Approve all ${othersVoting.length} requested action${othersVoting.length === 1 ? '' : 's'}?`,
    'reject-all': `Reject all ${othersVoting.length} requested action${othersVoting.length === 1 ? '' : 's'}?`,
  }

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="mdk-actions-sidebar__header">
        <Button
          type="button"
          variant="icon"
          size="md"
          icon={pinned ? <UnPinIcon size={12} /> : <PinIcon size={12} />}
          onClick={togglePin}
          aria-label={pinned ? 'Unpin sidebar' : 'Pin sidebar'}
          title={pinned ? 'Unpin' : 'Pin'}
        />
        <span className="mdk-actions-sidebar__title">{sidebarTitle}</span>
        {!pinned && (
          <Button type="button" variant="icon" size="md" icon={<Cross2Icon />} onClick={onClose} aria-label="Close sidebar" />
        )}
      </div>

        {/* Body */}
        <div className="mdk-actions-sidebar__body">
          {isEmpty && (
            <p className="mdk-actions-sidebar__empty">No pending actions.</p>
          )}

          {/* 1 — Requested: others' voting actions needing my vote (Reject / Approve). */}
          {hasRequests && canApprove && (
            <RequestedSection
              othersVoting={othersVoting}
              busyActionId={busyActionId}
              isWorking={isWorking}
              onReject={handleReject}
              onApprove={handleApprove}
              onRejectAll={() => requestConfirm('reject-all')}
              onApproveAll={() => requestConfirm('approve-all')}
            />
          )}

          {/* 2 — In review: my submitted actions (optimistic first, then server-confirmed). */}
          {hasInReview && (
            <InReviewSection
              visibleOptimistic={visibleOptimistic}
              inReview={inReview}
              busyActionId={busyActionId}
              onCancelOptimistic={getOptimisticCancelHandler}
              onCancelConfirmed={handleCancelConfirmed}
            />
          )}

          {/* 3 — Drafts: local queue, not yet submitted. */}
          {hasDrafts && (
            <DraftsSection
              pendingSubmissions={pendingSubmissions}
              pendingCount={pendingCount}
              isOtherWorking={isOtherWorking}
              isSubmitting={isSubmitting}
              submittingActionId={submittingActionId}
              onDiscard={(id) => removePendingSubmissionAction({ id })}
              onSubmit={handleSubmitDraft}
              onDiscardAll={() => requestConfirm('discard-all')}
              onSubmitAll={() => requestConfirm('submit-all')}
            />
          )}
        </div>

      {/* Confirmation dialog */}
      <Dialog open={!!confirmMode} onOpenChange={(isOpen) => !isOpen && clearConfirm()}>
        <DialogContent
          title="Confirm action"
          closable
          onClose={clearConfirm}
          closeOnClickOutside={false}
        >
          <p className="mdk-actions-sidebar__confirm-text">
            {confirmMode ? confirmLabels[confirmMode.kind] : ''}
          </p>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={clearConfirm} disabled={isWorking}>
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={executeConfirmed} disabled={isWorking}>
              {isWorking ? 'Working…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )

  // Pinned = always-visible inline panel pushed next to the main content.
  // Unpinned = slide-in drawer with a dimming backdrop.
  if (pinned) {
    return (
      <div
        className={cn('mdk-actions-sidebar', 'mdk-actions-sidebar--pinned', className)}
        aria-label="Actions sidebar"
      >
        {sidebarContent}
      </div>
    )
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="mdk-actions-sidebar__backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      {/* Slide-in drawer */}
      <div
        className={cn(
          'mdk-actions-sidebar',
          open && 'mdk-actions-sidebar--open',
          className,
        )}
        aria-label="Actions sidebar"
      >
        {sidebarContent}
      </div>
    </>
  )
}
