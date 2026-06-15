import { describe, expect, it } from 'vitest'
import { createActionsStore, getExistedIndex } from './actions-store'

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
})
