import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import type { AuthState, RootState } from '../../types/redux'

const initialState: AuthState = {
  token: null,
  permissions: null,
}

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setToken: (state, { payload }: PayloadAction<string | null>) => {
      state.token = payload
    },
    setPermissions: (state, { payload }: PayloadAction<unknown | null>) => {
      state.permissions = payload
    },
  },
})

const selectAuth = (state: RootState): AuthState => state.auth

export const selectToken = (state: RootState): string | null => selectAuth(state).token
export const selectPermissions = (state: RootState): unknown | null => selectAuth(state).permissions
