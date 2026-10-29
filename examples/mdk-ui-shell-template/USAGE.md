# MDK UI shell template — assembly contract

Read this before modifying anything. This template is a **bare backbone** —
auth + the app frame + a Home landing page, with no example feature pages.
You add feature pages yourself. The composition rules below are what keep
those pages small (data from your Gateway routes in, devkit components out,
no business logic) — break them and you'll end up with a wad of mid-tier code
that duplicates what already lives in the MDK packages.

## Composition rules

The template imports from three MDK packages and three only:

```
┌─────────────────────────────────────────────────────────┐
│ apps/<your-app>  (template — composition + glue only)   │
└────────────┬────────────────────────────────────────────┘
             │ imports
             ▼
┌─────────────────────────────────────────────────────────┐
│ @tetherto/mdk-react-devkit                              │
│   Visual components — chart cards, RequireAuth,         │
│   SignInGoogleButton, TimelineSelector, SiteStatsBar.   │
└────────────┬────────────────────────────────────────────┘
             │ imports
             ▼
┌─────────────────────────────────────────────────────────┐
│ @tetherto/mdk-react-adapter                             │
│   React hooks — useAuthToken, useTokenPolling,          │
│   useTimezone, useAuth, plus useQuery / useMutation     │
│   re-exported from TanStack Query.                      │
└────────────┬────────────────────────────────────────────┘
             │ imports
             ▼
┌─────────────────────────────────────────────────────────┐
│ @tetherto/mdk-ui-foundation                                   │
│   Auth, query client, mappers, Zustand stores.          │
│   No React.                                             │
└─────────────────────────────────────────────────────────┘
```

**The template owns**: route configuration, app shell layout (sidebar /
topbar), the SignIn / Home / NotFound pages, env-var reading, and the data
hooks for its own Gateway routes. Feature pages land in
[`src/pages/`](./src/pages/) and follow the same rules.

**The template does NOT own**: auth flow logic, chart components, store
state. Anything in those
categories must come from the MDK packages — if a needed piece doesn't
exist, **add it to the appropriate package**, not the template.

## The pattern every page should follow

Every page follows the same one-direction data flow: your Gateway app serves
a route, a small hook in the app reads it with `useQuery` and shapes the
response in `select`, and the page hands the result straight to a
presentational component.

| Layer | Responsibility |
| ----- | -------------- |
| Gateway app route | Serves the data (e.g. the mvp-site `site` app's `/site/overview`). |
| App hook (`src/hooks/`) | `useQuery` against the route; `select` returns the component's prop shape. |
| Page (`src/pages/`) | Thin glue — reads the hook, hands its output to a component. No `fetch`, no shaping. |
| Component (`@tetherto/mdk-react-devkit`) | Props in, markup out. |

```ts
// src/hooks/use-site-overview.ts
import { useMdkContext, useQuery } from '@tetherto/mdk-react-adapter'

export const useSiteOverview = () => {
  const { apiBaseUrl } = useMdkContext()
  return useQuery({
    queryKey: ['site', 'overview'],
    queryFn: () => fetch(`${apiBaseUrl}/site/overview`).then((r) => r.json()),
    refetchInterval: 10_000,
  })
}
```

## Payloads ↔ components

| Shape your hook returns       | Pairs with                 |
| ----------------------------- | -------------------------- |
| `ChartCardData`               | `<LineChartCard>`          |
| `PowerModeTimelineEntry[]`    | `<PowerModeTimelineChart>` |
| `IncidentRow[]`               | `<ActiveIncidentsCard>`    |
| `MiningPoolRow[]`             | `<MiningPoolsPanel>`       |

Build these shapes in the hook's `select`. **Pages never reshape data
inline.**

## Auth flow

```
┌──────────────┐ 1. click   ┌──────────────┐ 2. Google   ┌──────────┐
│ /signin      │──────────► │ /oauth/google│────────────►│  Google  │
│ <SignIn>     │            │ (backend)    │             └─────┬────┘
└──────────────┘            └──────────────┘                   │ 3. consent
                                                                │
              ┌─────────────────────────────────────────────────┘
              │ 4. backend redirects to:
              ▼   http://localhost:3030/?authToken=<jwt>
       ┌────────────┐ 5. useAuthToken    ┌─────────────────┐
       │ MDK UI Shell   │ extracts token,    │ authStore       │
       │ root URL   │──────────────────► │ token = <jwt>   │
       └────────────┘ cleans URL         └─────────────────┘
                                                  │
                                                  │ 6. RequireAuth
                                                  │    sees token,
                                                  ▼    renders Home
                                         ┌─────────────────┐
                                         │  /home          │
                                         └─────────────────┘
              ┌──────────────────────────────────────────┐
              │ 7. useTokenPolling refreshes every 250 s │
              │    via POST /auth/token. On 401/500 it   │
              │    clears authStore and triggers         │
              │    onSessionEnded → navigate('/signin'). │
              └──────────────────────────────────────────┘
```

To add a second OAuth provider (e.g. Microsoft):

1. Serve the second provider from your identity app: an
   `/oauth/microsoft` start endpoint that redirects back to the UI with
   `?authToken=`, mirroring the Google route. To implement OAuth in MDK
   [build an app](../../docs/guides/gateway/apps.md).
2. Add a `SignInMicrosoftButton` in the foundation package, mirroring
   `SignInGoogleButton`. Do **not** inline the OAuth redirect in the
   template — put it in `@tetherto/mdk-react-devkit` so other apps can
   reuse it.

## Forbidden moves

| Don't                                                  | Do instead                                                   |
| ------------------------------------------------------ | ------------------------------------------------------------ |
| Call `fetch(...)` inline in a component                | Wrap the Gateway route in a hook under `src/hooks/` (see above). |
| Define a Zustand store inside the template             | Use `authStore` / `devicesStore` / etc. from `ui-foundation`.      |
| Import `@tanstack/react-query` directly                | Use the re-exports from `@tetherto/mdk-react-adapter`.       |
| Hard-code a base URL                                   | Read from `import.meta.env.VITE_*` via [`src/constants/env`](./src/constants/env.ts).  |
| Transform a chart response inline in the page's JSX    | Put the transform in the query's `select`; if reusable, in [`ui-foundation/utils`](../../ui/packages/ui-foundation/src/utils/index.ts). |
| Import Ant Design / MUI / Bootstrap                    | Use `@tetherto/mdk-react-devkit` primitives + foundation.    |
| Add a route directly to [`router.tsx`](./src/router.tsx)                   | Append a one-line entry to [`routes.ts`](./src/routes.ts).                      |
| Show a raw `HTTP 404` / `error.message` as a page's error | Return `toQueryView(query, url)` from the hook (`@tetherto/mdk-react-adapter`): one line saying why. |
| Hold a report's date range in `useState`               | Keep it in the URL with `usePeriod(useSearchParams(), …)` and render `PeriodControl`. |
| Wrap your styles in `@layer app` from a file that loads before [`src/layers.css`](./src/layers.css) | Keep `layers.css` the first import in [`main.tsx`](./src/main.tsx). |

The one route in [`router.tsx`](./src/router.tsx) that is not from `routes.ts` is the catch-all `app/:appName/*` for
installed apps (below). It is a single route for every app, not a pattern to copy for your own pages.

## Installed apps

Apps installed on the stack (`spec.apps` in `mdk.yaml`) add their own pages and panels at runtime, so a page you write
never imports an app. `mdk run dashboard` hands the apps to
[`vite/mdk-installed-apps.ts`](./vite/mdk-installed-apps.ts), which serves each app's built UI and lists the apps at
`/app-ui.json`.

| Piece | Where |
| --- | --- |
| All apps' pages, under `/app/<name>/…` | The catch-all route in [`router.tsx`](./src/router.tsx) → [`src/apps/InstalledAppPage.tsx`](./src/apps/InstalledAppPage.tsx) |
| Sidebar entries for app pages (one group per app, a nested group per route `section` with the icon from the app's `sections`; a lone app's sections go top-level) | `appPageSidebarItems` in [`src/apps/paths.ts`](./src/apps/paths.ts), used by [`App.tsx`](./src/App.tsx) |
| The highlighted sidebar entry (the page's path, whatever its own query; an entry keyed by a query, like `/pools?view=sites`, while the URL has those params) | `sidebarActiveId` in [`src/sidebar-active-id.ts`](./src/sidebar-active-id.ts), used by [`App.tsx`](./src/App.tsx) |
| Panels on a shell page | `<AppPanels slot={MDK_APP_PANEL_SLOT.HOME} />` ([`src/apps/AppPanels.tsx`](./src/apps/AppPanels.tsx)), fed by `useInstalledAppPanels` |
| React and the MDK packages shared with apps | The import map from [`vite/mdk-shared-modules.ts`](./vite/mdk-shared-modules.ts) |

To show apps' panels on another page you own, render `<AppPanels slot="<your-slot>" />` there. Apps opt in by declaring
a panel with that `slot`.

## Extending: add a new chart card

(Assumes a chart page exists under `src/pages/`.)

1. Pick / add a chart component in
   [`packages/react-devkit/src/domain/components/dashboard/`](../../ui/packages/react-devkit/src/domain/components/dashboard/index.ts).
2. Expose the data from a route in your Gateway app (the
   [mvp-site](../mvp-site/README.md) `site` app serves `/site/overview` and
   `/site/history` this way).
3. In your page, read that route with `useQuery` from
   `@tetherto/mdk-react-adapter`, with a `select` projection that returns the
   chart-ready shape, and pass its `data` straight to the chart component.
   **No transformation between the two.**

If your transform looks like "more than two lines or used by ≥ 2 hooks",
lift it into [`packages/ui-foundation/src/utils/`](../../ui/packages/ui-foundation/src/utils/index.ts) as a pure function.
