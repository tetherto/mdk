import type { StateCreator } from 'zustand/vanilla'
import { type DevicesStore, getTags, NO_CONTAINER_KEY } from './types'

/** Per-container device-tag map used by the tag-based selection UI. */
export type DeviceTagsSlice = Pick<
  DevicesStore,
  'selectedDevicesTags' | 'resetSelectedDevicesTags' | 'selectDeviceTag' | 'removeDeviceTag'
>

export const createDeviceTagsSlice: StateCreator<DevicesStore, [], [], DeviceTagsSlice> = (
  set,
) => ({
  selectedDevicesTags: {},

  resetSelectedDevicesTags: () =>
    set({ selectedDevicesTags: {}, selectedDevices: [], selectedSockets: {} }),

  selectDeviceTag: (payload) =>
    set((s) => {
      const { minerId, posTag, containerTag } = getTags(payload)
      const tags = { ...s.selectedDevicesTags }

      if (!containerTag) {
        const bucket = { ...(tags[NO_CONTAINER_KEY] ?? {}) }
        bucket[`id-${minerId}`] = { isPosTag: false, minerId }
        tags[NO_CONTAINER_KEY] = bucket
        return { selectedDevicesTags: tags }
      }

      const bucket = { ...(tags[containerTag] ?? {}) }
      if (posTag && !bucket[`id-${minerId}`]) {
        bucket[`pos-${posTag}`] = { isPosTag: true, minerId }
      } else {
        bucket[`id-${minerId}`] = { isPosTag: false, minerId }
      }
      tags[containerTag] = bucket
      return { selectedDevicesTags: tags }
    }),

  removeDeviceTag: (payload) =>
    set((s) => {
      const { minerId, posTag, containerTag } = getTags(payload)
      const tags = { ...s.selectedDevicesTags }

      if (!containerTag) {
        if (tags[NO_CONTAINER_KEY]) {
          const bucket = { ...tags[NO_CONTAINER_KEY] }
          delete bucket[`id-${minerId}`]
          tags[NO_CONTAINER_KEY] = bucket
        }
        return { selectedDevicesTags: tags }
      }

      const bucket = { ...(tags[containerTag] ?? {}) }
      delete bucket[`id-${minerId}`]
      if (posTag) delete bucket[`pos-${posTag}`]
      if (Object.keys(bucket).length === 0) delete tags[containerTag]
      else tags[containerTag] = bucket
      return { selectedDevicesTags: tags }
    }),
})
