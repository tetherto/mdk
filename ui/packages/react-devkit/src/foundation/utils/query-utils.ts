/**
 * Re-export of the MongoDB-style query builders that now live in
 * `@tetherto/mdk-ui-core` (per the separation-of-concerns rule —
 * query-shape generators belong in ui-core, not the React layer).
 *
 * Kept here so existing imports under `foundation/utils/query-utils`
 * continue to resolve. New code should import directly from
 * `@tetherto/mdk-ui-core`.
 */

export {
  CONTAINER_LIST_THINGS_LIMIT,
  getByIdsQuery,
  getByTagsQuery,
  getByTagsWithAlertsQuery,
  getByTagsWithCriticalAlertsQuery,
  getByThingsAttributeQuery,
  getByTypesQuery,
  getContainerByContainerTagsQuery,
  getContainerMinersByContainerTagsQuery,
  getDeviceByAlertId,
  getFiltersQuery,
  getListQuery,
  getLvCabinetDevicesByRoot,
  getMinersByContainerTagsQuery,
  getSitePowerMeterQuery,
} from '@tetherto/mdk-ui-core'
