import { describe, expect, it } from 'vitest'
import { createActionsStore, getExistedIndex, nextSubmissionId } from './actions-store'

describe('actionsStore', () => {
  it('adds and assigns sequential ids', () => {
    const store = createActionsStore()
    store.getState().setAddPendingSubmissionAction({ action: 'a' })
    store.getState().setAddPendingSubmissionAction({ action: 'b' })
    expect(store.getState().pendingSubmissions).toHaveLength(2)
    expect(store.getState().pendingSubmissions[0]?.id).toBe(1)
    expect(store.getState().pendingSubmissions[1]?.id).toBe(2)
  })

  it('removeTagsFromPendingAction filters tags on the matching submission', () => {
    const store = createActionsStore()
    store.getState().setAddPendingSubmissionAction({ action: 'a', tags: ['x', 'y', 'z'] })
    const id = store.getState().pendingSubmissions[0]!.id
    store.getState().removeTagsFromPendingAction({ submissionId: id, tags: ['y'] })
    expect(store.getState().pendingSubmissions[0]?.tags).toEqual(['x', 'z'])
  })

  it('removePendingSubmissionAction removes by id', () => {
    const store = createActionsStore()
    store.getState().setAddPendingSubmissionAction({ action: 'a' })
    store.getState().setAddPendingSubmissionAction({ action: 'b' })
    const second = store.getState().pendingSubmissions[1]!.id
    store.getState().removePendingSubmissionAction({ id: second })
    expect(store.getState().pendingSubmissions).toHaveLength(1)
    expect(store.getState().pendingSubmissions[0]?.action).toBe('a')
  })

  it('updatePendingSubmissionAction merges fields', () => {
    const store = createActionsStore()
    store.getState().setAddPendingSubmissionAction({ action: 'a' })
    const id = store.getState().pendingSubmissions[0]!.id
    store.getState().updatePendingSubmissionAction({ id, action: 'b', tags: ['t1'] })
    expect(store.getState().pendingSubmissions[0]?.action).toBe('b')
    expect(store.getState().pendingSubmissions[0]?.tags).toEqual(['t1'])
  })

  it('clearAllPendingSubmissions empties the list', () => {
    const store = createActionsStore()
    store.getState().setAddPendingSubmissionAction({ action: 'a' })
    store.getState().clearAllPendingSubmissions()
    expect(store.getState().pendingSubmissions).toEqual([])
  })

  it('getExistedIndex returns -1 for unknown ids', () => {
    const store = createActionsStore()
    expect(getExistedIndex(store.getState(), 999)).toBe(-1)
  })

  it('does not reuse an id after a mid-list removal (no collision with live ids)', () => {
    const store = createActionsStore()
    store.getState().setAddPendingSubmissionAction({ action: 'a' })
    store.getState().setAddPendingSubmissionAction({ action: 'b' })
    store.getState().setAddPendingSubmissionAction({ action: 'c' })
    expect(store.getState().pendingSubmissions.map((s) => s.id)).toEqual([1, 2, 3])

    // Remove the middle entry, then add a new one. `length + 1` would yield 3
    // here and collide with the still-present id 3 — `max(id) + 1` must not.
    store.getState().removePendingSubmissionAction({ id: 2 })
    store.getState().setAddPendingSubmissionAction({ action: 'd' })

    const ids = store.getState().pendingSubmissions.map((submission) => submission.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toEqual([1, 3, 4])
  })

  it('nextSubmissionId returns max(id)+1 and 1 for an empty queue', () => {
    expect(nextSubmissionId([])).toBe(1)
    expect(nextSubmissionId([{ id: 1 }, { id: 7 }, { id: 3 }])).toBe(8)
  })
})
