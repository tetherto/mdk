# MDK UI Shell Template — Assembly Contract

Read this before modifying anything. The composition rules below are the
*reason* the template stays small (≈ 70-line Dashboard, no business
logic) — break them and you'll end up with a wad of mid-tier code that
duplicates what already lives in the MDK packages.

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
│   useHashrateChartData, useConsumptionChartData,        │
│   usePowerModeTimelineData, useActiveIncidents,         │
│   useDashboardTimeRange, useTimezone, useAuth.          │
└────────────┬────────────────────────────────────────────┘
             │ imports
             ▼
┌─────────────────────────────────────────────────────────┐
│ @tetherto/mdk-ui-foundation                                   │
│   API contracts, query factories, mappers, Zustand      │
│   stores. No React.                                     │
└─────────────────────────────────────────────────────────┘
```

**The template owns**: route configuration, app shell layout (sidebar /
topbar), the SignIn / Dashboard / NotFound pages, env-var reading.

**The template does NOT own**: HTTP calls, auth flow logic, data-shape
transformations, chart components, store state. Anything in those
categories must come from the MDK packages — if a needed piece doesn't
exist, **add it to the appropriate package**, not the template.

## Data hooks ↔ chart components

| Hook                          | Returns                       | Pairs with                |
| ----------------------------- | ----------------------------- | ------------------------- |
| `useHashrateChartData`        | `ChartCardData`               | `<LineChartCard>`         |
| `useSiteConsumptionChartData` | `ChartCardData`               | `<LineChartCard>`         |
| `usePowerModeTimelineData`    | `PowerModeTimelineEntry[]`    | `<PowerModeTimelineChart>`|
| `useActiveIncidents`          | `IncidentRow[]`               | `<ActiveIncidentsCard>`   |
| `usePoolRows`                 | `MiningPoolRow[]`             | `<MiningPoolsPanel>`      |

Each hook fans out the TanStack `useQuery` calls against the Gateway
backend and returns presentation-ready data. The dashboard chart hooks
emit a shared `ChartCardData` payload (datasets + min/max/avg footer +
formatters) consumed verbatim by `<LineChartCard>`. **MDK UI Shell never
reshapes data inline** — that's the hook's job.

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
                                                  ▼    renders Dashboard
                                         ┌─────────────────┐
                                         │  /dashboard     │
                                         └─────────────────┘
              ┌──────────────────────────────────────────┐
              │ 7. useTokenPolling refreshes every 250 s │
              │    via POST /auth/token. On 401/500 it   │
              │    clears authStore and triggers         │
              │    onSessionEnded → navigate('/signin'). │
              └──────────────────────────────────────────┘
```

To add a second OAuth provider (e.g. Microsoft):

<!-- todo: update miningos-gateway reference -->
1. Configure the provider in
   `miningos-gateway/config/facs/httpd-oauth2.config.json` (`h1` block).
2. Add a `SignInMicrosoftButton` in the foundation package, mirroring
   `SignInGoogleButton`. Do **not** inline the OAuth redirect in the
   template — put it in `@tetherto/mdk-react-devkit` so other apps can
   reuse it.

## Forbidden moves

| Don't                                                  | Do instead                                                   |
| ------------------------------------------------------ | ------------------------------------------------------------ |
| Call `fetch('/auth/...')` from a component             | Use one of the data hooks; add a new one if missing.         |
| Define a Zustand store inside the template             | Use `authStore` / `devicesStore` / etc. from `ui-foundation`.      |
| Import `@tanstack/react-query` directly                | Use the re-exports from `@tetherto/mdk-react-adapter`.       |
| Hard-code a base URL                                   | Read from `import.meta.env.VITE_*` via `src/constants/env`.  |
| Transform a chart response inline in `Dashboard.tsx`   | Put the transform in the hook's `select`; if reusable, in `ui-foundation/utils`. |
| Import Ant Design / MUI / Bootstrap                    | Use `@tetherto/mdk-react-devkit` primitives + foundation.    |
| Add a route directly to `router.tsx`                   | Use `mdk-ui add page` — it appends to `routes.ts`.           |

## Extending: add a new chart card

1. Pick / add a chart component in
   `packages/react-devkit/src/domain/components/dashboard/`.
2. Add a data hook in
   `packages/react-adapter/src/hooks/use-<thing>-chart-data.ts`. The hook
   uses `tailLogQuery(client, { ... })` with the right `aggrFields` and a
   `select` projection that returns the chart-ready shape.
3. In `pages/Dashboard.tsx`, call the hook and pass its `data` straight
   to the chart component. **No transformation between the two.**

If your transform looks like "more than two lines or used by ≥ 2 hooks",
lift it into `packages/ui-foundation/src/utils/` as a pure function.

## Blueprint reference

`mdk-ui blueprint mdk-ui-shell-dashboard` prints the recipe form of this
template. Use that to feed an LLM that's bootstrapping a similar
dashboard — it's the same composition rules in a shorter form.
