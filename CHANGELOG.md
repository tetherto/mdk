# Changelog: mdk-0.14.0

## v0.14.0

- Gives a Worker its own **telemetry store**: it polls its devices on an interval, keeps a retained series, and answers
  fleet-wide snapshot and aggregate reads with no device round-trip
- Adds **`pullSnapshot` and `pullAggregate`** to `@tetherto/mdk-client`, so one Kernel call reads stored telemetry across
  many Workers and folds the partials into one fleet answer
- Migrates **five in-repo Workers to the directory-loaded V2 plugin shape**, so `mdk run` hosts them from `mdk.yaml`
  with their mocks
- Extracts the telemetry aggregation ops into **`@tetherto/mdk-stats`**, a new publishable package
- Generates an **HTTP API reference and OpenAPI document** from an app's route table, and ships one for the Gateway's
  sign-in routes
- Makes a refused Worker registration **say why**: the Kernel's persisted bindings now report a conflict instead of a
  bare `false`
- Lets a Worker you host yourself **join the stack's private DHT** without copying its settings: the process that runs
  the Kernel (`mdk run` or `mdk run kernel`) publishes them to `.mdk/network.json` and mdk-core's new
  `dhtFromProject(projectDir)` reads them back. A Worker on the wrong DHT is also no longer silent — the Kernel reports
  every peer it cannot reach
- Resolves **every advisory the audit allowlist held open**. The allowlist now holds one new advisory, in dev-only
  tooling, that has no fixed release yet
- Fixes the **F2Pool mock's random generators**: BTC payouts, the subsidy / fee split and pool balances were rounded to
  2 decimals and so collapsed onto the bottom of their range, charting a backfilled revenue history as a flat line, and
  the integer draw could overrun its own maximum

## Breaking changes

### `WorkerRegistry.register()` and `kernel.registerWorker()` resolve an object

[`backend/core/kernel/lib/modules/worker-registry/index.js`](./backend/core/kernel/lib/modules/worker-registry/index.js)
returned `true` or `false`. It now resolves `{ registered: true }`, or `{ registered: false, error, ... }` naming the
binding that refused the Worker. `kernel.registerWorker()` passes that through, so a caller testing the result for
truthiness now reads every refusal as a success.

| Was | Now |
| --- | --- |
| `if (await kernel.registerWorker(key))` | `if ((await kernel.registerWorker(key)).registered)` |

The binding refusals are `ERR_WORKER_KEY_CONFLICT` (a `workerId` bound to one RPC key is claimed with another) and
`ERR_WORKER_DEVICE_CONFLICT` (a Worker lists a `deviceId` another `workerId` owns), both carried on the result and
emitted as the new `worker-rejected` event. A device conflict carries `ownerPending: true` while the owner's claim is
one the Kernel restored at start and the owner has not registered again. The other refusals, each a bare `false` before,
are `ERR_CHANNEL_NOT_CONNECTED` and `ERR_WORKER_IDENTITY_UNAVAILABLE` (the Kernel cannot reach the Worker),
`ERR_WORKER_CONTRACT_INVALID` and `ERR_WORKER_REGISTRATION_FAILED`.

A refused Worker is offered again when the Worker holding the binding registers again or releases it, and the Kernel
emits the new `worker-admitted` event when a Worker it refused is let in. A Worker key the Kernel cannot reach at all is
emitted as the new `worker-unreachable` event, `{ error, rpcKey }`, whenever the error for that key changes.

### `listWorkers()` returns `rpcKey` only to a caller allowed to read the Worker

A `WORKER_LIST` row carried the Worker's RPC public key to every authenticated caller. The Kernel now includes `rpcKey`
only when the caller may `workers: read` that Worker under the `spec.rbac` in force, and omits the field otherwise;
every other field is unchanged. An unauthenticated in-process call still receives the full rows.

A caller that reads `rpcKey` off `listWorkers()` and holds no `workers: read` grant for that Worker gets `undefined`.
Grant the rule, or take the Worker's key from the deployment that provisioned it.

### Five in-repo Workers move to the directory-loaded V2 plugin shape

The Avalon, ABB, SATEC, Schneider and f2pool packages no longer export a plugin object from `plugin/index.js` with a
`connect()`, and no longer ship a `plugin/boot.js`, `config/*.example` files or `setup-config.sh`. Each is now a package
directory that `WorkerRuntimeV2` loads: an `mdk-contract.json` at the package root naming handlers under `src/`, where
every handler is a plain `(params)` function that reaches its device through the ambient
[`@tetherto/mdk-worker/device`](./backend/core/mdk-worker/device.js) module.

| Was | Now |
| --- | --- |
| `plugin/mdk-contract.json` | `mdk-contract.json` at the package root |
| `plugin/index.js` exporting `{ contract, dir, connect, disconnect? }` | a device module under `src/` that the handler files require, plus one handler file per field |
| `plugin/boot.js` calling `startXWorker(opts)` | `mdk run`, from the package's entry under `spec.workers` in `mdk.yaml` |
| `config/*.json.example`, `setup-config.sh` | `config.devices[]` in `mdk.yaml`; `smoke.config.js` for `mdk validate worker --smoke` |

A host that imported one of these packages' boot functions now declares the package under `spec.workers` in `mdk.yaml`
and lets `mdk run` host it, or constructs `WorkerRuntimeV2` on the package directory itself — each package's
`README.md` shows both. The V1 alert and stats templates those packages carried are gone with them. The Antspace,
Bitdeer and Seneca Workers keep the older shape on `WorkerRuntime` v1, but each contract now declares
`telemetryPollIntervalMs`, so the telemetry collector runs for them too (see Added).

A process started from `worker.js` with `SERVICE=worker` hosts these five on `WorkerRuntimeV2` too. It takes its device
list from `MDK_WORKER_DEVICES`, a JSON array in the `mdk.yaml` `devices` shape, or from `MDK_WORKER_DEVICES_FILE`, and a
Worker secret such as `F2POOL_API_SECRET` from `MDK_WORKER_ENV`, a JSON object, or from `MDK_WORKER_ENV_FILE`. Without a
device list it exits with `ERR_MDK_WORKER_DEVICES_REQUIRED`, and with `ERR_MDK_WORKER_DEVICES_INVALID` or
`ERR_MDK_WORKER_ENV_INVALID` when either value does not parse to the expected shape. `startServices()` now requires
`services[].devices` for these five and accepts `services[].env`. It writes them to `mdk-workers/<name>.devices.json`
and `<name>.env.json` (mode `0600`) and points the process at them, so add `devices` to each such service entry. Under
Docker the container user must be able to read those `0600` files: run it as the host user's user ID, or as root. The
service `name` becomes part of those file names, so it may only use letters, digits, `.`, `_` and `-`
(`ERR_MDK_SERVICE_NAME_INVALID`). It throws `ERR_MDK_WORKER_DEVICES_UNSUPPORTED` if Antspace, Bitdeer or Seneca are
given either field.

Each package's root `index.js` no longer exports `plugin` or a boot function; it exports only the device classes, or
the f2pool `F2_POOL` pool manager, for a host that drives the device without the runtime. A f2pool device without an
`apiUrl` that sets a `port` is called at its own host and port, which is how `mdk run` points it at its mock; without
either it still calls `https://api.f2pool.com`.

### A hop-count `trustProxy` stops the Gateway at boot

The Gateway's `trustProxy` refuses a hop count. A number, or a digit string such as `--trust-proxy 1`, now throws
`ERR_GATEWAY_TRUST_PROXY_INVALID` at boot, wherever it is set: `spec.gateway.config.trustProxy`, `common.json` or
`startGateway({ trustProxy })`. Fastify 5 reads a hop count as trusting no proxy, so the setting never took effect:
behind a proxy, every client shared the proxy's IP and its rate-limit bucket. Set the
[proxy's address or subnet](./backend/core/gateway/README.md#configuration) instead.

| Was | Now |
| --- | --- |
| `trustProxy: 1` | `trustProxy: "10.0.0.1"`, or a subnet such as `"10.0.0.0/8"` |

## Added

### Worker-side telemetry collection and retention

A plugin whose contract declares `telemetryPollIntervalMs` gets a collector in
[`backend/core/mdk-worker/lib/telemetry.js`](./backend/core/mdk-worker/lib/telemetry.js). The runtime sweeps every online
device when it starts and then at that interval, calls each distinct handler once per device, extracts every metric
declared against it by its `path`, and stores one `{ data, ts }` point per device. Each metric holds a value or an
`{ error }` marker, so a device that answered nothing still records why. Fleet reads are then answered from that store
with no device call, and a sweep updates the device health channel like a live poll does. A plugin without the key
polls only when an operator sets it in `mdk.yaml` (below).

| Contract key | Default | Effect |
| --- | --- | --- |
| `telemetryPollIntervalMs` | none (collector off) | Sweep interval |
| `aggregateCacheTtlMs` | one poll interval | How long an identical `aggregate` query is answered from memory, in a bounded cache; any sweep that stores a point drops the cached answers |
| `telemetryRetention.rawMs` | 24 h | How long points stay at poll resolution |
| `telemetryRetention.rollupIntervalMs` | 5 min | Bucket size older points are rolled into: the mean for `number` metrics, rounded to twelve significant digits, the last value otherwise |
| `telemetryRetention.keepMs` | 30 d | Points older than this are deleted |
| `telemetryArchive` | `false` | Append each rolled bucket to NDJSON day files, kept inside the archive directory, before its raw points are deleted |

An operator overrides any of them per Worker instance under `spec.workers[].config` in `mdk.yaml`;
`telemetryPollIntervalMs: null` turns a vendor's polling off. The series lives in `opts.store` when the host passes one,
else in a store under `opts.telemetryStoreDir`; the runtime refuses to construct with nowhere to write
(`ERR_TELEMETRY_STORE_REQUIRED`).

With `telemetryArchive` on, `telemetry.pull` `{ type: 'archive' }` lists a device's day files and the published
`restoreTelemetry` command puts a range back at full resolution. A restore is idempotent, a restored range stays at
full resolution across a restart, and a range older than `keepMs` is refused (`ERR_TELEMETRY_RESTORE_RANGE`).

A device spec takes an `info` block beside `config`: the labels a host attaches to a device, which an aggregate can
group or filter on. An `info` block that is not a plain object is refused (`ERR_DEVICE_INFO_INVALID`), as is a
`deviceId` containing a NUL character (`ERR_DEVICE_ID_INVALID`).

The Kernel leaves a polling Worker out of its scheduled `telemetry.pull`, so no device is polled twice.

### `pullSnapshot`, `pullAggregate` and `pullWorkerQuery` on `@tetherto/mdk-client`

Three Worker-scoped reads in [`backend/core/client/index.js`](./backend/core/client/index.js) that read stored telemetry
across several Workers in one Kernel round-trip:

| Call | Returns |
| --- | --- |
| `pullSnapshot({ workers, metrics?, from?, to?, granularity? })` | `{ devices, snapshotTs, errors? }` — the latest point per device, or a series per metric when `from` is given |
| `pullAggregate({ workers, ops })` | `{ ops, deviceCount, errors? }` — one result per op |
| `pullWorkerQuery({ workers, type, ...params })` | `{ workers, errors? }` — any other Worker-scoped query, run on each listed Worker and returned per `workerId` without merging |

Each Worker validates the op spec against its own contract's declared metric types and returns accumulators, never raw
points; the Kernel merges the partials and tallies, so an `avg` is the fleet average rather than an average of averages.
An op spec is keyed by result name, `{ op, src?, group?, filter?: { src, eq } }`, where `src` and `group` are
`metrics.<declared name>`, `info.<label>` or `deviceId`. A device's `config` block is never a source: it holds
connection details and credentials. Asking for `avg` on a `string` is refused when the spec is validated
(`ERR_AGGREGATE_OP_TYPE`) rather than answered with a wrong number, and a stored reading that is `null` or not of the
metric's declared type is left out of that op. The Kernel refuses a spec with an op it cannot merge
(`ERR_AGGREGATE_SPEC_INVALID`) before asking any Worker. A Worker that is unknown, unreachable or that refuses the query
lands in `errors` under its own code while the others are still returned, as does one that answers with no payload
(`ERR_WORKER_RESPONSE_INVALID`). An aggregate no Worker could serve answers empty `ops`.

All three reads need `devices` `read` on every device of the listed Workers, which the Kernel authorizes per device.

### `@tetherto/mdk-stats`

The telemetry aggregation ops move out of `@tetherto/mdk-core`'s internals into their own publishable package,
[`backend/core/stats`](./backend/core/stats/README.md), with entry points `.`, `./ops` and `./utils`. `mdk-core`
depends on it and re-exports it as `libStats`, so `require('@tetherto/mdk-core').libStats` is unchanged.

The package adds `mergeStats(state, packs)`, which folds the partial packs several collectors returned into one, and a
`merge` implementation on thirteen of the fifteen ops — everything except `alerts_aggr` and `alerts_group_cnt`, which
raise `ERR_STATS_OP_NOT_MERGEABLE`. This is what lets the Kernel combine aggregate answers from many Workers.

### `mdk run` hosts the migrated Workers

`mdk run` starts any directory-loaded Worker package declared under `spec.workers` in `mdk.yaml`, and starts one mock
per device when `config.mock` is set. `config.mock` takes `true` for the conventional `mock/server.js`, or the path of
another mock module file; the path must stay within the package and name a file, not a directory. The runner accepts the
three mock shapes in the wild (`{ server, ready, exit }`, `{ server, ready, close }` and `{ app, stop }`) and drops
lingering keep-alive sockets on close, so the port frees immediately.

The CLI also hands each Worker its `config` block and its telemetry store directory, so the collector's keys can be set
per instance.

### f2pool `transactions` telemetry channel

The f2pool Worker's contract gains a `transactions` channel: F2Pool revenue rows (`changed_balance` in BTC, with the PPS
and transaction-fee split) across the configured accounts. `start` and `end` (ms) select a range, in one call per
account. Without them, a poll sweep returns the rows that arrived since the previous sweep, from UTC midnight on the
first. `aggrHourly: true` returns one `{ ts, revenue }` row per hour.

### `@tetherto/mdk-worker/sweep-memo`

A new export that memoizes one device read for the length of a single poll sweep, keyed on the identity of the `params`
object the runtime hands every handler of that sweep. Channels of the same device share one read, and a later pull asks
the device again rather than answering from a cache. Called inside the plugin's own module so the memo lives in that
device's private registry.

### `dhtFromProject` on `@tetherto/mdk-core`

The process that runs the Kernel (`mdk run` or `mdk run kernel`) writes the stack's resolved DHT settings to
`.mdk/network.json`, and `dhtFromProject(projectDir)` reads them back, so a Worker you host yourself joins the same DHT.
It returns `{}` on the public DHT and for a stack that has not run yet. It throws `ERR_MDK_PROJECT_DIR_REQUIRED` without
a project directory, `ERR_MDK_NETWORK_FILE_UNREADABLE` or `ERR_MDK_NETWORK_FILE_INVALID` for a file it cannot read or
parse, and `ERR_MDK_DHT_BOOTSTRAP_INVALID`, `ERR_MDK_DHT_BOOTSTRAP_PUBLIC` or `ERR_MDK_DHT_HOST_INVALID` for a
`bootstrap` or `dhtHost` entry it refuses.

### `mdk-agent` signs in to the MCP server

`mdk-agent` can now use an MCP server that requires a token, such as `mdk run mcp`. `--mcp-credential <file>` with
`--gateway-url <url>` signs in as the service account in that file and renews its token; a fixed token can come from
`--mcp-token` or `MDK_AGENT_MCP_TOKEN` instead. Each needs `--mcp-url`, and a credential and a token are mutually
exclusive. `createAgent()` takes the same as `mcp: { url, credential?, token? }`. On a 401 a signed-in agent signs in
again once and sends the request again.

### Two security skills in `@tetherto/mdk-skill`

`mdk-app-security` and `mdk-worker-security` ship with the skill suite, reviewing an app package and a Worker package
respectively. `mdk-app-security` carries a `scan-app.mjs` script and an app-review reference, and
`mdk-worker-security` a `scan-worker.mjs` script and a Worker-review reference.

### Versioning and deprecation policy

[`docs/reference/versioning.md`](./docs/reference/versioning.md) states which interfaces MDK treats as public, what a
version number promises from `1.0.0` on, and how long a deprecated interface keeps working: at least two MINOR releases
and at least six months, removed only in a MAJOR. Before `1.0.0`, any release can break a public interface, and each one
is listed under `Breaking changes` here.

### HTTP API references from route tables

[`@tetherto/mdk-app-runtime`](./backend/core/app-runtime/README.md) can check an app's route table against a schema and
turn it into an API reference:

| Export | Does |
| --- | --- |
| `validateRouteTable(table, { strict? })` | Checks a parsed `mdk-plugin.json` against `mdk-plugin.schema.json`, which the package now ships and exports, and returns `{ ok, errors, warnings }` |
| `routeTableToOpenApi(table, { appName, mount? })` | The table as an OpenAPI 3.1 document, with `gaps` naming what the table does not declare |
| `fastifyRoutesToOpenApi(routes, opts)` | The same for Fastify route objects registered in code, such as the Gateway's sign-in routes |
| `renderReference(document, gaps, opts)` | The Markdown HTTP reference for such a document |
| `PLUGIN_FILE` | The route table's filename |

A route can declare a `description`, which becomes its purpose in the reference and in the app's MCP tool. A table that
declares `routeTableVersion` is held to the OpenAPI-shaped rules as errors; one without it gets them as warnings, so
every table the loader already accepted still loads. The [route-table field
reference](./backend/core/app-runtime/docs/route-table-fields.md) lists every field. Worker contracts and route tables
are now checked by the same JSON Schema subset in `@tetherto/mdk-worker`.

`@tetherto/mdk-gateway` now ships a generated [HTTP API reference](./backend/core/gateway/docs/http-api.md) and
[`openapi.json`](./backend/core/gateway/docs/openapi.json) for its `/auth/*` routes, built from the route objects it
registers, and its sign-in routes describe their requests, responses and error body. The site example ships a generated
[HTTP API reference](./examples/mvp-site/backend/gateway-plugins/site/docs/http-api.md) for its app routes.

### `maxStreamBufferBytes` on the Gateway

`maxStreamBufferBytes` in `spec.gateway.config` or the Gateway's `common.json` caps how much of a stream route's body
the Gateway holds per stream while the HTTP client reads it. A client that falls further behind gets a truncated
response. Omitted or `null`, it is `16777216` (16 MiB); a positive integer, or a string of digits, sets it in bytes.
Anything else stops the Gateway at boot with `ERR_GATEWAY_STREAM_BUFFER_INVALID`. See
[request forwarding](./backend/core/gateway/README.md#request-forwarding).

### UI additions

- `GRANULARITY_LIMITS` and `granularityDisabledReason` in
  [`@tetherto/mdk-ui-foundation`](./ui/packages/ui-foundation/src/utils/period-utils.ts), the day ranges each
  granularity fits and the wording for a disabled option's tooltip. `allowedGranularities` keeps its signature and is
  now derived from them
- A `disabledReason` on a `CurrencyToggler` item, which makes the item `aria-disabled` rather than natively disabled so
  it stays hoverable and focusable for the tooltip
- `--mdk-control-height`, `--mdk-control-bg` and `--mdk-control-border` in
  [`@tetherto/mdk-react-devkit`](./ui/packages/react-devkit/src/primitives/styles/_colors.scss), the shared height,
  background and border of the filter-bar controls. `--mdk-control-height` is `--mdk-control-height-lg`, so a custom
  control can match the row with one token
- An `overlayClassName` prop on `DialogContent` in `@tetherto/mdk-react-devkit`, a class for the overlay behind the
  dialog

## Changed

- The Gateway logs a warning at boot for every route that sets `permissions`: under `spec.rbac` a route's `permissions`
  gate nothing, and an author would otherwise not see it. `mdk validate app` warns about the same thing, and about a
  request body schema that would lose a JSON `null` to the Gateway's type coercion
- `mdk validate app` checks each route table with `validateRouteTable`, and warns about a route with no `description`.
  `--strict` fails on a route-table schema finding too. `mdk create app` scaffolds a table that declares
  `routeTableVersion: "1"`, so a new app gets the OpenAPI-shaped rules as errors
- A per-device `telemetry.pull` or `state.pull` the Kernel cannot serve answers `{ error }` instead of an empty or
  malformed reply: `ERR_DEVICE_NOT_FOUND`, `ERR_WORKER_NOT_ROUTABLE` or `ERR_WORKER_UNREACHABLE`
- `mdk add` pins a GitHub source to the commit the lockfile resolved, writing `github:<owner>/<repo>#<sha>` into the
  spec, so the same install is reproducible
- `mdk run` reports a Worker the Kernel refused rather than passing over it, naming the binding to release
- A `worker.list` row, and so `listWorkers()` and `getStatus()` on `@tetherto/mdk-client`, carries the Worker's
  `deviceFamily` and `brand` from its contract metadata, `null` when the contract sets none
- Every CLI command that calls the Kernel bounds its connection warm-up: `mdk user`, `mdk serviceaccount`, `mdk login`
  and `mdk rbac` at 5 s a try, and `mdk status` at 3 s, so one against a Kernel that is not running answers in seconds
  rather than in the transport's full timeout three times over
- When the Kernel can't reach a Worker over the DHT, `mdk run` and `mdk run kernel` say why once per run, including for
  a Worker hosted in another process: on the public DHT (no
  `spec.network.dht`), that blocked outbound UDP stops every Worker registering and how to run a private bootstrap; on a
  private one, which bootstrap a Worker must join
- `connect()` on `@tetherto/mdk-client` takes `warmupTimeoutMs`, and a token renewal is bounded by the caller's own
  `timeout` rather than the transport's, so a Kernel that is not running costs about `warmupRetries` attempts
- The mdk-ui-component skill's component reference is an index plus one file per component, hook and type, replacing the
  single `ui-registry.json`
- The Supported Workers page explains the "v1 strictness gaps" flag inline: a contract without a `contractVersion`
  stamp reports the v1 requirements as warnings rather than failures
- `backend/core/kernel`'s action-manager constants are CommonJS, matching the rest of the package
- A doughnut chart raises slices under `minSliceAngle` to the minimum and shrinks the rest in proportion, so a small
  slice stays visible and the drawn values still sum to the visible total
- Chart legends read a dataset's own `hidden` until a legend click sets it, and `buildBarChartOptions` keeps the devkit
  legend rather than falling back to Chart.js's struck-through labels
- `DateRangePicker` opens as a centered modal over a blurred overlay rather than a popover, and closing it with ✕,
  Escape or the overlay discards the unapplied range. `modalClassName` styles the panel; the overlay carries
  `mdk-date-picker__overlay`
- `DatePicker` opens on the month of `selected`, and `DateRangePicker` on the months of `selected.from`, moving to a
  preset's months when one is clicked. `defaultMonth`, or `month` / `onMonthChange`, overrides it
- `ChartContainer`'s range options take a `disabled` flag, which greys an option out so it cannot be picked
- `MetricCard` colors its value through its `--highlighted` and `--transparent` modifiers rather than an inline color,
  so the value now follows a theme that overrides `--mdk-color-primary` or `--mdk-color-white`
- `--mdk-control-height-lg` is 40px, the control's outer box; it was 42px. A control sized to it renders 2px shorter
- `HeaderMinersBox` and `HeaderHashrateBox` drop their pool row when no pool prop is passed, so a site with no upstream
  pool no longer reads `Pool —` forever. The new `showPool` overrides the inference either way — hold the row's space
  while the pool numbers load, or hide it despite having them — and the miners box's app-side `online / total` ratio is
  kept in both cases
- `CoreAlert` takes a `role`, so an alert can say whether it is a live region: `'status'` announces politely and
  `'none'` renders no live region at all, for a banner that is part of the page rather than a response to something the
  user just did — such a banner is otherwise re-announced on every navigation. The default is unchanged (`'alert'`,
  assertive), and the `aria-live` it has always implied is now written out
- `mdk run` and `mdk run kernel` no longer warn that an app has no `spec.rbac` binding when its recorded grant is for no
  permissions at all: an app whose `mdk-app.yaml` declares `permissions: []` gets no role and no binding by design, so
  the warning could never be cleared
- The `react/forbid-dom-props` lint rule on inline `style` now covers `@tetherto/mdk-react-devkit` and the catalog app,
  which were exempt, so it holds across the whole `ui/` workspace
- `ERR_IDENTITY_NOT_READY` answers `503` rather than `400` from `POST /auth/login`, `POST /auth/token` and
  `POST /auth/refresh`: the token issuer is still loading its signing key, so the same request succeeds later. A client
  that branched on `400` for this code should retry on `503` instead. The Gateway's
  [HTTP API reference](./backend/core/gateway/docs/http-api.md) is regenerated
- The Gateway warns at boot when `trustProxy` is `true`, which lets a client set its own IP, and so its rate-limit
  bucket, with `X-Forwarded-For`. The Gateway README, the hosted-site guide and the security guide recommend the proxy's
  address or subnet instead
- When a slow client is cut off from a stream route, the Gateway logs `ERR_APP_STREAM_OVERFLOW` at `warn` with the app
  and route ID. A client that disconnects is not logged at `warn`. To report it, `pipeToResponse` in
  `@tetherto/mdk-app-runtime` resolves with the error that ended the body early, or `undefined` when the body completed
- `action.push`, `action.push-batch` and `action.vote` no longer take `authPerms`, which was a required array. Write
  access comes only from the caller's `spec.rbac` `devices: write` rule, checked per device. A stray `authPerms` from an
  older client is ignored, not refused. `pushAction`, `pushActionsBatch` and `voteAction` on `@tetherto/mdk-client` stop
  sending it, and `@tetherto/mdk-kernel/protocol/schemas` no longer checks it
- An in-process `action.vote` with no caller is allowed; the payload's `authPerms` decided it before. An in-process
  `action.push` or `action.push-batch` with no caller asks every device family the query matches, where it asked only
  the families its `authPerms` named
- `mdk run dashboard [name]` starts the dashboard under `apps/<name>`, and refuses a name the project does not have with
  the list of those it does. With no name it still picks `apps/dashboard`, or else the first app with a `dev` script.
  Either way it prints the directory it starts

## Deprecated

- `getMetricCardValueColor` in `@tetherto/mdk-react-devkit`. `MetricCard` now colors its value with the
  `mdk-metric-card__value--highlighted` and `--transparent` modifiers, so the helper only mirrors their default-theme
  values and does not follow a theme that overrides `--mdk-color-primary` or `--mdk-color-white`. It still works, and
  may be removed in a later release under the [versioning and deprecation policy](./docs/reference/versioning.md)

## Removed

- `plugin/`, `config/*.example` and `setup-config.sh` from the five migrated Worker packages, with their V1 alert and
  stats templates (see Breaking changes)
- `backend/core/mdk/lib/stats`, which is now `@tetherto/mdk-stats` (see Added)
- The advisories the repository's `audit-ci` allowlist held open (see Security)
- `ERR_PAYLOAD_AUTH_PERMS_REQUIRED` and `ERR_PAYLOAD_AUTH_PERMS_TOO_MANY`, with the `authPerms` field (see Changed), and
  `ERR_ACTION_DENIED`, the vote path's refusal for a missing family permission
- The Kernel's internal `lib/permissions` (`hasWritePermission`, `PERMISSION_LEVELS`), which the package `exports` never
  exposed

## Security

The `audit-ci` allowlist held seven advisories open, and each is resolved rather than re-suppressed:

| Advisory | Package | Resolution |
| --- | --- | --- |
| GHSA-mrhx-c7xc-m3w5 | `zod` | Memory exhaustion on oversized constrained collections, fixed in 4.6.6. `@tetherto/mdk-mcp`'s floor moves from `^4.0.0` to `^4.6.6`; the UI packages had already migrated |
| GHSA-mh99-v99m-4gvg | `brace-expansion` | Reached only through the dev-only `standard` lint toolchain's `eslint@8` → `minimatch@3` chain, which the root `brace-expansion` override held at a patched version but could not remove. Replacing `standard` with `@bitfinex/lint-js` drops the chain from the lockfile, so the suppression has nothing left to cover |
| GHSA-5jgf-p345-68v8, GHSA-f65p-4m7j-42xc, GHSA-fph4-wmhf-6fwf, GHSA-jqff-g426-hqxp | `fast-uri` | Nested copies behind `ajv` and `fast-json-stringify`, already resolved by the root `fast-uri` override |
| GHSA-wvh9-3hgj-7f22 | `tether-wrk-base` | The advisory names the unscoped `tether-wrk-base`; the dependency is the scoped `@tetherto/tether-wrk-base`, a different package installed from the registry. A name collision, no longer matched |

The allowlist now holds one advisory, new in this cycle: GHSA-fc5q-39xc-vjpf, a `picomatch` ReDoS with no fixed release.
`picomatch` is installed only by dev tooling (the test runners, Vite, `markdownlint-cli`, `lint-staged`, and `ts-morph`),
and no published package installs it. The entry expires on 2027-01-31, and a root override replaces it once a fixed
`picomatch` ships.

`npm audit` also still reports a moderate `minimatch` advisory (GHSA-g3hv-75wg-m249) through dev-only tooling, below the
`high` level `audit-ci` checks. A production-only audit (`npm audit --omit=dev`) reports none.

On a Gateway with an RBAC authority, an app-route request with a missing or invalid bearer token now counts against the
rate limit rather than being answered `401` uncounted, so token guessing is throttled: the token check runs after the
rate limit, and a throttled client is answered `429`. The limit is per client address, so clients behind one address
share a budget that failed tokens also spend.

Without `mqttCredentials`, the Bitdeer Worker's broker refuses a client that publishes or subscribes as a container
another open connection holds, so a host that reaches the broker port can no longer take over a connected container's
telemetry and commands. A container with no open connection, such as one that is offline or restarting, can still be
claimed, so set `mqttCredentials`.

The Gateway's warning on route `permissions` is a hardening change rather than an advisory: it surfaces a route whose
author believed `permissions` was gating it.

## Dependencies

| Change | Reason |
| --- | --- |
| `standard` replaced by `@bitfinex/lint-js` `^1.0.0` as the dev linter in every backend package and the example site; `ui/` keeps `oxlint` | GHSA-mh99-v99m-4gvg, and one lint toolchain across the repository |
| `@tetherto/mdk-mcp`: `zod` `^4.0.0` to `^4.6.6` | GHSA-mrhx-c7xc-m3w5 |
| `@tetherto/mdk-worker`: `@tetherto/hp-svc-facs-store` `^1.0.0` added | Backing store for the telemetry collector |
| `@tetherto/mdk-core`, `@tetherto/mdk-kernel` and `@tetherto/mdk-worker`: `@tetherto/mdk-stats` added | The extracted aggregation ops: the Worker computes a partial, the Kernel merges the partials, and `mdk-core` re-exports the package as `libStats` |
| The dashboard template declares `react-hook-form` `^7.55.0` and `zod` `^4.6.6` | Devkit peer dependencies a scaffolded dashboard has to resolve itself |
| `debug` `4.4.1` to `4.4.3` in `mdk-core`, `mdk-worker`, the Gateway, app runtime and MCP packages, the Avalon, ABB, SATEC, Schneider and Seneca Workers, and the CLI's Worker template | Patch update |
| `@tetherto/mdk-worker`: `hyperswarm` `4.17.0` to `4.17.2` | Patch update |
| `@tetherto/mdk-core`: `mingo` `6.5.6` to `6.7.2` | Minor update |
| `@tetherto/mdk-agent`: `@tetherto/mdk-identity` `^0.14.0` added | Service-account sign-in to the MCP server |
| `ui/package.json` overrides: the per-range `minimatch`, `glob` and `brace-expansion` entries collapse to `minimatch` `^11.0.1` and `glob` `^14.0.3` | One patched version of each across the `ui/` workspace |

## Fixed

- Device-addressed reads stay within the device: a `logs_multi`, `stats`, `list` or `historical_logs` read addressed to
  one device answers with that device's records only
- A device spec whose `config` is an array is refused (`ERR_DEVICE_CONFIG_INVALID`) rather than accepted
- After a Kernel restart, a Worker restored from the store keeps its `deviceFamily` and `brand`, and so its RBAC name
  and its `worker.list` row, before it reconnects
- A Worker that registers again releases the devices it no longer lists, so the Worker that took them over is no longer
  refused
- `mdk-agent` can use an MCP server that requires a token (see Added), and a 401 at connect names the flags that fix it
- `mdk create app` points a permissions change at `mdk add app <package> --accept-permissions`, then `mdk rbac apply`,
  rather than `mdk rbac init`, which leaves an existing role alone
- `mdk run`'s install hint points at the catalog source
- `mdk -v` turns on the MDK components' debug logs, by setting `DEBUG=mdk:*` unless `DEBUG` is already set, and
  `mdk --debug` prints the stack trace of an unexpected failure, rather than both flags being accepted and ignored
- `mdk user passwd`, `mdk user disable`, and `mdk user enable` refuse a user the Kernel does not have
  (`No user named "<name>".`) rather than creating one under a mistyped name, when the caller may list users; a caller
  that may write users but not list them still gets the plain update. `mdk serviceaccount remove` fails for an agent with
  no credential and no registration rather than reporting it removed
- When `mdk create dashboard` cannot fetch the UI shell for the CLI's own release tag, its error suggests
  `--ref main` for a release that is not published yet. The hint could never appear, because `--ref` always carried a
  default
- Every `onShutdown` handler in `@tetherto/mdk-core` shares one shutdown: a signal runs each registered cleanup once,
  last-registered first, then exits once, and force-exits after the longest `forceMs` registered, rather than the first
  handler to finish exiting the process and cutting off the others, such as a cleanup of your own beside
  `getKernel({ handleSignals: true })`
- A shutdown the force timeout cuts short exits with code `1` rather than `0`, so a supervisor can tell it from a clean
  one. `getKernel({ handleSignals: true })` and `startGateway({ handleSignals: true })` take `shutdownForceMs` to set that
  timeout, `3000` ms by default, and a `forceMs` or `shutdownForceMs` that is not a number from `0` to `2147483647` throws
  `ERR_SHUTDOWN_FORCE_MS_INVALID`
- A Kernel, Worker, app runtime, client, or Gateway given a private DHT bootstrap binds its DHT node to the ports above
  the bootstrap's, then to any free port, rather than taking the bootstrap's default UDP port `49737` when it starts
  first and leaving the bootstrap to fail with `EADDRINUSE`
- `mdk status` reports a running app as running after an earlier `mdk run` was stopped with Ctrl+C: the app's child file
  under `.mdk/run/` is now removed on stop
- `mdk run dashboard` exits `1` when the dev server fails to start or exits, rather than printing `Dashboard running`
  and exiting `0`
- A refresh cookie whose value does not percent-decode is treated as no cookie rather than failing the request:
  `POST /auth/refresh` answers `401` `ERR_AUTH_UNAUTHORIZED` as it does with no token, and `POST /auth/logout` succeeds
  and clears the cookie
- An MCP server started with `credential`, against a Kernel in another process, binds the DHT node of its policy client
  to `config.kernelDhtHost`, rather than to every interface even when the stack is bound to loopback
- The example site's `GET /site/history?metric=hashrate` labels its series `H/s`, the unit its values are in, rather
  than `TH/s`. The values are unchanged
- When `npm install` fails under `mdk add` or `mdk create`, the CLI's failure line carries npm's own error code and
  message, for example a registry `404`, read from npm's debug log, rather than only the exit code
- `mdk run` warns when Node is older than 24, as `mdk create` already did, then carries on
- `mdk create app <name> --org <org>` writes `com.<org>.<name>` as the `mdk-app.yaml` id rather than always
  `com.example.<name>`; without `--org` the id is unchanged
- A dashboard install that fails on peer resolution is retried with `--legacy-peer-deps`. `mdk onboard` says when the
  retry succeeded, and warns when the dashboard's dependencies still did not install rather than reporting the scaffold
  as complete
- `mdk rbac show` exits `1`, with no comparison line, when it could not read the Kernel's policy, as with an expired
  session or a missing permission, rather than printing the error, then `differs: run mdk rbac apply`, and exiting `0`.
  `mdk rbac apply` and `mdk rbac init` report a refused sign-in or permission as `spec.rbac was not applied: <error>`
  rather than as a policy the Kernel refused
- With an expired session, or a signed-in user who may not list Workers, `mdk status` shows a running Kernel as up with
  the error under it and its Workers as `not checked`, rather than as down, and still exits `5`. `mdk sa list` prints
  `registrations not checked: <error>` and exits `1`, rather than reporting the Kernel down and exiting `0`
- `mdk add` detects a package's mock under an alternate name, not only `mock/server.js`
- The SATEC and Schneider power-meter mocks encode their registers on every read, and a mock transport drops open
  connections when it closes
- A mock accepts the plugin's device opts as its own
- The mock runner passes raw flags through npm's `--` unchanged, and a mock's CLI refuses a stray positional argument
  (`ERR_MOCK_CLI_POSITIONAL`) rather than ignoring it
- The Antspace and Bitdeer Workers allow the provisioning actions `registerThing`, `updateThing` and `forgetThings`
- The f2pool mock gives each transaction a unique id, with one row per UTC day
- The f2pool mock's random generators draw across their whole range: BTC payouts, the subsidy and fee split and pool
  balances no longer collapse onto the bottom of their range, and an integer draw no longer overruns its maximum
- A `LineChart` series flat at zero — an idle site's power, a pool with no blocks in the window — is banded above the
  axis floor instead of from -1.2 to 1.2, and `beginAtZero` now holds for it
- A `LineChartCard` timeline option marked `disabled` is greyed out and cannot be picked, rather than rendering and
  clicking like any other interval: the flag now reaches the card's range selector, as it already did the
  `TimelineSelector` dropdown
- The agent panel's failure notices name the product, from `AGENT_NAME`, rather than reading "the agent", so a rename
  reaches them too
- The date range picker's presets agree with the Period select, and a rolling preset reads as the whole days it covers
- Every month in the date picker is drawn six weeks high, so the calendar keeps one height from month to month
- The `Dialog` ✕ button has an accessible name, "Close", in every dialog
- Date picker weekday labels read "Su Mo Tu" rather than upper case, and the `DatePicker` month caption no longer runs
  under the navigation arrows
- The date range button takes the shared control background (`--mdk-control-bg`) rather than the popover's
- A large `Select` is 40px tall, like the date range button, `CurrencyToggler` and the secondary `Button` beside it,
  rather than 42px: the trigger is `box-sizing: border-box` and takes `--mdk-control-height-lg` whole (see Changed)
- A `CurrencyToggler`'s unselected options are muted (`--mdk-color-text-muted`): their color named a token nothing
  defined, so they took the page's text color. A disabled option is dimmer still, on the toggler's own surface
- Node 25's own `localStorage` no longer shadows the one in the test DOM: beside the worker flag in
  `ui/vitest.config.base.ts`, a shared `ui/vitest.setup.base.ts` restores it, and a package opts in through
  `setupFiles`, as `react-adapter`, `react-devkit` and `ui-agent` do
- `Pagination`'s page-size select is named "Items per page" for screen readers: the label sat on the Radix `Select`
  root, which renders no element, so the trigger button was announced unnamed
- The sidebar group toggle is 24px wide rather than 20px, meeting the 24×24px minimum target size of WCAG 2.2 SC 2.5.8

> For previous releases, see the [changelog archive](./docs/reference/changelog-archive/2026-archive.md)
