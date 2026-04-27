import { configureStore } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'

import { actionsSlice } from './slices/actions-slice'
import { authSlice } from './slices/auth-slice'
import { devicesSlice } from './slices/devices-slice'
import { notificationSlice } from './slices/notification-slice'
import { timezoneSlice } from './slices/timezone-slice'

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    actions: actionsSlice.reducer,
    devices: devicesSlice.reducer,
    timezone: timezoneSlice.reducer,
    notifications: notificationSlice.reducer,
  },
  devTools: true,
})

setupListeners(store.dispatch)
