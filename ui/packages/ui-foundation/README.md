# @tetherto/mdk-ui-foundation

Framework-agnostic headless foundation for the MDK toolkit. Pure TypeScript — no React imports.
Consumed by framework adapters (`@tetherto/mdk-react-adapter`, future `@tetherto/mdk-vue-adapter`,
etc.) which bind these primitives to the host framework.

## Install

```bash
npm install @tetherto/mdk-ui-foundation
```

## Surface

### State

- **Zustand vanilla stores**: `authStore`, `devicesStore`, `notificationStore`, `timezoneStore` —
  each exported as a singleton and as a `create*Store` factory for test isolation

### Sessions

- **`AuthProvider`**: the seam that says how a session works (token source, sign-in, refresh, sign-out). `bearerTokenAuth()`
  and `noAuth()` ship here; the mining preset ships `gatewayRedirectAuth()`
- **`passwordAuth({ baseUrl })`**: user name and password against an MDK stack's Gateway, through the Kernel's token issuer.
  `signInWithPassword({ username, password })` calls `POST /auth/login`; the refresh token stays in the Gateway's httpOnly
  cookie, out of reach of page scripts. The provider renews the access token on a timer and when a request comes back 401 (pass
  its `fetcher` to `createMdkQueryClient`, or as `MdkProvider`'s `fetcher`), shares one renewal between concurrent 401s, and
  `restore()` brings a session back after a reload. `whoami()` reads `GET /auth/me`

```ts
const auth = passwordAuth({ baseUrl: '' })            // '' = relative URLs through the dev proxy
await auth.restore()                                  // before the first render
await auth.signInWithPassword({ username, password }) // on the sign-in page
```

### Data fetching

- **`createMdkQueryClient({ apiBaseUrl, auth })`**: the `@tanstack/query-core` `QueryClient` an app
  talks to its Gateway with — environment-aware base URL resolution (`VITE_MDK_API_URL`), an
  auth-aware fetcher, and a session that ends on a `401`
- **`getFetcher(client)` / `getApiBaseUrl(client)`**: read the client's authenticated fetcher and
  base URL, to call your Gateway routes with the session's token
- **`describeRequestError(error, url, { unreachableHint })`**: one operator-facing line for a failed
  request. The app's own `ERR_` message wins; otherwise it says nothing serves the route (404), the
  Gateway refused it (401/403) or nothing answered (5xx, followed by `unreachableHint`)

### Auth

- **Providers**: `gatewayRedirectAuth({ oauthBaseUrl })` — the Gateway's OAuth-redirect sign-in plus
  `POST /auth/token` refresh (`authTokenMutation`) on a 250 s cadence; `bearerTokenAuth()` for a
  Gateway-issued token you already hold; `noAuth()` for a Gateway without an auth plugin

### Device types and tags

[`utils/device-tags.ts`](./src/utils/device-tags.ts): `isMiner`, `isContainer`, `isAntminer`,
`isAvalon`, `isWhatsminer` (type-prefix predicates), and `appendIdToTag(s)`, `appendContainerToTag`,
`removeContainerPrefix` (the `id-` / `container-` search tags)

### Reporting periods

[`utils/period-utils.ts`](./src/utils/period-utils.ts): a period is a rolling preset (`PERIOD_PRESETS`, last
24 hours to year to date) or custom days, plus a `Granularity` (`hour`, `day`, `week`, `month`).
`periodRange(period, timezone)` gives its `[start, end)` in ms, with custom days as whole days in the site's
timezone; `allowedGranularities(ms)` the buckets that fit a range; `zonedDayStart` / `zonedDayOf` convert
between instants and `YYYY-MM-DD` days in a timezone. `usePeriod` in `@tetherto/mdk-react-adapter` keeps
a period in the URL

### Downloads

[`utils/download-utils.ts`](./src/utils/download-utils.ts): `toCsv(rows, columns?)` writes rows of objects as
CSV (quoting cells per RFC 4180), and `downloadCsv`, `downloadJson` and `downloadText` save a file through the
browser. They back the devkit's `ExportButton`

### API types

[`types/api-mining.types.ts`](./src/types/api-mining.types.ts) carries the shared data contracts:

- Telemetry rows: `TailLogEntry`, `PowerModeTimelineEntry`, `AlertSeverity`
- Layouts: `Rack`
- Auth: `AuthTokenRequest`, `AuthTokenResponse`
- Error class: `MdkFetchError`

Additional type modules: [`types/settings.types.ts`](./src/types/settings.types.ts), [`types/chart.types.ts`](./src/types/chart.types.ts).

## Subpath exports

| Subpath              | Purpose                                                                                |
| -------------------- | --------------------------------------------------------------------------------------- |
| `.`                  | Top-level barrel                                                                       |
| `./store`            | Zustand vanilla stores                                                                 |
| `./query`            | `createMdkQueryClient` and the client's base URL / fetcher readers                    |
| `./types`            | Shared type contracts                                                                  |
| `./stores.json`      | Machine-readable store + query-helper manifest (generated at build time)              |

## Build strategy

Fully pre-built: TypeScript → ESM JS + `.d.ts` declarations under `dist/`. Consuming framework
adapters import the compiled output.
