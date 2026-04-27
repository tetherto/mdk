import { createSlice } from '@reduxjs/toolkit'
import type { NotificationState } from '../../types/redux'

const initialState: NotificationState = {
  count: 0,
}

export const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    increment: (state) => {
      state.count += 1
    },
    decrement: (state) => {
      state.count = Math.max(0, state.count - 1)
    },
    reset: (state) => {
      state.count = 0
    },
  },
})

export const { increment, decrement, reset } = notificationSlice.actions
