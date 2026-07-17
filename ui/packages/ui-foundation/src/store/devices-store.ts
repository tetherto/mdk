/**
 * Devices store — re-export shim.
 *
 * The implementation now lives in `./devices/` split into focused slices
 * (selection, containers, sockets, filters, device-tags, lifecycle). This file
 * preserves the original `./devices-store` import path used by `store/index.ts`
 * and the store's tests; the public API (`DevicesStore`, `createDevicesStore`,
 * `devicesStore`, `NO_CONTAINER_KEY`, …) is unchanged.
 */
export * from './devices'
