/**
 * Re-export of the device-buckets projector that now lives in
 * `@tetherto/mdk-react-adapter` (per the separation-of-concerns rule —
 * tag-shape knowledge belongs in the data layer, not the React UI layer).
 *
 * Kept here so existing imports under `device-explorer/hooks/use-get-available-devices`
 * continue to resolve. New code should import directly from
 * `@tetherto/mdk-react-adapter`.
 */

export type {
  AvailableDevices,
  AvailableDevicesInput,
  UseGetAvailableDevicesOptions,
} from '@tetherto/mdk-react-adapter'
export { useGetAvailableDevices } from '@tetherto/mdk-react-adapter'
