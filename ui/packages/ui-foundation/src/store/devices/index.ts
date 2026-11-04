import { createStore } from 'zustand/vanilla'
import { createContainersSlice } from './containers.slice.js'
import { createDeviceTagsSlice } from './device-tags.slice.js'
import { createFiltersSlice } from './filters.slice.js'
import { createLifecycleSlice } from './lifecycle.slice.js'
import { createSelectionSlice } from './selection.slice.js'
import { createSocketsSlice } from './sockets.slice.js'
import type { DevicesStore } from './types.js'

export * from './types.js'

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
