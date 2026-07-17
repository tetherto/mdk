# {{appName}}

A minimalistic Operations Dashboard built with MDK. Signs in via Google
OAuth, reads live data from a local
[`mdk-gateway`](https://github.com/tetherto/mdk-prv/blob/release/0.5.0/backend/core/gateway/package.json) backend,
and renders four reusable widgets:

- **Site stats bar** — title + current power + hashrate / miner / container
  totals.
- **Hashrate line chart** — live, with selectable 1m / 5m / 30m / 3h / 1D
  timeline.
- **Consumption line chart** — same timeline range, same polling cadence.
- **Power-mode timeline** — per-miner mode/status segments.
- **Active incidents card** — alerts currently firing, refreshed every 20 s.

This template is the canonical reference composition for MDK consumers.
Anything more ambitious than this dashboard should still respect the same
boundaries: **API/state in `@tetherto/mdk-ui-foundation`, hooks in
`@tetherto/mdk-react-adapter`, components in `@tetherto/mdk-react-devkit`**.

## Quick start

```bash
# 1. Backend: clone, configure, start (one-time)
git clone https://github.com/tetherto/miningos-gateway.git
cd miningos-gateway
./setup-config.sh
#  ↳ open config/facs/httpd-oauth2.config.json and paste a real Google
#    OAuth client id + secret (see "Google OAuth setup" below).
npm install
npm start          # serves on http://localhost:3000

# 2. Frontend (this app)
cp .env.example .env   # already points at http://localhost:3000
npm install
npm run dev        # serves on http://localhost:3030
```

Then open `http://localhost:3030` and click **Sign in with Google**.

## Google OAuth setup

The backend needs a Google OAuth 2.0 client to authenticate users.

1. Open <https://console.cloud.google.com/apis/credentials> → "Create
   credentials" → "OAuth client ID" → "Web application".
2. Add an **authorised redirect URI**:
   `http://localhost:3000/oauth/google/callback`.
3. Copy the resulting client ID + secret into
   `miningos-gateway/config/facs/httpd-oauth2.config.json` under
   `h0.credentials.client.id` and `h0.credentials.client.secret`.
4. Make sure `h0.callbackUriUI` is `http://localhost:3030` (matches the
   frontend port set in `vite.config.ts`).
5. Add your Google email to the `users` array under `h0.users` so the
   backend grants you a session.

## Environment variables

`cp .env.example .env` to start; the file is already wired for local
development against `miningos-gateway` on `localhost:3000`.

| Variable               | Required | Dev default                | What it controls                                                                                                                                                                                                                                            |
| ---------------------- | -------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL`    | no       | *(empty)*                  | Base URL for authenticated XHRs (`/auth/*`, `/api/*`). Leave empty in dev — Vite's proxy keeps requests same-origin. Set this **only** when the production frontend lives on a different origin than the backend and no reverse proxy sits between them.   |
| `VITE_OAUTH_BASE_URL`  | yes      | `http://localhost:3000`    | Absolute base URL of the OAuth issuer (e.g. `http://localhost:3000` in dev, `https://api.your-site.com` in prod). Used by the Sign-In button, which issues a top-level navigation that the Vite proxy cannot rewrite — so this must always be absolute.    |

Both variables are read through `src/constants/env.ts`; reach for that
file (don't sprinkle raw `import.meta.env` lookups across the app) when
adding new ones. The accompanying `src/vite-env.d.ts` declares the
typed shape, so missing/misnamed variables surface as type errors.

## Known limitation: no data without miners

`miningos-gateway` is the *API surface*, not the data source. It expects
Kernel clusters with real miners reporting in. **Without that, the charts will
render empty states.** This is the expected first-run experience for a
community demo — the dashboard is honest about no data being available.

To exercise the dashboard against simulated data, run the backend's
integration test harness or wire up a mock Kernel; both are out of scope for
this template.

## Project layout

```
src/
  main.tsx               React entrypoint, wraps app in <MdkProvider>
  App.tsx                Authenticated shell: topbar + sidebar + <Outlet/>
                         Hosts useTokenPolling() at the top of the tree.
  router.tsx             Router config — /signin is public, everything else
                         is wrapped in <RequireAuth>.
  routes.ts              User-added pages live here (managed by
                         `mdk-ui add page`). Has the mdk:routes-end marker.
  constants/
    env.ts               Typed import.meta.env accessors
    routes.ts            Route path literals
  pages/
    SignIn.tsx           Google OAuth landing — <SignInGoogleButton/>
    Dashboard.tsx        The reference composition (≤ 70 lines)
    NotFound.tsx
```

## Adding a new page

```bash
npx mdk-ui add page Devices --component DeviceExplorer
```

This generates `src/pages/Devices.tsx` and appends an entry to
`src/routes.ts`. The sidebar updates automatically. New pages are
auth-gated by default because they live inside the `<RequireAuth>` wrapper
applied in `src/router.tsx`.

## Troubleshooting

- **OAuth redirect lands at `localhost:3030` but the dashboard bounces back
  to `/signin`**: the backend issued a token but the FE rejected it.
  Inspect `Authorization: Bearer …` headers on the network tab — if every
  request is 401, the backend isn't recognising the token (check the
  backend's auth-cache TTL and the configured `users` array).
- **OAuth redirect lands at a wrong URL**: `callbackUriUI` in the backend
  config doesn't match the FE port. The default is `http://localhost:3030`
  and the FE defaults to port 3030 — keep them aligned.
- **CORS errors**: the backend has no CORS plugin; you must use the Vite
  proxy. `vite.config.ts` already proxies `/auth`, `/oauth`, `/api`, and
  `/pub` to `http://localhost:3000`. Do not call the backend directly from
  the FE.
- **Empty charts**: see "Known limitation" above. The backend is up but no
  miners are reporting in.

## Architecture rules

Read `USAGE.md` before extending this template. The composition rules
(which package owns which concern) matter — breaking them is the easiest
way to make the dashboard hard to maintain.

**Separation of concerns — the rule that holds everything together:**

- **Components render data; nothing else.** No `useQuery`, no `fetch`,
  no unit conversions, no `useMemo` that shapes telemetry inside JSX.
- **Hooks (`@tetherto/mdk-react-adapter`)** own the fetch + shape +
  format pipeline. They return chart-ready / table-ready payloads
  (e.g. `ChartCardData`).
- **All API + state interaction lives in `@tetherto/mdk-ui-foundation`** —
  query factories, query keys, query-param builders, Zustand stores,
  type contracts.
- **Pages are thin glue** — read hooks, pass output to components.

If you see a tag string (`t-miner`, `t-powermeter`) or an aggregate
field (`power_w_sum_aggr`, `site_power_w`) outside the data layer —
or a page building `ChartCardData` by hand — stop and refactor. Use
`<LineChartCard>` + the adapter chart hooks
(`useHashrateChartData`, `useSiteConsumptionChartData`) instead.

## Agent context

`mdk-ui init` seeded:

- `.mdk/context.md` — repo conventions for the agent.
- `.cursor/rules/mdk.mdc` — Cursor rule.
