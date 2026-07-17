# @tetherto/mdk-ui-foundation

Framework-agnostic headless foundation for the MDK toolkit. Pure TypeScript — no React imports.
Consumed by framework adapters (`@tetherto/mdk-react-adapter`, future `@tetherto/mdk-vue-adapter`,
etc.) which bind these primitives to the host framework.

## Surface

### State

- **Zustand vanilla stores**: `authStore`, `devicesStore`, `notificationStore`, `timezoneStore`,
  `actionsStore` — each exported as a singleton and as a `create*Store` factory for test isolation
- **Telemetry primitives**: subscription manager, stale-detection helpers, ring buffer
- **Command lifecycle state machine**: models the pending → submitted → confirmed → failed arc for
  mining actions

### Data fetching

- **`createMdkQueryClient`**: returns a configured `@tanstack/query-core` `QueryClient` with
  environment-aware base URL resolution
- **`queryKeys`**: centralized key factories (arrays for structural TanStack equality matching):
  - Auth, devices, telemetry, tail-log, multi tail-log, list-things, history-log, ext-data
  - Op Centre reads: `site`, `listRacks`, `pduLayout`, `globalData`, `thingConfig`,
    `globalConfig`, `featureConfig`, `userInfo`
  - Pool Manager reads: `poolConfigs`, `containerPoolStats`, `pools`, `poolBalanceHistory`,
    `miners`, `siteStatusLive`, `actions`, `liveActions`
  - Pool Manager mutations: `submitAction`, `submitBatchAction`, `voteAction`, `cancelActions`
  - Thing-comment mutations: `addThingComment`, `editThingComment`, `deleteThingComment`
- **Query factories** (`factories.ts`): `{ queryKey, queryFn }` objects for mining read endpoints
  (auth, devices, tail-log, list-things, history-log, ext-data) and three **Thing-comment
  mutation factories** — `addThingCommentMutation` (POST), `editThingCommentMutation` (PUT),
  `deleteThingCommentMutation` (DELETE) — all sharing one `thingCommentMutationFn` implementation
  targeting `/auth/thing/comment`; there is no GET endpoint — comments are stored on the Thing
  record and returned in the `comments` field of each `listThings` result
- **Pool factories** (`pool-factories.ts`): query and mutation factory objects for Pool Manager
  endpoints, including the voting/approval write workflow (`submitActionMutation`,
  `submitBatchActionMutation`, `voteActionMutation`, `cancelActionsMutation`)

### Device actions

`utils/device-actions.ts` owns the payload vocabulary for the voting/approval write workflow so
action names, param positions, and cross-thing shapes never leak into the React layers:

- **Constants**: `DEVICE_ACTION` (miner, container, thing, rack verbs), `DEVICE_BATCH_ACTION`
  (move/delete/spare-parts batch verbs), `POWER_MODE` (`sleep | low | normal | high`)
- **Types**: `DeviceActionSubmission` (extends `VotingActionPayload` with pinned `type`, `action`,
  `tags`, and optional `crossThing`), `DeviceActionCrossThing` (`{ type, params }` fan-out
  descriptor), `SocketSwitch`, `UpdateThingParams`
- **Core assembler**: `buildDeviceActionSubmission(action, tags, params, extras)` — spreads `extras`
  first so display-only fields (e.g. `codesList`, `firmwareLabel`) can never override the pinned
  `type`, `action`, `tags`, or `params` fields
- **Cross-thing helpers**: `buildContainerCrossThing(containers)` and `buildMinerCrossThing(containers)`
  — the shared `withCrossThing` fragment is deduplicated into a private helper consumed by all
  fan-out-capable builders
- **Per-action builders** (each pins arity and encoding):
  `buildRebootAction`, `buildSetPowerModeAction`, `buildSetPowerPctAction`, `buildSetLedAction`,
  `buildSwitchContainerAction`, `buildSwitchCoolingSystemAction`, `buildSetTankEnabledAction`,
  `buildSetAirExhaustEnabledAction`, `buildResetAlarmAction`, `buildSwitchSocketAction`,
  `buildSetPlcRegistersAction`, `buildUpdateThingBatchEntry`

### Query parameter builders

- **Op Centre builders**: (`utils/op-centre-queries.ts`) compose `ListThingsParams` objects for the
  Explorer and Site Overview read paths:
  - `buildExplorerListThingsParams` (miner / cabinet / container tab variants)
  - `buildContainerDetailParams`, `buildCabinetDetailParams`
  - `buildContainerWidgetsListParams`, `buildContainerWidgetsRealtimeTailLogParams`
  - Field projection constants: `OP_CENTRE_LIST_THINGS_FIELDS`,
    `OP_CENTRE_CONTAINER_DETAIL_FIELDS`, and related sets
- **Alert builders**: (`utils/alert-queries.ts`) builds alert-page list-things and history-log params
- **Dashboard builders**: (`utils/dashboard-queries.ts`) builds tail-log and ext-data params for
  the operations dashboard
- **Query utilities**: (`utils/query-utils.ts`) MongoDB-style selector composers (`getByTagsQuery`,
  `getByIdsQuery`, `getContainerByContainerTagsQuery`, etc.) and `flattenKernelEnvelope` a
  null-safe helper that flattens per-Kernel nested envelopes from `list-things` / `list-racks` into a
  flat row array

### Container tab utilities

`utils/container-tabs.ts` owns the per-model container detail-tab matrix so the React layers stay
free of container-model knowledge:

- **`CONTAINER_TAB_MATRIX`**: tab sequence keyed by `ContainerModelFamily`
  (`bitdeer`, `antspace-hydro`, `antspace-immersion`, `microbt`, `gamma`)
- **`resolveContainerModelFamily`**: maps a raw container type string to its family
- **`getSupportedContainerTabs`**: returns the full ordered tab list for a container type,
  including the Power Adjustment tab splice for Whatsminer containers
- **`isPduContainerTab`**: predicate covering both the `pdu` and `layout` tab keys
- Family predicates: `isBitdeerContainer`, `isAntspaceHydroContainer`,
  `isAntspaceImmersionContainer`, `isMicroBTContainer`, `isGammaContainer`,
  `isWhatsminerContainer`

### API types

`types/api-mining.types.ts` carries the Gateway endpoint contracts:

- Tail-log: `TailLogEntry`, `HashRateLogEntry`, `PowerModeTimelineEntry`, `TailLogParams`,
  `TailLogMultiParams`
- List-things: `ListThingsDevice`, `ListThingsParams`, `DeviceAlert`, `AlertSeverity`
- History-log: `HistoricalAlert`, `HistoryLogParams`
- Ext-data: `ExtDataParams`, `PoolMinerStats`, `MinerpoolExtDataEntry`,
  `MinerpoolStatsHistoryEntry`
- Auth: `AuthTokenRequest`, `AuthTokenResponse`, `FeatureConfigResponse`
- **Op Centre**: `SiteResponse`, `ListRacksParams`, `Rack`, `PduLayoutParams`,
  `PduLayoutResponse`, `PduLayoutItem`, `PduLayoutSocket`, `GlobalDataParams`,
  `ContainerSettingsEntry`, `ContainerThresholdLevels`, `ThingConfigParams`,
  `ThingCommentBody`
- Error class: `MdkFetchError`

Additional type modules: `types/pool.types.ts`, `types/settings.types.ts`, `types/chart.types.ts`.

## Subpath exports

| Subpath         | Purpose                                                                  |
| --------------- | ------------------------------------------------------------------------ |
| `.`             | Top-level barrel                                                         |
| `./store`       | Zustand vanilla stores                                                   |
| `./query`       | `QueryClient` factory, `queryKeys`, and query/mutation factories         |
| `./types`       | Shared type contracts                                                    |
| `./stores.json` | Machine-readable store + query-helper manifest (generated at build time) |

## Build strategy

Fully pre-built: TypeScript → ESM JS + `.d.ts` declarations under `dist/`. Consuming framework
adapters import the compiled output.
