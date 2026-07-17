import { MAINTENANCE_CONTAINER } from '../../../constants/container-constants'

/** Backend rollup keys leaked into container-grouped metrics alongside real container ids. */
export const LEAKED_CONTAINER_GROUP_KEY_PATTERN = /^group-\d+$/

export const isLeakedGroupedContainerKey = (key: string): boolean =>
  key === MAINTENANCE_CONTAINER || LEAKED_CONTAINER_GROUP_KEY_PATTERN.test(key)
