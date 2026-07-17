# @tetherto/mdk-react-adapter

React framework adapter for [`@tetherto/mdk-ui-foundation`](../ui-foundation/README.md). Binds
the Zustand vanilla stores and the TanStack `QueryClient` from the
headless core into React-native hooks.

## Surface

- `<MdkProvider apiBaseUrl={...}>` — wraps `QueryClientProvider` from
  `@tanstack/react-query` and exposes the resolved API base URL via
  React context. Required at the app root.
- Store hooks: `useAuth`, `useDevices`, `useTimezone`,
  `useNotifications`, `useActions` — one per core store, implemented
  with `useStore(<vanillaStore>)` from `zustand`.
- **`useDeviceAction()`** — queue a `DeviceActionSubmission` (built with
  the foundation's `buildXxx` helpers) into `actionsStore`; exposes
  `canSubmit` (checks `actions:w`). Device actions share the same review
  tray as pool actions.
- **`useThingComment()`** (`COMMENTS_WRITE_PERM`) — add, edit, and delete
  Thing comments against `/auth/thing/comment`; exposes `addComment`,
  `editComment`, `deleteComment`, `canComment` (`comments:w`), `isSaving`,
  and `error`; invalidates `list-things` queries on every write so the
  detail panel refreshes automatically.
- [Op Centre read hooks](#op-centre-read-hooks) — fetch, poll, and shape data for the Operational Centre pages.
- Write-action hooks — submit, vote, cancel, and query the server-side
  approval queue. Submission and direct vote/cancel hooks check `actions:w`;
  `useLiveActions()` also recognizes approver roles from the auth token.
- Re-exports of `useQuery`, `useMutation`, `useQueryClient` from
  `@tanstack/react-query` so consumers can stay on a single import path.

## Op Centre read hooks

These hooks own the fetch → render-shape transformation for the Operational
Centre pages (Site Overview and Explorer). All are tagged `@category
op-centre` in the machine-readable manifest (`npx mdk-ui hooks --category
op-centre`).

| Hook | Endpoint | Polling |
| --- | --- | --- |
| `useExplorerList(tab, options?)` | `GET /auth/list-things` | 60 s (inventory cadence) |
| `useThingDetail(id, options?)` | `GET /auth/list-things` | 20 s (realtime cadence) |
| `useRackLayout(params, options?)` | `GET /auth/list-racks` | 60 s |
| `useCabinetGroups(options?)` | `GET /auth/list-things` | 60 s |
| `useSite(options?)` | `GET /auth/site` | None — static config |
| `useFeatureFlags(options?)` | `GET /auth/featureConfig` | None — static config |
| `usePduLayout(params, options?)` | `GET /auth/pdu-layout` | None — static config |
| `useContainerSettings(options?)` | `GET /auth/global/data?type=containerSettings` | 60 s |
| `useContainerWidgets(options?)` | `GET /auth/list-things` + `GET /auth/tail-log` | Containers 60 s, realtime snapshots 20 s |

`useContainerWidgets` runs two independent queries: the container inventory
at the standard 60 s cadence (`POOL_MANAGER_POLL_INTERVAL_MS`) and the
per-miner realtime aggregate at a faster 20 s cadence
(`OP_CENTRE_REALTIME_POLL_INTERVAL_MS`). Both intervals are configurable via
`containersRefetchInterval` / `realtimeRefetchInterval` options.

`useFeatureFlags` and `usePduLayout` use `staleTime: Infinity` — the MDK is
single-site only, so these are fetched once per session and never
re-polled.

Import from `@tetherto/mdk-react-adapter/hooks` or the package root barrel.

> [!NOTE]
> [`useContainerWidgetsData`](../react-devkit/src/domain/features/site-overview/container-widgets/USAGE.md),
> [`useExplorerData`](../react-devkit/src/domain/features/explorer/USAGE.md), and
> [`useExplorerThingDetail`](../react-devkit/src/domain/features/explorer/explorer-detail/USAGE.md)
> in `@tetherto/mdk-react-devkit` compose these hooks into page-ready shapes. Prefer the devkit
> wrappers in application code; use the adapter hooks directly when you need fine-grained polling
> control or are building new devkit features.

## Write-action hooks

These hooks connect the UI to the Gateway `/auth/actions*` routes and the Kernel
write-action approval path. Shared helpers live in `action-write-utils.ts`
(`ACTIONS_WRITE_PERM`, `invalidateAfterActionWrite()`, `extractSubmitError()`,
`toVotingPayload()`).

| Hook                         | Use for                                                                                                              |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `useDeviceAction()`         | Queue a `DeviceActionSubmission` into `actionsStore`; build submissions with the foundation's `buildXxx` helpers.     |
| `useSubmitSingleAction()`   | Submit one staged action from the local `actionsStore` queue by id                                                    |
| `useSubmitPendingActions()` | Drain the entire staged queue, POST each action, clear the queue                                                      |
| `useVoteOnAction()`         | Cast an approve/reject vote (`PUT /auth/actions/voting/:id/vote`)                                                     |
| `useCancelAction()`         | Cancel one or more pending voting actions (`DELETE /auth/actions/voting/cancel`)                                      |
| `usePendingActions({ params?, refetchInterval?, enabled? })` | Fetch the server-side voting queue (`GET /auth/actions`); defaults to a 60 s poll interval unless overridden |
| `useLiveActions()`          | Query live actions every 5 s; partition into `[mine, others]` by submitter email and expose `canApprove` for `actions:w`, `admin`, `site_manager`, or `*` roles |
| `useThingComment()`         | Add, edit, and delete Thing comments; invalidates `list-things` on every write                                        |

`toVotingPayload()` in `action-write-utils.ts` allowlists only the backend-recognized fields when building the `POST /auth/actions/voting` body — it explicitly carries the device-action targeting fields `tags` and `crossThing` through while dropping every other client-only field (`codesList`, `poolName`, local queue `id`, …).

Import from `@tetherto/mdk-react-adapter/hooks` or the package root barrel.

> [!NOTE]
> For the cross-layer architecture, read [approval-gated writes](../../../docs/concepts/control-plane.md#approval-gated-writes).
> For implementation steps, read the [write-actions how-to](../../../docs/guides/gateway/write-actions.md).

## Machine-readable hook manifest

Every hook is listed in `dist/hooks.json` (regenerated at build time). Agents
and tooling can load it via the subpath export or the CLI:

```bash
npx mdk-ui hooks --format table
npx mdk-ui hooks --category permission
```

## Subpath exports

| Subpath       | Purpose                                       |
| ------------- | --------------------------------------------- |
| `.`           | Top-level barrel                              |
| `./provider`  | `<MdkProvider>` + the `MdkContext` it powers  |
| `./hooks`     | Store hooks, write-action hooks, TanStack re-exports |
| `./hooks.json` | Machine-readable hook manifest (generated at build time) |

## Build strategy

`tsc -p tsconfig.build.json` emits ESM JS + `.d.ts` declarations into
`dist/`, and the package `exports` map resolves there. External npm
consumers get pre-built declarations and runtime JS — no compile step
required on their end.
