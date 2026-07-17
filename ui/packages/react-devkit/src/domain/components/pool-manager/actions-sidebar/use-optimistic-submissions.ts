import type { PendingSubmissionAction } from '@tetherto/mdk-ui-foundation'
import { useCallback, useEffect, useState } from 'react'

import type { OptimisticEntry } from './actions-sidebar.types'

/** How long an optimistic "Action Submitted" card stays visible after submit. */
export const OPTIMISTIC_CARD_TTL_MS = 10_000

/** How often expired optimistic cards are pruned from state. */
const PRUNE_INTERVAL_MS = 1_000

/** Return shape of {@link useOptimisticSubmissions}. */
export type UseOptimisticSubmissionsResult = {
  /** Optimistic cards that are still within their TTL and not yet server-confirmed. */
  visibleOptimistic: OptimisticEntry[]
  /** Add an optimistic card right after a successful single submit. */
  addOptimistic: (draft: PendingSubmissionAction, serverId?: string) => void
  /** Remove an optimistic card by its source draft id (e.g. after an optimistic cancel). */
  removeOptimisticByDraftId: (draftId: number) => void
  /**
   * Remove an optimistic card by its server-assigned id. Call this after a
   * successful cancel of a server-confirmed live card so the optimistic entry
   * (which was suppressed while that id was in `confirmedServerIds`) doesn't
   * reappear for the rest of its TTL.
   */
  removeOptimisticByServerId: (serverId: string) => void
}

/**
 * Owns the short-lived "Action Submitted" cards shown immediately after a single
 * submit, before the live-actions poll returns the server-confirmed action.
 *
 * Cards are dropped once they are confirmed by the server (their id appears in
 * `confirmedServerIds`) or once their {@link OPTIMISTIC_CARD_TTL_MS} elapses. An
 * interval actively prunes expired entries so a card disappears on time even when
 * the live-actions poll is paused (e.g. a backgrounded tab) and isn't triggering
 * re-renders.
 */
export const useOptimisticSubmissions = (
  confirmedServerIds: Set<string>,
): UseOptimisticSubmissionsResult => {
  const [entries, setEntries] = useState<OptimisticEntry[]>([])

  useEffect(() => {
    if (entries.length === 0) return
    const intervalId = setInterval(() => {
      const cutoff = Date.now() - OPTIMISTIC_CARD_TTL_MS
      setEntries((prev) => {
        const next = prev.filter((entry) => entry.addedAt > cutoff)
        return next.length === prev.length ? prev : next
      })
    }, PRUNE_INTERVAL_MS)
    return () => clearInterval(intervalId)
  }, [entries.length])

  const addOptimistic = useCallback((draft: PendingSubmissionAction, serverId?: string) => {
    setEntries((prev) => [...prev, { draft, serverId: serverId || undefined, addedAt: Date.now() }])
  }, [])

  const removeOptimisticByDraftId = useCallback((draftId: number) => {
    setEntries((prev) => prev.filter((e) => e.draft.id !== draftId))
  }, [])

  const removeOptimisticByServerId = useCallback((serverId: string) => {
    setEntries((prev) => prev.filter((e) => e.serverId !== serverId))
  }, [])

  const now = Date.now()
  const visibleOptimistic = entries.filter(
    (entry) =>
      now - entry.addedAt < OPTIMISTIC_CARD_TTL_MS &&
      !(entry.serverId && confirmedServerIds.has(entry.serverId)),
  )

  return { visibleOptimistic, addOptimistic, removeOptimisticByDraftId, removeOptimisticByServerId }
}
