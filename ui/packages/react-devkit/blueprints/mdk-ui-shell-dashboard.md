---
id: mdk-ui-shell-dashboard
title: MDK UI Shell Dashboard
intent: >
  Sign-in-gated operations dashboard with live hashrate, consumption,
  power-mode timeline, and an active-incidents strip. The smallest
  end-to-end runnable example of MDK in production use — built entirely
  from foundation components and adapter hooks, no Ant Design, no custom
  data fetching.
domain: mining-operations
orkCapabilities:
  - hashrate-monitoring
  - power-consumption
  - power-mode-tracking
  - incident-alerts
components:
  - SiteStatsBar
  - TimelineSelector
  - LineChartCard
  - PowerModeTimelineChart
  - ActiveIncidentsCard
  - MiningPoolsPanel
  - RequireAuth
  - SignInGoogleButton
hooks: []
demoRoute: /dashboard
---

## When to use

Pick this blueprint when the user wants a *complete*, sign-in-gated,
single-site operator dashboard against the App Node backend — the
smallest runnable demonstration of MDK end-to-end. The output is a
~70-line `Dashboard.tsx` with one hook per chart and no inline data
transformations.

Scaffold this app directly with:

```bash
mdk-ui create my-dashboard --template mdk-ui-shell
```

## Local setup (backend + frontend)

The dashboard talks to [`miningos-app-node`](https://github.com/tetherto/miningos-app-node)
over the Vite dev proxy. Both sides must be running for sign-in to
succeed.

```bash
# 1. Backend (one-time setup — needs a Google OAuth client)
git clone https://github.com/tetherto/miningos-app-node.git
cd miningos-app-node
./setup-config.sh
#   ↳ paste a Google OAuth client id + secret into
#     config/facs/httpd-oauth2.config.json, then add your Google email
#     under `h0.users`.
npm install
npm start                          # http://localhost:3000

# 2. Frontend (the app you just scaffolded)
cd my-dashboard
cp .env.example .env               # already points at http://localhost:3000
npm install
npm run dev                        # http://localhost:3030
```

The full walkthrough — Google Cloud client creation, the
`httpd-oauth2.config.json` edits, the Vite proxy routes, and common
errors — lives in
[`docs/AGENT_FIRST.md`](../../../docs/AGENT_FIRST.md).
The scaffolded app's own `README.md` carries the same TL;DR.

## Page composition

```tsx
import {
  useActiveIncidents,
  useDashboardTimeRange,
  useHashrateChartData,
  usePoolRows,
  usePowerModeTimelineData,
  useSiteConsumptionChartData,
  useTimezone,
} from "@tetherto/mdk-react-adapter";
import {
  ActiveIncidentsCard,
  LineChartCard,
  MiningPoolsPanel,
  PowerModeTimelineChart,
  SiteStatsBar,
  TimelineSelector,
} from "@tetherto/mdk-react-devkit";

export default function Dashboard() {
  const { timeline, setTimeline, options, start, end } = useDashboardTimeRange();
  const { timezone } = useTimezone();

  const hashrate = useHashrateChartData({ timeline, start, end });
  const consumption = useSiteConsumptionChartData({ timeline, start, end });
  const powerMode = usePowerModeTimelineData({ timeline });
  const incidents = useActiveIncidents();
  const pools = usePoolRows();

  return (
    <div className="dashboard">
      <SiteStatsBar title="Site overview" isLoading={hashrate.isLoading} />
      <TimelineSelector value={timeline} onChange={setTimeline} options={options} />
      <LineChartCard title="Hash rate" data={hashrate.data} isLoading={hashrate.isLoading} />
      <LineChartCard title="Power consumption" data={consumption.data} isLoading={consumption.isLoading} />
      <PowerModeTimelineChart data={powerMode.data} isLoading={powerMode.isLoading} timezone={timezone} title="Power mode" />
      <ActiveIncidentsCard items={incidents.data ?? []} isLoading={incidents.isLoading} emptyMessage="No active incidents" />
      <MiningPoolsPanel rows={pools.rows} isLoading={pools.isLoading} />
    </div>
  );
}
```

## State / data flow

- Wrap the app once in `<MdkProvider apiBaseUrl={import.meta.env.VITE_API_BASE_URL}>`.
- All requests use `Authorization: Bearer <token>`. The token lives in
  `authStore` (`@tetherto/mdk-ui-core`). `useAuthToken` writes it after the
  Google OAuth callback; `useTokenPolling` refreshes it every 250 s and
  clears it on a 401 / 500.
- Each chart hook is one `useQuery` against `/auth/tail-log` with the
  appropriate `aggrFields`. The `select` projection unwraps the nested
  array — components never see raw HTTP shapes.
- `useActiveIncidents` polls `/auth/list-things?query={"last.alerts":{"$ne":null}}`
  every 20 s (matches Moria production cadence).
- The whole authenticated tree sits inside `<RequireAuth fallback={<Navigate to="/signin" />}>`,
  so adding a new route is automatically auth-gated.

## Common variations

- **Microsoft OAuth**: add a `SignInMicrosoftButton` foundation component
  and a second `<button>` on the SignIn page. Backend needs the matching
  `h1` block in `httpd-oauth2.config.json`.
- **Multi-site**: not in scope for v1. Use the
  `mining-operations-dashboard` blueprint when you need pool + device
  explorer + multi-site.
- **No active alerts endpoint**: drop `<ActiveIncidentsCard>` entirely.
  The hook is opt-in.
