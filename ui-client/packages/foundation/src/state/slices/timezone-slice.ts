import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import type { TimezoneState } from '../../types/redux'

const initialState: TimezoneState = {
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
}

export const timezoneSlice = createSlice({
  name: 'timezone',
  initialState,
  reducers: {
    setTimezone: (state, { payload }: PayloadAction<string>) => {
      state.timezone = payload
    },
  },
})
