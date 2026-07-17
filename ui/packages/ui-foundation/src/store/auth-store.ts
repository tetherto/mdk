import { createStore, type StateCreator } from 'zustand/vanilla'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'

export type AuthState = {
  token: string | null
  permissions: unknown | null
}

export type AuthActions = {
  setToken: (token: string | null) => void
  setPermissions: (permissions: unknown | null) => void
  reset: () => void
}

export type AuthStore = AuthState & AuthActions

const initialState: AuthState = {
  token: null,
  permissions: null,
}

const STORAGE_KEY = 'mdk:auth'

/* In-memory fallback used when `window.localStorage` isn't available
 * (SSR, tests, sandboxes without DOM). Keeps the persist middleware
 * happy without throwing on import. */
const memoryStorage: StateStorage = (() => {
  const map = new Map<string, string>()
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value)
    },
    removeItem: (key) => {
      map.delete(key)
    },
  }
})()

const resolveStorage = (): StateStorage =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
    ? window.localStorage
    : memoryStorage

const authStoreSpec: StateCreator<AuthStore> = (set) => ({
  ...initialState,
  setToken: (token) => set({ token }),
  setPermissions: (permissions) => set({ permissions }),
  reset: () => set({ ...initialState }),
})

/**
 * Factory for an isolated `authStore` instance — useful in tests, in SSR,
 * or anywhere a fresh state is required. The factory's store is **not**
 * persisted to localStorage, so tests stay hermetic. Production code
 * should prefer the singleton {@link authStore}, which rehydrates the
 * session token across reloads.
 *
 * @category auth
 */
export const createAuthStore = () => createStore<AuthStore>(authStoreSpec)

/**
 * Module-level singleton store holding the current session token and
 * resolved permissions config. React adapters bind to this through
 * `useAuth()`; non-React callers can `authStore.getState()` directly.
 *
 * The `token` field is persisted to `localStorage` under `mdk:auth` so a
 * page reload keeps the user signed in until the token expires (handled
 * by `useTokenPolling`, which calls `reset()` on a 401/500) or the user
 * signs out (which also calls `reset()`, clearing the persisted entry).
 *
 * @category auth
 */
export const authStore = createStore<AuthStore>()(
  persist(authStoreSpec, {
    name: STORAGE_KEY,
    storage: createJSONStorage(resolveStorage),
    partialize: (state) => ({ token: state.token }),
  }),
)

/* Selectors — pure functions consumed by adapter hooks. */
export const selectToken = (state: AuthState): string | null => state.token
export const selectPermissions = (state: AuthState): unknown | null => state.permissions
