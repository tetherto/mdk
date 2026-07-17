import type { StateCreator } from 'zustand/vanilla'
import type { DevicesStore } from './types'

/** Cross-slice reset. `filterTags` is intentionally preserved. */
export type LifecycleSlice = Pick<DevicesStore, 'setResetSelections'>

export const createLifecycleSlice: StateCreator<DevicesStore, [], [], LifecycleSlice> = (set) => ({
  setResetSelections: () =>
    set({
      selectedDevices: [],
      selectedSockets: {},
      selectedDevicesTags: {},
      selectedContainers: {},
      selectedLvCabinets: {},
    }),
})
