import { createStore } from 'zustand/vanilla'
import { createContainersSlice } from './containers.slice'
import { createDeviceTagsSlice } from './device-tags.slice'
import { createFiltersSlice } from './filters.slice'
import { createLifecycleSlice } from './lifecycle.slice'
import { createSelectionSlice } from './selection.slice'
import { createSocketsSlice } from './sockets.slice'
import type { DevicesStore } from './types'

export * from './types'

/**
 * Factory for an isolated `devicesStore` — fresh selection state for tests
 * or feature-scoped instances. Production code should use the singleton
 * {@link devicesStore} so every component sees the same selections.
 *
 * The store is composed from focused slices (selection, containers, sockets,
 * filters, device-tags, lifecycle); the public `DevicesStore` shape is
 * unchanged.
 *
 * @category devices
 */
export const createDevicesStore = () =>
  createStore<DevicesStore>((...a) => ({
    ...createSelectionSlice(...a),
    ...createContainersSlice(...a),
    ...createSocketsSlice(...a),
    ...createFiltersSlice(...a),
    ...createDeviceTagsSlice(...a),
    ...createLifecycleSlice(...a),
  }))

/**
 * Module-level singleton tracking selected devices, containers, sockets,
 * and the device-tag map across the UI. Drives bulk-action toolbars,
 * filtering, and the device explorer.
 *
 * @category devices
 */
export const devicesStore = createDevicesStore()
