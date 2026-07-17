import type { StateCreator } from 'zustand/vanilla'
import type { DevicesStore } from './types'

/** Free-text/tag filters applied to device list views. */
export type FiltersSlice = Pick<DevicesStore, 'filterTags' | 'setFilterTags' | 'removeFilterTag'>

export const createFiltersSlice: StateCreator<DevicesStore, [], [], FiltersSlice> = (set) => ({
  filterTags: [],

  setFilterTags: (tags) => set({ filterTags: tags.map((t) => t.trim()) }),

  removeFilterTag: (tag) =>
    set((s) => ({
      filterTags: s.filterTags.filter((t) => t.toLocaleLowerCase() !== tag?.toLocaleLowerCase()),
    })),
})
