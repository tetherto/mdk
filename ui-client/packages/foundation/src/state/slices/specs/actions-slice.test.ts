import { describe, expect, it } from 'vitest'
import type { ActionsState, PendingSubmissionAction } from '@/types/redux'
import { actionsSlice, getExistedIndex } from '../actions-slice'

const makeSubmission = (
  overrides: Partial<PendingSubmissionAction> = {},
): PendingSubmissionAction => ({
  id: 1,
  action: 'setupPools',
  tags: ['tag-1', 'tag-2'],
  ...overrides,
})

const makeState = (submissions: PendingSubmissionAction[] = []): ActionsState => ({
  pendingSubmissions: submissions,
})

describe('actionsSlice', () => {
  describe('initial state', () => {
    it('should return the initial state', () => {
      const state = actionsSlice.reducer(undefined, { type: 'unknown' })

      expect(state).toEqual({ pendingSubmissions: [] })
    })

    it('should have correct slice name', () => {
      expect(actionsSlice.name).toBe('actions')
    })
  })

  // -------------------------------------------------------------------------

  describe('getExistedIndex', () => {
    it('returns the index of the submission with matching id', () => {
      const state = makeState([makeSubmission({ id: 1 }), makeSubmission({ id: 2 })])

      expect(getExistedIndex(state, 2)).toBe(1)
    })

    it('returns -1 when id is not found', () => {
      const state = makeState([makeSubmission({ id: 1 })])

      expect(getExistedIndex(state, 99)).toBe(-1)
    })

    it('returns -1 for empty pendingSubmissions', () => {
      expect(getExistedIndex(makeState(), 1)).toBe(-1)
    })
  })

  describe('setPendingSubmissionActions reducer', () => {
    it('replaces pendingSubmissions with the provided array', () => {
      const initialState = makeState([makeSubmission({ id: 1 })])
      const newSubmissions = [makeSubmission({ id: 10 }), makeSubmission({ id: 11 })]

      const state = actionsSlice.reducer(
        initialState,
        actionsSlice.actions.setPendingSubmissionActions(newSubmissions),
      )

      expect(state.pendingSubmissions).toEqual(newSubmissions)
    })

    it('clears pendingSubmissions when given an empty array', () => {
      const initialState = makeState([makeSubmission()])

      const state = actionsSlice.reducer(
        initialState,
        actionsSlice.actions.setPendingSubmissionActions([]),
      )

      expect(state.pendingSubmissions).toEqual([])
    })
  })

  describe('setAddPendingSubmissionAction reducer', () => {
    it('appends a new submission with auto-incremented id', () => {
      const initialState = makeState([makeSubmission({ id: 1 })])

      const state = actionsSlice.reducer(
        initialState,
        actionsSlice.actions.setAddPendingSubmissionAction({
          action: 'reboot',
          tags: ['tag-3'],
        }),
      )

      expect(state.pendingSubmissions).toHaveLength(2)
      expect(state.pendingSubmissions[1].id).toBe(2)
      expect(state.pendingSubmissions[1].action).toBe('reboot')
    })

    it('assigns id = 1 when list is empty', () => {
      const state = actionsSlice.reducer(
        makeState(),
        actionsSlice.actions.setAddPendingSubmissionAction({
          action: 'setupPools',
          tags: [],
        }),
      )

      expect(state.pendingSubmissions[0].id).toBe(1)
    })

    it('preserves existing submissions when adding a new one', () => {
      const existing = makeSubmission({ id: 1, action: 'reboot' })
      const initialState = makeState([existing])

      const state = actionsSlice.reducer(
        initialState,
        actionsSlice.actions.setAddPendingSubmissionAction({
          action: 'setupPools',
          tags: [],
        }),
      )

      expect(state.pendingSubmissions[0]).toMatchObject(existing)
    })
  })

  describe('removeTagsFromPendingAction reducer', () => {
    it('removes specified tags from the matching submission', () => {
      const initialState = makeState([makeSubmission({ id: 1, tags: ['a', 'b', 'c'] })])

      const state = actionsSlice.reducer(
        initialState,
        actionsSlice.actions.removeTagsFromPendingAction({ submissionId: 1, tags: ['a', 'c'] }),
      )

      expect(state.pendingSubmissions[0].tags).toEqual(['b'])
    })

    it('leaves tags untouched when none match', () => {
      const initialState = makeState([makeSubmission({ id: 1, tags: ['a', 'b'] })])

      const state = actionsSlice.reducer(
        initialState,
        actionsSlice.actions.removeTagsFromPendingAction({ submissionId: 1, tags: ['x', 'y'] }),
      )

      expect(state.pendingSubmissions[0].tags).toEqual(['a', 'b'])
    })

    it('results in empty tags when all are removed', () => {
      const initialState = makeState([makeSubmission({ id: 1, tags: ['a', 'b'] })])

      const state = actionsSlice.reducer(
        initialState,
        actionsSlice.actions.removeTagsFromPendingAction({ submissionId: 1, tags: ['a', 'b'] }),
      )

      expect(state.pendingSubmissions[0].tags).toEqual([])
    })

    it('does nothing when submissionId is not found', () => {
      const initialState = makeState([makeSubmission({ id: 1, tags: ['a'] })])

      const state = actionsSlice.reducer(
        initialState,
        actionsSlice.actions.removeTagsFromPendingAction({ submissionId: 99, tags: ['a'] }),
      )

      expect(state.pendingSubmissions[0].tags).toEqual(['a'])
    })

    it('does nothing when submission has no tags', () => {
      const initialState = makeState([makeSubmission({ id: 1, tags: undefined })])

      const state = actionsSlice.reducer(
        initialState,
        actionsSlice.actions.removeTagsFromPendingAction({ submissionId: 1, tags: ['a'] }),
      )

      expect(state.pendingSubmissions[0].tags).toBeUndefined()
    })
  })

  describe('removePendingSubmissionAction reducer', () => {
    it('removes submission with matching id', () => {
      const initialState = makeState([makeSubmission({ id: 1 }), makeSubmission({ id: 2 })])

      const state = actionsSlice.reducer(
        initialState,
        actionsSlice.actions.removePendingSubmissionAction({ id: 1 }),
      )

      expect(state.pendingSubmissions).toHaveLength(1)
      expect(state.pendingSubmissions[0].id).toBe(2)
    })

    it('does nothing when id is not found', () => {
      const initialState = makeState([makeSubmission({ id: 1 })])

      const state = actionsSlice.reducer(
        initialState,
        actionsSlice.actions.removePendingSubmissionAction({ id: 99 }),
      )

      expect(state.pendingSubmissions).toHaveLength(1)
    })

    it('results in empty array when last submission is removed', () => {
      const initialState = makeState([makeSubmission({ id: 1 })])

      const state = actionsSlice.reducer(
        initialState,
        actionsSlice.actions.removePendingSubmissionAction({ id: 1 }),
      )

      expect(state.pendingSubmissions).toEqual([])
    })
  })

  describe('updatePendingSubmissionAction reducer', () => {
    it('merges payload into the matching submission', () => {
      const initialState = makeState([makeSubmission({ id: 1, action: 'reboot', tags: ['a'] })])

      const state = actionsSlice.reducer(
        initialState,
        actionsSlice.actions.updatePendingSubmissionAction({ id: 1, action: 'setupPools' }),
      )

      expect(state.pendingSubmissions[0].action).toBe('setupPools')
      expect(state.pendingSubmissions[0].tags).toEqual(['a'])
    })

    it('does nothing when id is not found', () => {
      const initialState = makeState([makeSubmission({ id: 1, action: 'reboot' })])

      const state = actionsSlice.reducer(
        initialState,
        actionsSlice.actions.updatePendingSubmissionAction({ id: 99, action: 'setupPools' }),
      )

      expect(state.pendingSubmissions[0].action).toBe('reboot')
    })

    it('updates tags on matching submission', () => {
      const initialState = makeState([makeSubmission({ id: 1, tags: ['old'] })])

      const state = actionsSlice.reducer(
        initialState,
        actionsSlice.actions.updatePendingSubmissionAction({ id: 1, tags: ['new-1', 'new-2'] }),
      )

      expect(state.pendingSubmissions[0].tags).toEqual(['new-1', 'new-2'])
    })

    it('preserves other submissions when updating one', () => {
      const initialState = makeState([
        makeSubmission({ id: 1, action: 'reboot' }),
        makeSubmission({ id: 2, action: 'setupPools' }),
      ])

      const state = actionsSlice.reducer(
        initialState,
        actionsSlice.actions.updatePendingSubmissionAction({ id: 1, action: 'updated' }),
      )

      expect(state.pendingSubmissions[1].action).toBe('setupPools')
    })
  })

  describe('clearAllPendingSubmissions reducer', () => {
    it('clears all pending submissions', () => {
      const initialState = makeState([makeSubmission({ id: 1 }), makeSubmission({ id: 2 })])

      const state = actionsSlice.reducer(
        initialState,
        actionsSlice.actions.clearAllPendingSubmissions(),
      )

      expect(state.pendingSubmissions).toEqual([])
    })

    it('is a no-op when submissions are already empty', () => {
      const state = actionsSlice.reducer(
        makeState(),
        actionsSlice.actions.clearAllPendingSubmissions(),
      )

      expect(state.pendingSubmissions).toEqual([])
    })
  })

  describe('multiple actions in sequence', () => {
    it('add then remove results in empty list', () => {
      let state = actionsSlice.reducer(undefined, { type: 'unknown' })

      state = actionsSlice.reducer(
        state,
        actionsSlice.actions.setAddPendingSubmissionAction({ action: 'reboot', tags: [] }),
      )
      expect(state.pendingSubmissions).toHaveLength(1)

      state = actionsSlice.reducer(
        state,
        actionsSlice.actions.removePendingSubmissionAction({ id: 1 }),
      )
      expect(state.pendingSubmissions).toEqual([])
    })

    it('add then update then clear', () => {
      let state = actionsSlice.reducer(undefined, { type: 'unknown' })

      state = actionsSlice.reducer(
        state,
        actionsSlice.actions.setAddPendingSubmissionAction({ action: 'reboot', tags: ['t1'] }),
      )
      state = actionsSlice.reducer(
        state,
        actionsSlice.actions.updatePendingSubmissionAction({ id: 1, tags: ['t1', 't2'] }),
      )
      expect(state.pendingSubmissions[0].tags).toEqual(['t1', 't2'])

      state = actionsSlice.reducer(state, actionsSlice.actions.clearAllPendingSubmissions())
      expect(state.pendingSubmissions).toEqual([])
    })

    it('set replaces whatever was previously added', () => {
      let state = actionsSlice.reducer(undefined, { type: 'unknown' })

      state = actionsSlice.reducer(
        state,
        actionsSlice.actions.setAddPendingSubmissionAction({ action: 'reboot', tags: [] }),
      )
      const replacement = [makeSubmission({ id: 99, action: 'replaced' })]
      state = actionsSlice.reducer(
        state,
        actionsSlice.actions.setPendingSubmissionActions(replacement),
      )

      expect(state.pendingSubmissions).toEqual(replacement)
    })
  })

  describe('action creators', () => {
    it('creates setPendingSubmissionActions with correct type', () => {
      const action = actionsSlice.actions.setPendingSubmissionActions([])
      expect(action.type).toBe('actions/setPendingSubmissionActions')
    })

    it('creates setAddPendingSubmissionAction with correct type', () => {
      const action = actionsSlice.actions.setAddPendingSubmissionAction({
        action: 'reboot',
        tags: [],
      })
      expect(action.type).toBe('actions/setAddPendingSubmissionAction')
    })

    it('creates removeTagsFromPendingAction with correct type and payload', () => {
      const action = actionsSlice.actions.removeTagsFromPendingAction({
        submissionId: 1,
        tags: ['a'],
      })
      expect(action.type).toBe('actions/removeTagsFromPendingAction')
      expect(action.payload).toEqual({ submissionId: 1, tags: ['a'] })
    })

    it('creates removePendingSubmissionAction with correct type and payload', () => {
      const action = actionsSlice.actions.removePendingSubmissionAction({ id: 5 })
      expect(action.type).toBe('actions/removePendingSubmissionAction')
      expect(action.payload).toEqual({ id: 5 })
    })

    it('creates updatePendingSubmissionAction with correct type', () => {
      const action = actionsSlice.actions.updatePendingSubmissionAction({ id: 1, tags: ['x'] })
      expect(action.type).toBe('actions/updatePendingSubmissionAction')
    })

    it('creates clearAllPendingSubmissions with correct type', () => {
      const action = actionsSlice.actions.clearAllPendingSubmissions()
      expect(action.type).toBe('actions/clearAllPendingSubmissions')
    })
  })
})
