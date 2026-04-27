import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import type { ActionsState, PendingSubmissionAction } from '../../types/redux'

const initialState: ActionsState = {
  pendingSubmissions: [],
}

export const getExistedIndex = (state: ActionsState, payloadId: number): number =>
  state?.pendingSubmissions.findIndex(({ id }) => id === payloadId) ?? -1

export const actionsSlice = createSlice({
  name: 'actions',
  initialState,
  reducers: {
    setPendingSubmissionActions: (state, { payload }: PayloadAction<PendingSubmissionAction[]>) => {
      state.pendingSubmissions = payload
    },

    setAddPendingSubmissionAction: (
      state,
      { payload }: PayloadAction<Omit<PendingSubmissionAction, 'id'>>,
    ) => {
      state.pendingSubmissions.push({
        ...payload,
        id: state.pendingSubmissions.length + 1,
      })
    },

    removeTagsFromPendingAction: (
      state,
      { payload }: PayloadAction<{ submissionId: number; tags: string[] }>,
    ) => {
      const { submissionId, tags } = payload

      const pendingSubmission = state.pendingSubmissions.find(
        ({ id }: PendingSubmissionAction) => id === submissionId,
      )

      if (pendingSubmission?.tags) {
        pendingSubmission.tags = pendingSubmission.tags.filter((tag) => !tags.includes(tag))
      }
    },

    removePendingSubmissionAction: (state, { payload }: PayloadAction<{ id: number }>) => {
      const index = getExistedIndex(state, payload.id)
      if (index !== -1) {
        state.pendingSubmissions.splice(index, 1)
      }
    },

    updatePendingSubmissionAction: (
      state,
      { payload }: PayloadAction<Partial<PendingSubmissionAction> & { id: number }>,
    ) => {
      const index = getExistedIndex(state, payload.id)
      if (index !== -1) {
        state.pendingSubmissions[index] = { ...state.pendingSubmissions[index], ...payload }
      }
    },

    clearAllPendingSubmissions: (state) => {
      state.pendingSubmissions = []
    },
  },
  selectors: {
    selectPendingSubmissions: ({ pendingSubmissions }): PendingSubmissionAction[] =>
      pendingSubmissions,
  },
})
