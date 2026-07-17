import { createStore, type StateCreator } from 'zustand/vanilla'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'

export type PendingSubmissionAction = {
  id: number
  action?: string
  tags?: string[]
  [key: string]: unknown
}

export type ActionsState = {
  pendingSubmissions: PendingSubmissionAction[]
  /** Whether the Actions sidebar is open. Shared across the app so both the
   *  header button and in-page components can open / close it. */
  sidebarOpen: boolean
  /** Whether the sidebar is pinned as a persistent inline panel (no overlay). */
  sidebarPinned: boolean
}

export type ActionsActions = {
  setPendingSubmissionActions: (actions: PendingSubmissionAction[]) => void
  setAddPendingSubmissionAction: (action: Omit<PendingSubmissionAction, 'id'>) => void
  removeTagsFromPendingAction: (payload: { submissionId: number; tags: string[] }) => void
  removePendingSubmissionAction: (payload: { id: number }) => void
  updatePendingSubmissionAction: (action: Partial<PendingSubmissionAction> & { id: number }) => void
  clearAllPendingSubmissions: () => void
  setSidebarOpen: (open: boolean) => void
  setSidebarPinned: (pinned: boolean) => void
}

export type ActionsStore = ActionsState & ActionsActions

const initialState: ActionsState = { pendingSubmissions: [], sidebarOpen: false, sidebarPinned: false }

export const getExistedIndex = (state: ActionsState, payloadId: number): number =>
  state.pendingSubmissions.findIndex(({ id }) => id === payloadId)

/**
 * Next monotonic local queue id. Using `max(id) + 1` (rather than
 * `length + 1`) guarantees uniqueness even after items are removed, so ids
 * never collide — which would otherwise break `submitSingle` lookups, React
 * keys, and optimistic-card mapping.
 */
export const nextSubmissionId = (submissions: PendingSubmissionAction[]): number =>
  submissions.reduce((max, { id }) => (id > max ? id : max), 0) + 1

const STORAGE_KEY = 'mdk:actions'

/* In-memory fallback used when `window.localStorage` isn't available
 * (SSR, tests, sandboxes without DOM). */
const memoryStorage: StateStorage = (() => {
  const map = new Map<string, string>()
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => { map.set(key, value) },
    removeItem: (key) => { map.delete(key) },
  }
})()

const resolveStorage = (): StateStorage =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
    ? window.localStorage
    : memoryStorage

const actionsStoreSpec: StateCreator<ActionsStore> = (set) => ({
  ...initialState,

  setPendingSubmissionActions: (pendingSubmissions) => set({ pendingSubmissions }),

  setAddPendingSubmissionAction: (action) =>
    set((state) => ({
      pendingSubmissions: [
        ...state.pendingSubmissions,
        { ...action, id: nextSubmissionId(state.pendingSubmissions) },
      ],
    })),

  removeTagsFromPendingAction: ({ submissionId, tags }) =>
    set((state) => ({
      pendingSubmissions: state.pendingSubmissions.map((submission) => {
        if (submission.id !== submissionId || !submission.tags) return submission
        return { ...submission, tags: submission.tags.filter((tag) => !tags.includes(tag)) }
      }),
    })),

  removePendingSubmissionAction: ({ id }) =>
    set((state) => ({
      pendingSubmissions: state.pendingSubmissions.filter((submission) => submission.id !== id),
    })),

  updatePendingSubmissionAction: (payload) =>
    set((state) => ({
      pendingSubmissions: state.pendingSubmissions.map((submission) =>
        submission.id === payload.id ? { ...submission, ...payload } : submission,
      ),
    })),

  clearAllPendingSubmissions: () => set({ pendingSubmissions: [] }),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  setSidebarPinned: (pinned) => set({ sidebarPinned: pinned }),
})

/**
 * Factory for an isolated `actionsStore` instance. Tests and feature-scoped
 * pipelines should use this; the global queue lives on the singleton
 * {@link actionsStore}.
 *
 * @category actions
 */
export const createActionsStore = () => createStore<ActionsStore>(actionsStoreSpec)

/**
 * Module-level singleton holding the queue of pending submission actions and
 * the sidebar open/pinned state.
 *
 * Persisted to `localStorage` under `mdk:actions` so drafts and sidebar
 * preferences (pinned, open) survive page refreshes — the server-side live
 * actions are always re-fetched from `/auth/actions` on load regardless.
 *
 * @category actions
 */
export const actionsStore = createStore<ActionsStore>()(
  persist(actionsStoreSpec, {
    name: STORAGE_KEY,
    storage: createJSONStorage(resolveStorage),
    partialize: (state) => ({
      pendingSubmissions: state.pendingSubmissions,
      sidebarOpen: state.sidebarOpen,
      sidebarPinned: state.sidebarPinned,
    }),
  }),
)
