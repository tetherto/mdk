# MDK UI shell

This example provides a bare application shell built with MDK. It ships the **backbone** so a
fresh app is wired end to end:

- **Google OAuth sign-in** — the `/signin` page and the token lifecycle
  (`useTokenPolling`, `RequireAuth`).
- **App frame** — header (logo + user/timezone/sign-out menu) and sidebar.
- **A Home landing page** — a placeholder that confirms auth + the frame work.

**No example pages** ship out of the box. Add your own (see
[Adding a new page](#adding-a-new-page)); a page reads its data from your
Gateway app's routes and passes it into devkit components as props.

Everything you add respects the same boundaries this shell does: **API/state in
`@tetherto/mdk-ui-foundation`, hooks in `@tetherto/mdk-react-adapter`,
components in `@tetherto/mdk-react-devkit`**.

## Quickstart

> [!NOTE]
> [`mdk create dashboard`](../../packages/cli/README.md) performs step 2 below automatically, including the `.env` values.
> `mdk run dashboard` then starts it. The manual steps here are for working on this template directly.

```bash
# 1. Backend: configure and start (one-time). The Gateway ships in the MDK
#    repo, so run this from your MDK checkout — not from this app.
cd <mdk-repo>/backend/core/gateway
./setup-config.sh
#  ↳ Google sign-in needs an identity app, which MDK does not ship
#    (see "Google OAuth setup" below).
npm install
npm start          # serves on http://localhost:3000

# 2. Frontend (this app)
cp .env.example .env   # already points at http://localhost:3000
npm install
npm run dev        # serves on http://localhost:3030
```

Then open `http://localhost:3030` and click **Sign in with Google**.

## Password sign-in (MDK stacks)

An MDK stack's Gateway signs users in itself: `POST /auth/login` checks a user name and password against the Kernel's token
issuer, and every app route then needs the access token and a `spec.rbac` rule. Set `VITE_AUTH_MODE=password` (`mdk create
dashboard` does) and the sign-in page shows a password form instead of the Google button. Create a user with
`mdk user add <name>`, and bind it to a role in `mdk.yaml`.

[`src/auth.ts`](./src/auth.ts) builds the session with `passwordAuth()` from `@tetherto/mdk-ui-foundation`. The access token
is short-lived and renewed silently; the refresh token stays in the Gateway's httpOnly cookie, out of reach of page scripts,
and a reload restores the session before the router's guard runs.

## Google OAuth setup

**MDK ships no OAuth implementation.** The Gateway has no API of its own and serves
only the apps a stack declares, so sign-in is something you supply as an app
(`mdk create app <name>`, declared under `spec.apps` with `mount: /` so its routes sit at the Gateway root). See
[`docs/guides/gateway/apps.md`](../../docs/guides/gateway/apps.md) in the MDK repo for the manifests and
controller contract.

This app needs that identity app to honour two ends of a redirect:

- a **start endpoint** at `${VITE_OAUTH_BASE_URL}/oauth/google`, which the
  sign-in button navigates to;
- a **return redirect** to `http://localhost:3030/?authToken=<jwt>` (the
  frontend port set in [`vite.config.ts`](./vite.config.ts)).

You also need a Google OAuth 2.0 client:

1. Open <https://console.cloud.google.com/apis/credentials> → "Create
   credentials" → "OAuth client ID" → "Web application".
2. Add an **authorised redirect URI** — the callback URL your identity app serves.
   The conventional one is `http://localhost:3000/oauth/google/callback`.
3. Hand the client id and secret to your identity app, and allow your own Google
   account so it grants you a session.

## Environment variables

`cp .env.example .env` to start; the file is already wired for local
development against the MDK Gateway on `localhost:3000`.

| Variable               | Required | Dev default                | What it controls                                                                                                                                                                                                                                            |
| ---------------------- | -------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_MDK_API_URL`     | no       | *(empty)*                  | Base URL for authenticated XHRs (`/auth/*`, `/api/*`). Leave empty in dev — Vite's proxy keeps requests same-origin. Set this **only** when the production frontend lives on a different origin than the backend and no reverse proxy sits between them.   |
| `VITE_OAUTH_BASE_URL`  | yes      | `http://localhost:3000`    | Absolute base URL of the OAuth issuer (e.g. `http://localhost:3000` in dev, `https://api.your-site.com` in prod). Used by the Sign-In button, which issues a top-level navigation that the Vite proxy cannot rewrite — so this must always be absolute.    |
| `VITE_GATEWAY_URL`     | no       | `http://localhost:3000`    | Gateway URL the Vite dev server proxies `/auth`, `/oauth`, `/api` and `/pub` to. `mdk create dashboard` sets this from your stack's `mdk.yaml` gateway port; defaults to the mvp-site gateway (`:3000`) when unset.                                        |
| `VITE_AUTH_MODE`       | no       | `oauth`                    | `password` for an MDK stack's Gateway (user name and password), `oauth` for the Google redirect. `mdk create dashboard` sets `password`. |
| `VITE_AUTH_BYPASS`     | no       | `true`                     | Dev-only auth bypass. `true` skips the `/signin` gate and lands straight on the dashboard with a stub session (no OAuth backend needed) and disables token-refresh polling. Set to `false` (or delete) once auth is wired up. **Never enable in production.** |

`VITE_API_BASE_URL` is the former name of `VITE_MDK_API_URL`. It is still
read, with a one-time console warning, and stops being read in the next
major — the `VITE_MDK_` prefix keeps it from colliding with your own app's
API URL.

`VITE_MDK_API_URL`, `VITE_OAUTH_BASE_URL`, `VITE_AUTH_MODE` and `VITE_AUTH_BYPASS` are read through [`src/constants/env.ts`](./src/constants/env.ts);
reach for that file (don't sprinkle raw `import.meta.env` lookups across the app) when adding new ones. The
accompanying [`src/vite-env.d.ts`](./src/vite-env.d.ts) declares the typed shape, so missing/misnamed variables
surface as type errors. `VITE_GATEWAY_URL` is a config-time-only variable read directly in
[`vite.config.ts`](./vite.config.ts) (it configures the dev-server proxy itself), so it isn't part of that runtime
`import.meta.env` shape.

## Known limitation: no data without miners

This only applies once you add a data-backed page; the template itself ships only a static Home page.
The MDK Gateway is the *API surface*, not the data source. It
expects Kernel clusters with real miners reporting in. **Without that, the
charts render empty states.** This is the expected first-run experience
for a community demo — the pages are honest about no data being available.

To exercise those pages against simulated data, run the backend's integration
test harness or wire up a mock Kernel; both are out of scope for this template.

## Project layout

```text
src/
  main.tsx               React entrypoint, wraps app in <MdkProvider>
  layers.css             The CSS layer order; imported first in main.tsx
  App.tsx                Authenticated shell: topbar + sidebar + <Outlet/>
                         Hosts useTokenPolling() at the top of the tree.
  router.tsx             Router config — /signin is public, everything else
                         is wrapped in <RequireAuth>.
  routes.ts              Feature pages live here. Ships empty.
  constants/
    env.ts               Typed import.meta.env accessors
    routes.ts            Route path literals
    navigation.tsx       Sidebar nav-icon lookup, keyed by route path
  components/
    PageLayout.tsx       Shared page header + content wrapper
  pages/
    SignIn.tsx           Google OAuth landing — <SignInGoogleButton/>
    Home.tsx             The bare landing page (replace once you add pages)
    NotFound.tsx
```

See [Adding a new page](#adding-a-new-page) below and [`USAGE.md`](./USAGE.md)
for the composition rules pages should follow.

## Adding a new page

Three steps:

1. **Add the component** under [`src/pages/`](./src/pages/), following the
   composition rules in [`USAGE.md`](./USAGE.md).
2. **Register the route** — append a single-line entry to
   [`src/routes.ts`](./src/routes.ts), above the `// mdk:routes-end` marker:

   ```text
   export const ROUTES: AppRoute[] = [
     { path: '/dashboard', label: 'Dashboard', page: () => import('./pages/Dashboard') },
     // mdk:routes-end
   ]
   ```

3. **Add the nav icon** — import it above `// mdk:nav-icons-end` and add a
   `NAV_ICONS` entry above `// mdk:nav-end` in
   [`src/constants/navigation.tsx`](./src/constants/navigation.tsx). Skip this
   and the page still routes; it just gets the fallback icon.

The sidebar is derived from `ROUTES`, so it updates automatically. New pages are
auth-gated by default because they live inside the `<RequireAuth>` wrapper
applied in [`src/router.tsx`](./src/router.tsx). To remove a page, delete its
file and reverse steps 2 and 3.

## Installed apps

Apps installed on the stack (`spec.apps` in `mdk.yaml`) appear in the shell without any change to it, and finding
them needs no Gateway:

1. `mdk run dashboard` reads `spec.apps` from `mdk.yaml`, resolves each app's package and reads its `mdk-app.yaml`.
   It hands the list to this dev server in the `MDK_DASHBOARD_APPS` environment variable.
2. [`vite/mdk-installed-apps.ts`](vite/mdk-installed-apps.ts) serves each app's built `ui/` at `/app-ui/<name>/` and
   lists the apps at `/app-ui.json`, both from the shell's own origin. `vite build` copies both into `dist/`.
3. On load the shell reads `/app-ui.json`, imports each app's `ui/index.js`, and adds what it exports.

Installing or removing an app means restarting `mdk run dashboard`, or rebuilding for production. A plain
`npm run dev` (no `MDK_DASHBOARD_APPS`) loads no apps. What an app exports:

- **Pages** (`routes`) are mounted under `/app/<name>/…` and listed in the sidebar. The prefix is `/app`, not
  `/apps`, because `/apps/<name>/` is the Gateway's: it forwards those paths to the app's own routes.
- **Panels** (`panels` with `slot: 'home'`) are rendered on Home.
- **Sections** (`section` on a route, plus an optional `sections` list) group an app's pages in the sidebar.

Each route takes these fields:

| Field       | Effect                                                                                                    |
| ----------- | --------------------------------------------------------------------------------------------------------- |
| `path`      | Path under `/app/<name>/`. `''` is the app's landing page; a path with `:param` or `*` is routed but not listed |
| `label`     | Sidebar label. Defaults to the app's `displayName` for the landing page, else to `path`                   |
| `hidden`    | Routed but kept out of the sidebar, for a deep link reached from another page                             |
| `section`   | Sidebar section the page is listed under, e.g. `'Operations'`                                             |
| `component` | The page, rendered inside the app's `MdkAppProvider` and an error boundary                                |

The sidebar lists an app with one page as a single entry and an app with several as a group named after the app. Pages
that share a `section` form a nested group, in the order each section first appears; pages without one sit directly in
the app's group. When the app is the only one installed and uses sections, its sections are top-level entries instead.

A section needs no declaration to work. To give one an icon, list it in `sections` with a React component; the
section's pages then carry no icon of their own:

```tsx
import { defineMdkApp } from '@tetherto/mdk-react-adapter'
import { FinancialsNavIcon, OperationsNavIcon } from '@tetherto/mdk-react-devkit'

export default defineMdkApp({
  id: 'io.tether.reporting-tool-lite',
  displayName: 'Reporting Tool Lite',
  routes: [
    { path: '', label: 'Dashboard', section: 'Operations', component: DashboardPage },
    { path: 'cost-input', label: 'Cost Input', section: 'Financials', component: CostInputPage },
  ],
  sections: [
    { label: 'Operations', icon: OperationsNavIcon },
    { label: 'Financials', icon: FinancialsNavIcon },
  ],
  panels: [],
})
```

`mdk validate app` and the shell reject a `section` that is empty or not a string, and in `sections` a missing label,
two sections with the same label, or an `icon` that is not a React component.

Each app renders inside its own error boundary and `MdkAppProvider`. An app that fails to load is listed on Home and
does not affect the others. The code is in `src/apps/`: [`InstalledAppPage.tsx`](src/apps/InstalledAppPage.tsx) mounts an app's pages, [`AppPanels.tsx`](src/apps/AppPanels.tsx) renders its Home panels and load errors, and [`paths.ts`](src/apps/paths.ts) builds the `/app/<name>/…` paths and sidebar items.

An app's UI is a plain ES module that imports React and the MDK packages by bare specifier. The shell maps those
specifiers to its own instances through an import map written by
[`vite/mdk-shared-modules.ts`](vite/mdk-shared-modules.ts), so an app ships no React of its own. To build one, leave
the shared modules external:

```ts
// the app's vite.config.ts — builds ui-src/index.tsx to ui/index.js (+ ui/style.css)
import { MDK_APP_SHARED_MODULES } from '@tetherto/mdk-ui-foundation/app-shared-modules'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    outDir: 'ui',
    lib: { entry: 'ui-src/index.tsx', formats: ['es'], fileName: () => 'index.js', cssFileName: 'style' },
    rollupOptions: { external: [...MDK_APP_SHARED_MODULES] },
  },
})
```

The entry default-exports `defineMdkApp({ id, displayName, routes, panels, sections })` from
`@tetherto/mdk-react-adapter`; `sections` is optional.
Inside an app, `useMdkApp().apiUrl('/status')` gives the URL of the app's own route under the name it was installed
as.

## Troubleshooting

- **OAuth redirect lands at `localhost:3030` but the dashboard bounces back
  to `/signin`**: the backend issued a token but the FE rejected it.
  Inspect `Authorization: Bearer …` headers on the network tab — if every
  request is 401, the backend isn't recognising the token (check the
  backend's auth-cache TTL and its allowed-users list).
- **OAuth redirect lands at a wrong URL**: the redirect your identity app
  sends the token to doesn't match the FE port. The expected value is
  `http://localhost:3030` and the FE defaults to port 3030 — keep them aligned.
- **CORS errors**: the backend has no CORS plugin; you must use the Vite
  proxy. [`vite.config.ts`](./vite.config.ts) already proxies `/auth`, `/oauth`, `/api`, and
  `/pub` to `http://localhost:3000`. Do not call the backend directly from
  the FE.
- **Empty charts**: see "Known limitation" above. The backend is up but no
  miners are reporting in.

## Architecture rules

Read [`USAGE.md`](./USAGE.md) before extending this template. The composition rules
(which package owns which concern) matter — breaking them is the easiest
way to make the dashboard hard to maintain.

**Separation of concerns — the rule that holds everything together:**

- **Components render data; nothing else.** No `useQuery`, no `fetch`,
  no unit conversions, no `useMemo` that shapes telemetry inside JSX.
- **App hooks (`src/hooks/`)** own the fetch + shape + format pipeline
  for your Gateway routes: `useQuery` from `@tetherto/mdk-react-adapter`,
  with `select` returning chart-ready / table-ready payloads
  (e.g. `ChartCardData`).
- **Shared state lives in `@tetherto/mdk-ui-foundation`** — Zustand
  stores, auth, the query client, type contracts.
- **Pages are thin glue** — read hooks, pass output to components.

If you see a tag string (`t-miner`, `t-powermeter`) or an aggregate
field (`power_w_sum_aggr`, `site_power_w`) outside the data layer —
or a page building `ChartCardData` inline in its JSX — stop and refactor.
Map the route's response to `ChartCardData` in the query's `select` and pass
it to `<LineChartCard>`.
