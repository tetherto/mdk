# @tetherto/mdk-react-adapter

React framework adapter for [`@tetherto/mdk-ui-foundation`](../ui-foundation/README.md). Binds
the Zustand vanilla stores and the TanStack `QueryClient` from the
headless core into React-native hooks.

## Install

```bash
npm install @tetherto/mdk-react-adapter
```

> [!NOTE]
> `react` and `react-dom` 19 are peer dependencies.

## Surface

- `<MdkProvider apiBaseUrl={...}>` — wraps `QueryClientProvider` from
  `@tanstack/react-query` and exposes the resolved API base URL via
  React context. Required at the app root.
- Store hooks: `useAuth`, `useDevices`, `useTimezone`,
  `useNotifications` — one per core store, implemented
  with `useStore(<vanillaStore>)` from `zustand`.
- Utility hooks: permissions (`useHasPerms`, `useCheckPerm`,
  `useIsFeatureEditingEnabled`), auth token lifecycle (`useAuthToken`,
  `useTokenPolling`), timezone formatting (`useTimezoneFormatter`), and UI
  helpers (`usePagination`, `useLocalStorage`, `useKeyDown`,
  `useWindowSize`, `useDeviceResolution`, `usePlatform`, `useBeepSound`,
  `useContextualModal`, `useSubtractedTime`, `useGetAvailableDevices`).
- Report state: `usePeriod`, a reporting period kept in the URL, and
  `toQueryView`, a query's state as loading, error or ready.
- Installed-app hooks: `useInstalledAppUis`, `useInstalledAppPanels`.
- Re-exports of `useQuery`, `useMutation`, `useQueryClient` from
  `@tanstack/react-query` so consumers can stay on a single import path.

## Authentication

`<MdkProvider auth={...}>` takes an `AuthProvider` (from [`@tetherto/mdk-ui-foundation`](../ui-foundation/README.md)) —
the seam `useMdkAuth()` reads back. Four are available:

- `noAuth()` — no token, no sign-in, nothing to expire; for an open API or a fixture-backed demo
- `bearerTokenAuth()` — bearer token in `authStore`, session ends on a `401`; `createMdkQueryClient`'s own default
  when no provider is passed
- `passwordAuth({ baseUrl })`: user name and password against an MDK stack's Gateway, through the Kernel's token
  issuer; the refresh token stays in an httpOnly cookie and tabs take turns refreshing it. The provider for an MDK
  stack, see [sessions](../ui-foundation/README.md#sessions)
- `gatewayRedirectAuth({ oauthBaseUrl })` — OAuth-redirect token capture, refresh polling,
  and role parsing against the Gateway; `MdkProvider`'s own default, minus `oauthBaseUrl`, so
  `signIn()` throws until one is supplied

> [!IMPORTANT]
> `gatewayRedirectAuth()` expects an OAuth flow MDK does not serve: its `refresh()` posts to `/auth/token`, which on an MDK
> Gateway is service-account sign-in (a signed assertion), and `/auth/userinfo` does not exist. Against an MDK stack use
> `passwordAuth()`. Keep `gatewayRedirectAuth()` for a backend of your own that serves those routes.

Hiding a write control in the UI is not authorization: the Gateway still denies a request the token is not allowed to
make, checking every app route against `spec.rbac`. Gate controls for UX; the policy is enforced at the Gateway and the Kernel.

## Reading your own data

The adapter ships no data hooks for specific endpoints. A page reads the routes
your [app](../../../docs/guides/gateway/apps.md) serves with
`useQuery`, shapes the response in `select`, and passes the result to a devkit
component as props:

```tsx
import { useMdkContext, useQuery } from '@tetherto/mdk-react-adapter'
import { LineChartCard } from '@tetherto/mdk-react-devkit'

const HashrateCard = () => {
  const { apiBaseUrl } = useMdkContext()
  const { data, isLoading } = useQuery({
    queryKey: ['site', 'history', 'hashrate'],
    queryFn: () => fetch(`${apiBaseUrl}/site/history?metric=hashrate`).then((r) => r.json()),
    select: toChartCardData, // your mapping from the route's shape to ChartCardData
  })
  return <LineChartCard title="Hashrate" data={data} isLoading={isLoading} />
}
```

The [mvp-site example](../../../examples/mvp-site/README.md) does this end to end against its `site` plugin.

### Loading, error and ready

`toQueryView(query, url, { unreachableHint })` turns a query into the one value a component switches on:
`{ status: 'loading' }`, `{ status: 'error', message }` or `{ status: 'ready', data }`. The message is
[`describeRequestError`](../ui-foundation/README.md#data-fetching)'s one line (nothing serves the route, the
Gateway refused it, nothing answered, or the app's own `ERR_` message). Placeholder data counts as ready, so
with `placeholderData: (previous) => previous` the last body stays on screen while the next one loads.

```ts
const useStatus = (): QueryView<Status> => {
  const { apiUrl } = useMdkApp()
  const url = apiUrl('/status')
  const query = useQuery({ queryKey: ['status', url], queryFn: () => fetchStatus(url) })
  return toQueryView(query, url, { unreachableHint: 'Start the stack with `mdk run`.' })
}
```

### A report's period

`usePeriod(useSearchParams(), timezone, { preset: '30d' })` keeps a reporting period in the URL
(`?range=&from=&to=&granularity=`), so a report can be linked to and survives a reload. It takes the
`[params, setParams]` pair react-router's `useSearchParams()` returns, so the adapter depends on no router.
Ask your route for `period.query` (`{ start, end, granularity }`) and render the devkit's `PeriodControl`
with the state. Rolling presets end now; re-render each minute to keep one rolling.

## Machine-readable hook manifest

Every hook is listed in [`dist/hooks.json`](./dist/hooks.json) (regenerated at build time). Agents
and tooling load it via the subpath export:

```js
import { hooks } from '@tetherto/mdk-react-adapter/hooks.json' with { type: 'json' }

hooks.map((h) => h.name)
hooks.filter((h) => h.category === 'permission')
```

## Subpath exports

| Subpath       | Purpose                                       |
| ------------- | --------------------------------------------- |
| `.`           | Top-level barrel                              |
| `./provider`  | `<MdkProvider>` + the `MdkContext` it powers  |
| `./hooks`     | Store hooks, utility hooks, TanStack re-exports |
| `./hooks.json` | Machine-readable hook manifest (generated at build time) |

## Build strategy

`tsc -p tsconfig.build.json` emits ESM JS + `.d.ts` declarations into
`dist/`, and the package `exports` map resolves there. External npm
consumers get pre-built declarations and runtime JS — no compile step
required on their end.
