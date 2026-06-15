import { createStore } from 'zustand/vanilla'

export type PendingSubmissionAction = {
  id: number
  action?: string
  tags?: string[]
  [key: string]: unknown
}

export type ActionsState = {
  pendingSubmissions: PendingSubmissionAction[]
}

export type ActionsActions = {
  setPendingSubmissionActions: (actions: PendingSubmissionAction[]) => void
  setAddPendingSubmissionAction: (action: Omit<PendingSubmissionAction, 'id'>) => void
  removeTagsFromPendingAction: (payload: { submissionId: number; tags: string[] }) => void
  removePendingSubmissionAction: (payload: { id: number }) => void
  updatePendingSubmissionAction: (action: Partial<PendingSubmissionAction> & { id: number }) => void
  clearAllPendingSubmissions: () => void
}

export type ActionsStore = ActionsState & ActionsActions

const initialState: ActionsState = { pendingSubmissions: [] }

export const getExistedIndex = (state: ActionsState, payloadId: number): number =>
  state.pendingSubmissions.findIndex(({ id }) => id === payloadId)

/**
 * Factory for an isolated `actionsStore` instance. Tests and feature-scoped
 * pipelines should use this; the global queue lives on the singleton
 * {@link actionsStore}.
 *
 * @category actions
 */
export const createActionsStore = () =>
  createStore<ActionsStore>((set) => ({
    ...initialState,

    setPendingSubmissionActions: (pendingSubmissions) => set({ pendingSubmissions }),

    setAddPendingSubmissionAction: (action) =>
      set((s) => ({
        pendingSubmissions: [
          ...s.pendingSubmissions,
          { ...action, id: s.pendingSubmissions.length + 1 },
        ],
      })),

    removeTagsFromPendingAction: ({ submissionId, tags }) =>
      set((s) => ({
        pendingSubmissions: s.pendingSubmissions.map((p) => {
          if (p.id !== submissionId || !p.tags) return p
          return { ...p, tags: p.tags.filter((tag) => !tags.includes(tag)) }
        }),
      })),

    removePendingSubmissionAction: ({ id }) =>
      set((s) => ({ pendingSubmissions: s.pendingSubmissions.filter((p) => p.id !== id) })),

    updatePendingSubmissionAction: (payload) =>
      set((s) => ({
        pendingSubmissions: s.pendingSubmissions.map((p) =>
          p.id === payload.id ? { ...p, ...payload } : p,
        ),
      })),

    clearAllPendingSubmissions: () => set({ pendingSubmissions: [] }),
  }))

/**
 * Module-level singleton holding the queue of pending submission actions
 * (the operator's "review & confirm" buffer). Drives the bulk-actions UI,
 * tag manipulation and the confirmation modal.
 *
 * @category actions
 */
export const actionsStore = createActionsStore()
