// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import type { PendingSubmissionAction } from '@tetherto/mdk-ui-foundation'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { OPTIMISTIC_CARD_TTL_MS, useOptimisticSubmissions } from '../use-optimistic-submissions'

const makeDraft = (id: number) => ({ id } as unknown as PendingSubmissionAction)

describe('useOptimisticSubmissions', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts with an empty visible list', () => {
    const { result } = renderHook(() => useOptimisticSubmissions(new Set()))
    expect(result.current.visibleOptimistic).toHaveLength(0)
  })

  // ─── addOptimistic ────────────────────────────────────────────────────────

  describe('addOptimistic', () => {
    it('makes the card immediately visible', () => {
      const { result } = renderHook(() => useOptimisticSubmissions(new Set()))
      act(() => { result.current.addOptimistic(makeDraft(1)) })
      expect(result.current.visibleOptimistic).toHaveLength(1)
    })

    it('stores the provided serverId on the entry', () => {
      const { result } = renderHook(() => useOptimisticSubmissions(new Set()))
      act(() => { result.current.addOptimistic(makeDraft(1), 'srv-abc') })
      expect(result.current.visibleOptimistic[0].serverId).toBe('srv-abc')
    })

    it('leaves serverId undefined when not provided', () => {
      const { result } = renderHook(() => useOptimisticSubmissions(new Set()))
      act(() => { result.current.addOptimistic(makeDraft(1)) })
      expect(result.current.visibleOptimistic[0].serverId).toBeUndefined()
    })

    it('accumulates multiple cards', () => {
      const { result } = renderHook(() => useOptimisticSubmissions(new Set()))
      act(() => {
        result.current.addOptimistic(makeDraft(1))
        result.current.addOptimistic(makeDraft(2))
      })
      expect(result.current.visibleOptimistic).toHaveLength(2)
    })
  })

  // ─── TTL pruning ──────────────────────────────────────────────────────────

  describe('TTL pruning', () => {
    it('card is still visible just under the TTL', () => {
      const { result } = renderHook(() => useOptimisticSubmissions(new Set()))
      act(() => { result.current.addOptimistic(makeDraft(1)) })
      act(() => { vi.advanceTimersByTime(OPTIMISTIC_CARD_TTL_MS - 1) })
      expect(result.current.visibleOptimistic).toHaveLength(1)
    })

    it('card is pruned from state and hidden once the TTL elapses', () => {
      const { result } = renderHook(() => useOptimisticSubmissions(new Set()))
      act(() => { result.current.addOptimistic(makeDraft(1)) })
      // Advance past TTL + one full prune-interval tick so the interval fires after expiry
      act(() => { vi.advanceTimersByTime(OPTIMISTIC_CARD_TTL_MS + 1_000) })
      expect(result.current.visibleOptimistic).toHaveLength(0)
    })

    it('expired cards are pruned independently — unexpired cards survive', () => {
      const { result } = renderHook(() => useOptimisticSubmissions(new Set()))
      act(() => { result.current.addOptimistic(makeDraft(1)) })
      // Add a second card half-way through the first card's TTL
      act(() => { vi.advanceTimersByTime(OPTIMISTIC_CARD_TTL_MS / 2) })
      act(() => { result.current.addOptimistic(makeDraft(2)) })
      // Advance past the first card's TTL + prune tick
      act(() => { vi.advanceTimersByTime(OPTIMISTIC_CARD_TTL_MS / 2 + 1_000) })
      // Only the second card should remain
      expect(result.current.visibleOptimistic).toHaveLength(1)
      expect(result.current.visibleOptimistic[0].draft.id).toBe(2)
    })
  })

  // ─── confirmed-id suppression ─────────────────────────────────────────────

  describe('confirmed-id suppression', () => {
    it('suppresses a card whose serverId appears in confirmedServerIds', () => {
      const { result, rerender } = renderHook(
        (ids: Set<string>) => useOptimisticSubmissions(ids),
        { initialProps: new Set<string>() },
      )
      act(() => { result.current.addOptimistic(makeDraft(1), 'srv-1') })
      expect(result.current.visibleOptimistic).toHaveLength(1)

      rerender(new Set(['srv-1']))
      expect(result.current.visibleOptimistic).toHaveLength(0)
    })

    it('un-suppresses a card if its serverId is later removed from confirmedServerIds', () => {
      const { result, rerender } = renderHook(
        (ids: Set<string>) => useOptimisticSubmissions(ids),
        { initialProps: new Set<string>(['srv-1']) },
      )
      act(() => { result.current.addOptimistic(makeDraft(1), 'srv-1') })
      expect(result.current.visibleOptimistic).toHaveLength(0)

      rerender(new Set<string>())
      expect(result.current.visibleOptimistic).toHaveLength(1)
    })

    it('does not suppress a card with no serverId even when confirmedServerIds is non-empty', () => {
      const { result } = renderHook(() => useOptimisticSubmissions(new Set(['any-id'])))
      act(() => { result.current.addOptimistic(makeDraft(1)) })
      expect(result.current.visibleOptimistic).toHaveLength(1)
    })

    it('only suppresses the matching card, leaving unrelated ones visible', () => {
      const { result, rerender } = renderHook(
        (ids: Set<string>) => useOptimisticSubmissions(ids),
        { initialProps: new Set<string>() },
      )
      act(() => {
        result.current.addOptimistic(makeDraft(1), 'srv-a')
        result.current.addOptimistic(makeDraft(2), 'srv-b')
      })
      rerender(new Set(['srv-a']))
      expect(result.current.visibleOptimistic).toHaveLength(1)
      expect(result.current.visibleOptimistic[0].serverId).toBe('srv-b')
    })
  })

  // ─── removeOptimisticByDraftId ────────────────────────────────────────────

  describe('removeOptimisticByDraftId', () => {
    it('removes the card with the matching draft id', () => {
      const { result } = renderHook(() => useOptimisticSubmissions(new Set()))
      act(() => { result.current.addOptimistic(makeDraft(42)) })
      act(() => { result.current.removeOptimisticByDraftId(42) })
      expect(result.current.visibleOptimistic).toHaveLength(0)
    })

    it('leaves other cards untouched', () => {
      const { result } = renderHook(() => useOptimisticSubmissions(new Set()))
      act(() => {
        result.current.addOptimistic(makeDraft(1))
        result.current.addOptimistic(makeDraft(2))
      })
      act(() => { result.current.removeOptimisticByDraftId(1) })
      expect(result.current.visibleOptimistic).toHaveLength(1)
      expect(result.current.visibleOptimistic[0].draft.id).toBe(2)
    })

    it('is a no-op when no entry has the given draft id', () => {
      const { result } = renderHook(() => useOptimisticSubmissions(new Set()))
      act(() => { result.current.addOptimistic(makeDraft(1)) })
      act(() => { result.current.removeOptimisticByDraftId(999) })
      expect(result.current.visibleOptimistic).toHaveLength(1)
    })
  })

  // ─── removeOptimisticByServerId ───────────────────────────────────────────

  describe('removeOptimisticByServerId', () => {
    it('removes the card with the matching server id', () => {
      const { result } = renderHook(() => useOptimisticSubmissions(new Set()))
      act(() => { result.current.addOptimistic(makeDraft(1), 'srv-x') })
      act(() => { result.current.removeOptimisticByServerId('srv-x') })
      expect(result.current.visibleOptimistic).toHaveLength(0)
    })

    it('leaves other cards untouched', () => {
      const { result } = renderHook(() => useOptimisticSubmissions(new Set()))
      act(() => {
        result.current.addOptimistic(makeDraft(1), 'srv-a')
        result.current.addOptimistic(makeDraft(2), 'srv-b')
      })
      act(() => { result.current.removeOptimisticByServerId('srv-a') })
      expect(result.current.visibleOptimistic).toHaveLength(1)
      expect(result.current.visibleOptimistic[0].serverId).toBe('srv-b')
    })

    it('is a no-op when no entry has the given server id', () => {
      const { result } = renderHook(() => useOptimisticSubmissions(new Set()))
      act(() => { result.current.addOptimistic(makeDraft(1), 'srv-a') })
      act(() => { result.current.removeOptimisticByServerId('srv-z') })
      expect(result.current.visibleOptimistic).toHaveLength(1)
    })
  })
})
