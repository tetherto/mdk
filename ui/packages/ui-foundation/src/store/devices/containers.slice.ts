import type { StateCreator } from 'zustand/vanilla'
import type { DevicesStore } from './types'

/** Selected containers and LV cabinets (keyed by device id). */
export type ContainersSlice = Pick<
  DevicesStore,
  | 'selectedContainers'
  | 'selectedLvCabinets'
  | 'selectContainer'
  | 'selectLVCabinet'
  | 'removeSelectedContainer'
  | 'removeSelectedLVCabinet'
  | 'selectMultipleContainers'
  | 'removeMultipleContainers'
  | 'setSelectedLvCabinets'
>

export const createContainersSlice: StateCreator<DevicesStore, [], [], ContainersSlice> = (
  set,
) => ({
  selectedContainers: {},
  selectedLvCabinets: {},

  selectContainer: (device) =>
    set((s) => ({ selectedContainers: { ...s.selectedContainers, [device.id]: device } })),

  selectLVCabinet: (device) =>
    set((s) => ({ selectedLvCabinets: { ...s.selectedLvCabinets, [device.id]: device } })),

  removeSelectedContainer: (device) =>
    set((s) => {
      const next = { ...s.selectedContainers }
      delete next[device.id]
      return { selectedContainers: next }
    }),

  removeSelectedLVCabinet: (device) =>
    set((s) => {
      const next = { ...s.selectedLvCabinets }
      delete next[device.id]
      return { selectedLvCabinets: next }
    }),

  selectMultipleContainers: (devices) =>
    set((s) => {
      const next = { ...s.selectedContainers }
      for (const d of devices) next[d.id] = { ...d }
      return { selectedContainers: next }
    }),

  removeMultipleContainers: (devices) =>
    set((s) => {
      const next = { ...s.selectedContainers }
      for (const d of devices) delete next[d.id]
      return { selectedContainers: next }
    }),

  setSelectedLvCabinets: (devices) => set({ selectedLvCabinets: devices }),
})
