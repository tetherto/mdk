import type { StateCreator } from 'zustand/vanilla'
import type { DevicesStore } from './types'

/** Devices selected for bulk actions (the explorer's checkbox selection). */
export type SelectionSlice = Pick<
  DevicesStore,
  | 'selectedDevices'
  | 'setSelectedDevices'
  | 'setMultipleSelectedDevices'
  | 'removeMultipleSelectedDevices'
  | 'setSelectDevice'
  | 'removeSelectedDevice'
>

export const createSelectionSlice: StateCreator<DevicesStore, [], [], SelectionSlice> = (set) => ({
  selectedDevices: [],

  setSelectedDevices: (devices) => set({ selectedDevices: devices }),

  setMultipleSelectedDevices: (devices) =>
    set((s) => {
      const ids = new Set(s.selectedDevices.map((d) => d.id))
      const out = [...s.selectedDevices]
      for (const d of devices) {
        if (!ids.has(d.id)) {
          out.push(d)
          ids.add(d.id)
        }
      }
      return { selectedDevices: out }
    }),

  removeMultipleSelectedDevices: (ids) =>
    set((s) => ({ selectedDevices: s.selectedDevices.filter((d) => !ids.includes(d.id)) })),

  setSelectDevice: (device) => set((s) => ({ selectedDevices: [...s.selectedDevices, device] })),

  removeSelectedDevice: (id) =>
    set((s) => ({ selectedDevices: s.selectedDevices.filter((d) => d.id !== id) })),
})
