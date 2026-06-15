import { describe, expect, it } from 'vitest'
import { createAuthStore, selectPermissions, selectToken } from './auth-store'

describe('authStore', () => {
  it('starts with null token and permissions', () => {
    const store = createAuthStore()
    expect(store.getState().token).toBeNull()
    expect(store.getState().permissions).toBeNull()
  })

  it('setToken updates the token', () => {
    const store = createAuthStore()
    store.getState().setToken('abc')
    expect(store.getState().token).toBe('abc')
    expect(selectToken(store.getState())).toBe('abc')
  })

  it('setPermissions updates permissions', () => {
    const store = createAuthStore()
    const perms = { roles: ['admin'] }
    store.getState().setPermissions(perms)
    expect(selectPermissions(store.getState())).toEqual(perms)
  })

  it('reset clears state', () => {
    const store = createAuthStore()
    store.getState().setToken('abc')
    store.getState().setPermissions({ x: 1 })
    store.getState().reset()
    expect(store.getState().token).toBeNull()
    expect(store.getState().permissions).toBeNull()
  })
})
