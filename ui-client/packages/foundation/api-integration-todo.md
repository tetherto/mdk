# API Integration TODO

## Components to Update

### RackIdSelectionDropdown

- [ ] Replace `MOCK_RACKS` with `useGetListRacksQuery({ type: 'miner' })`
- [ ] Connect `isLoading` to the query's loading state
- [ ] Ensure `handleChange` correctly updates the parent form state with the rackId string

### AddReplaceMinerDialogContent

- [ ] Short Code Logic: Replace `MOCK_SHORT_CODES` with a `useGetThingConfigQuery` call triggered when rackId changes.
- [ ] Controller Check: Re-enable `useGetListThingsQuery` for `inventory-miner_part-controller`. If data exists, set the `macAddress` field to readOnly.
- [ ] Site Context: Connect `useGetSiteQuery` to retrieve the currentSite for the final submission payload.
- [ ] Submission: Map onSubmit to the `setAddPendingSubmissionAction` Redux action using the `ACTION_TYPES` (Update vs Register).

### ContainerSelectionDialogContent

- [ ] Dynamic Fetching: Replace `MOCK_CONTAINERS` with the `useGetListThingsQuery` call we initially discussed.
- [ ] Query Params: Ensure `getByTypesQuery(supportedContainerTypes)` is correctly filtering based on the miner type passed from the parent.

## ConfirmChangePositionDialogContent

- [ ] **Spare Parts Fetching**: Replace `MOCK_SPARE_PARTS` with `useGetListThingsQuery`.
  - Query should target `info.parentDeviceId` equal to the selected miner ID.
  - Fields needed: `id`, `rack`.
- [ ] **Duplicate Validation**: Ensure `useMinerDuplicateValidation` is updated from mock to `useLazyGetListThingsQuery`.
- [ ] **Feature Config**: In `useStaticMinerIpAssignment`, replace hardcoded `true` with `useGetFeatureConfigQuery`.
- [ ] **Submit Action**: Ensure the Redux action `setAddPendingSubmissionAction` correctly formats the payload for the API Gateway.

## Hooks to Update

### usePoolConfigs

- [ ] Remove `UsePoolConfigsOptions` props pattern — replace with `useGetPoolConfigsQuery({})` internally
- [ ] Remove mock `data` / `isLoading` / `error` props
- [ ] Pass raw query result directly into the existing `parseEndpoints` + mapping logic
- [ ] Ensure `PoolConfigData` type matches the real API response schema from `useGetPoolConfigsQuery`

```typescript
// Target implementation (app side)
import { useGetPoolConfigsQuery } from '@/app/services/api'
import { usePoolConfigs as usePoolConfigsBase } from '@tetherto/mdk-foundation-ui'

export const usePoolConfigs = () => {
  const { data, isLoading, error } = useGetPoolConfigsQuery({})
  return usePoolConfigsBase({ data, isLoading, error })
}
```

### useGetAvailableDevices

- [ ] Remove `UseGetAvailableDevicesOptions` props pattern — replace with `useGetListThingsQuery` internally
- [ ] Remove mock `data` prop
- [ ] Restore original query: `tags: { $in: ['t-miner', 't-container'] }`, `fields: { type: 1 }`, `limit: 1`
- [ ] Ensure `isContainer` / `isMiner` helpers are imported from `@/app/utils/deviceUtils` (app side)

```typescript
// Target implementation (app side)
import { useGetListThingsQuery } from '@/app/services/api'
import { useGetAvailableDevices as useGetAvailableDevicesBase } from '@tetherto/mdk-foundation-ui'

export const useGetAvailableDevices = () => {
  const { data } = useGetListThingsQuery({
    query: JSON.stringify({
      tags: { $in: ['t-miner', 't-container'] },
    }),
    fields: JSON.stringify({ type: 1 }),
    limit: 1,
  })
  return useGetAvailableDevicesBase({ data })
}
```

### useContainerThresholds

- [ ] Replace `MOCK_SITE_DATA` with `useGetSiteQuery()`
- [ ] Replace `MOCK_CONTAINER_SETTINGS` with `useGetContainerSettingsQuery()`
- [ ] Replace `mockSetContainerSettings` with `useSetContainerSettingsMutation()`
- [ ] Update `isSiteLoading` to use real query state
- [ ] Update `isSettingsLoading` to use real query state

### useMinerDuplicateValidation

- [ ] Replace `MOCK_MINERS_DB` search with `useLazyGetListThingsQuery()`
- [ ] Implement `$or` query logic (Regex for MAC, `$in` for SN/Address/Code)
- [ ] Update `isDuplicateCheckLoading` to map to RTK Query's `isLoading` or `isFetching`

### useStaticMinerIpAssignment

- [ ] Replace `useState({ isStaticIpAssignment: true })` with `useGetFeatureConfigQuery()`
- [ ] Ensure featureConfig type matches the global API response schema

## API Hooks Needed

```typescript
// From @/app/services/api
import {
  useGetSiteQuery,
  useGetContainerSettingsQuery,
  useSetContainerSettingsMutation,
  useLazyGetListThingsQuery,
  useGetListThingsQuery,
  useGetFeatureConfigQuery,
  useGetListRacksQuery,
  useGetThingConfigQuery,
  useGetPoolConfigsQuery,
} from '@/app/services/api'
```
