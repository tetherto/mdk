import { describe, expect, it } from 'vitest'
import type { AuthState, RootState } from '@/types/redux'
import type { AuthConfig } from '@/utils/auth-utils'
import { authSlice, selectPermissions, selectToken } from '../auth-slice'

describe('authSlice', () => {
  describe('initial state', () => {
    it('should return the initial state', () => {
      const state = authSlice.reducer(undefined, { type: 'unknown' })

      expect(state).toEqual({
        token: null,
        permissions: null,
      })
    })

    it('should have correct slice name', () => {
      expect(authSlice.name).toBe('auth')
    })
  })

  describe('setToken reducer', () => {
    it('should set token with a valid string', () => {
      const initialState: AuthState = {
        token: null,
        permissions: null,
      }

      const token = 'valid-auth-token-123'
      const state = authSlice.reducer(initialState, authSlice.actions.setToken(token))

      expect(state.token).toBe(token)
      expect(state.permissions).toBeNull()
    })

    it('should update existing token with new token', () => {
      const initialState: AuthState = {
        token: 'old-token',
        permissions: null,
      }

      const newToken = 'new-token'
      const state = authSlice.reducer(initialState, authSlice.actions.setToken(newToken))

      expect(state.token).toBe(newToken)
    })

    it('should set token to null', () => {
      const initialState: AuthState = {
        token: 'existing-token',
        permissions: null,
      }

      const state = authSlice.reducer(initialState, authSlice.actions.setToken(null))

      expect(state.token).toBeNull()
    })

    it('should handle empty string token', () => {
      const initialState: AuthState = {
        token: null,
        permissions: null,
      }

      const state = authSlice.reducer(initialState, authSlice.actions.setToken(''))

      expect(state.token).toBe('')
    })

    it('should handle very long token string', () => {
      const initialState: AuthState = {
        token: null,
        permissions: null,
      }

      const longToken = 'a'.repeat(1000)
      const state = authSlice.reducer(initialState, authSlice.actions.setToken(longToken))

      expect(state.token).toBe(longToken)
    })

    it('should not mutate permissions when setting token', () => {
      const permissions = { permissions: ['users:read'] }
      const initialState: AuthState = {
        token: null,
        permissions,
      }

      const state = authSlice.reducer(initialState, authSlice.actions.setToken('new-token'))

      expect(state.permissions).toBe(permissions)
    })
  })

  describe('setPermissions reducer', () => {
    it('should set permissions with valid config', () => {
      const initialState: AuthState = {
        token: null,
        permissions: null,
      }

      const permissions: AuthConfig = {
        permissions: ['users:read', 'posts:write'],
        write: true,
        caps: ['admin'],
      }

      const state = authSlice.reducer(initialState, authSlice.actions.setPermissions(permissions))

      expect(state.permissions).toEqual(permissions)
      expect(state.token).toBeNull()
    })

    it('should update existing permissions with new permissions', () => {
      const oldPermissions = { permissions: ['users:read'] }
      const initialState: AuthState = {
        token: 'token',
        permissions: oldPermissions,
      }

      const newPermissions: AuthConfig = {
        permissions: ['users:write', 'posts:delete'],
        write: false,
        caps: ['moderator'],
      }

      const state = authSlice.reducer(
        initialState,
        authSlice.actions.setPermissions(newPermissions),
      )

      expect(state.permissions).toEqual(newPermissions)
      expect(state.permissions).not.toBe(oldPermissions)
    })

    it('should set permissions to null', () => {
      const initialState: AuthState = {
        token: 'token',
        permissions: { permissions: ['users:read'] },
      }

      const state = authSlice.reducer(initialState, authSlice.actions.setPermissions(null))

      expect(state.permissions).toBeNull()
    })

    it('should handle empty permissions object', () => {
      const initialState: AuthState = {
        token: null,
        permissions: null,
      }

      const state = authSlice.reducer(initialState, authSlice.actions.setPermissions({}))

      expect(state.permissions).toEqual({})
    })

    it('should handle permissions with only permissions array', () => {
      const initialState: AuthState = {
        token: null,
        permissions: null,
      }

      const permissions = { permissions: ['users:read', 'posts:write'] }
      const state = authSlice.reducer(initialState, authSlice.actions.setPermissions(permissions))

      expect(state.permissions).toEqual(permissions)
    })

    it('should handle permissions with only write property', () => {
      const initialState: AuthState = {
        token: null,
        permissions: null,
      }

      const permissions = { write: true }
      const state = authSlice.reducer(initialState, authSlice.actions.setPermissions(permissions))

      expect(state.permissions).toEqual(permissions)
    })

    it('should handle permissions with only caps', () => {
      const initialState: AuthState = {
        token: null,
        permissions: null,
      }

      const permissions = { caps: ['admin', 'moderator'] }
      const state = authSlice.reducer(initialState, authSlice.actions.setPermissions(permissions))

      expect(state.permissions).toEqual(permissions)
    })

    it('should handle superAdmin permissions', () => {
      const initialState: AuthState = {
        token: null,
        permissions: null,
      }

      const permissions = { superAdmin: true }
      const state = authSlice.reducer(initialState, authSlice.actions.setPermissions(permissions))

      expect(state.permissions).toEqual(permissions)
    })

    it('should handle complex permissions object', () => {
      const initialState: AuthState = {
        token: null,
        permissions: null,
      }

      const permissions: AuthConfig = {
        permissions: ['users:rw', 'posts:r', 'comments:w'],
        write: true,
        caps: ['admin', 'moderator', 'viewer'],
        superAdmin: false,
      }

      const state = authSlice.reducer(initialState, authSlice.actions.setPermissions(permissions))

      expect(state.permissions).toEqual(permissions)
    })

    it('should not mutate token when setting permissions', () => {
      const token = 'existing-token'
      const initialState: AuthState = {
        token,
        permissions: null,
      }

      const state = authSlice.reducer(
        initialState,
        authSlice.actions.setPermissions({ permissions: ['users:read'] }),
      )

      expect(state.token).toBe(token)
    })

    it('should handle arbitrary unknown data types', () => {
      const initialState: AuthState = {
        token: null,
        permissions: null,
      }

      const arbitraryData = {
        customField: 'value',
        nested: { data: 123 },
        array: [1, 2, 3],
      }

      const state = authSlice.reducer(initialState, authSlice.actions.setPermissions(arbitraryData))

      expect(state.permissions).toEqual(arbitraryData)
    })
  })

  describe('multiple actions in sequence', () => {
    it('should handle setting token then permissions', () => {
      let state = authSlice.reducer(undefined, { type: 'unknown' })

      state = authSlice.reducer(state, authSlice.actions.setToken('my-token'))
      expect(state.token).toBe('my-token')
      expect(state.permissions).toBeNull()

      state = authSlice.reducer(
        state,
        authSlice.actions.setPermissions({ permissions: ['users:read'] }),
      )
      expect(state.token).toBe('my-token')
      expect(state.permissions).toEqual({ permissions: ['users:read'] })
    })

    it('should handle setting permissions then token', () => {
      let state = authSlice.reducer(undefined, { type: 'unknown' })

      state = authSlice.reducer(
        state,
        authSlice.actions.setPermissions({ permissions: ['users:write'] }),
      )
      expect(state.token).toBeNull()
      expect(state.permissions).toEqual({ permissions: ['users:write'] })

      state = authSlice.reducer(state, authSlice.actions.setToken('new-token'))
      expect(state.token).toBe('new-token')
      expect(state.permissions).toEqual({ permissions: ['users:write'] })
    })

    it('should handle clearing both token and permissions', () => {
      let state: AuthState = {
        token: 'token',
        permissions: { permissions: ['users:read'] },
      }

      state = authSlice.reducer(state, authSlice.actions.setToken(null))
      state = authSlice.reducer(state, authSlice.actions.setPermissions(null))

      expect(state.token).toBeNull()
      expect(state.permissions).toBeNull()
    })

    it('should handle multiple token updates', () => {
      let state = authSlice.reducer(undefined, { type: 'unknown' })

      state = authSlice.reducer(state, authSlice.actions.setToken('token1'))
      expect(state.token).toBe('token1')

      state = authSlice.reducer(state, authSlice.actions.setToken('token2'))
      expect(state.token).toBe('token2')

      state = authSlice.reducer(state, authSlice.actions.setToken('token3'))
      expect(state.token).toBe('token3')
    })

    it('should handle multiple permissions updates', () => {
      let state = authSlice.reducer(undefined, { type: 'unknown' })

      const perm1 = { permissions: ['users:read'] }
      state = authSlice.reducer(state, authSlice.actions.setPermissions(perm1))
      expect(state.permissions).toEqual(perm1)

      const perm2 = { permissions: ['users:write'] }
      state = authSlice.reducer(state, authSlice.actions.setPermissions(perm2))
      expect(state.permissions).toEqual(perm2)

      const perm3 = { permissions: ['admin:all'] }
      state = authSlice.reducer(state, authSlice.actions.setPermissions(perm3))
      expect(state.permissions).toEqual(perm3)
    })
  })

  describe('selectToken selector', () => {
    it('should select token from state', () => {
      const state: RootState = {
        auth: {
          token: 'my-token',
          permissions: null,
        },
      } as RootState

      const token = selectToken(state)

      expect(token).toBe('my-token')
    })

    it('should return null when no token', () => {
      const state: RootState = {
        auth: {
          token: null,
          permissions: null,
        },
      } as RootState

      const token = selectToken(state)

      expect(token).toBeNull()
    })

    it('should return empty string token', () => {
      const state: RootState = {
        auth: {
          token: '',
          permissions: null,
        },
      } as RootState

      const token = selectToken(state)

      expect(token).toBe('')
    })

    it('should select token regardless of permissions state', () => {
      const state: RootState = {
        auth: {
          token: 'token',
          permissions: { permissions: ['users:read'] },
        },
      } as RootState

      const token = selectToken(state)

      expect(token).toBe('token')
    })
  })

  describe('selectPermissions selector', () => {
    it('should select permissions from state', () => {
      const permissions: AuthConfig = {
        permissions: ['users:read', 'posts:write'],
        write: true,
        caps: ['admin'],
      }

      const state: RootState = {
        auth: {
          token: null,
          permissions,
        },
      } as RootState

      const result = selectPermissions(state)

      expect(result).toEqual(permissions)
    })

    it('should return null when no permissions', () => {
      const state: RootState = {
        auth: {
          token: null,
          permissions: null,
        },
      } as RootState

      const result = selectPermissions(state)

      expect(result).toBeNull()
    })

    it('should select permissions regardless of token state', () => {
      const permissions = { permissions: ['users:write'] }
      const state: RootState = {
        auth: {
          token: 'token',
          permissions,
        },
      } as RootState

      const result = selectPermissions(state)

      expect(result).toEqual(permissions)
    })

    it('should return empty object permissions', () => {
      const state: RootState = {
        auth: {
          token: null,
          permissions: {},
        },
      } as RootState

      const result = selectPermissions(state)

      expect(result).toEqual({})
    })

    it('should select complex permissions object', () => {
      const permissions: AuthConfig = {
        permissions: ['users:rw', 'posts:r'],
        write: false,
        caps: ['moderator', 'viewer'],
        superAdmin: true,
      }

      const state: RootState = {
        auth: {
          token: null,
          permissions,
        },
      } as RootState

      const result = selectPermissions(state)

      expect(result).toEqual(permissions)
    })

    it('should handle arbitrary unknown permissions data', () => {
      const arbitraryData = {
        customField: 'value',
        nested: { data: [1, 2, 3] },
      }

      const state: RootState = {
        auth: {
          token: null,
          permissions: arbitraryData,
        },
      } as RootState

      const result = selectPermissions(state)

      expect(result).toEqual(arbitraryData)
    })
  })

  describe('state immutability', () => {
    it('should not mutate original state when setting token', () => {
      const initialState: AuthState = {
        token: 'old-token',
        permissions: null,
      }

      const stateCopy = { ...initialState }

      authSlice.reducer(initialState, authSlice.actions.setToken('new-token'))

      expect(initialState).toEqual(stateCopy)
    })

    it('should not mutate original state when setting permissions', () => {
      const initialState: AuthState = {
        token: null,
        permissions: { permissions: ['old'] },
      }

      const stateCopy = { ...initialState }

      authSlice.reducer(initialState, authSlice.actions.setPermissions({ permissions: ['new'] }))

      expect(initialState).toEqual(stateCopy)
    })
  })

  describe('action creators', () => {
    it('should create setToken action with correct payload', () => {
      const token = 'test-token'
      const action = authSlice.actions.setToken(token)

      expect(action).toEqual({
        type: 'auth/setToken',
        payload: token,
      })
    })

    it('should create setToken action with null payload', () => {
      const action = authSlice.actions.setToken(null)

      expect(action).toEqual({
        type: 'auth/setToken',
        payload: null,
      })
    })

    it('should create setPermissions action with correct payload', () => {
      const permissions = { permissions: ['users:read'] }
      const action = authSlice.actions.setPermissions(permissions)

      expect(action).toEqual({
        type: 'auth/setPermissions',
        payload: permissions,
      })
    })

    it('should create setPermissions action with null payload', () => {
      const action = authSlice.actions.setPermissions(null)

      expect(action).toEqual({
        type: 'auth/setPermissions',
        payload: null,
      })
    })
  })
})
