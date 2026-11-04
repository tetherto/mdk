---
title: Build a minimal single-page dashboard
description: "[⏱️ ~15 min] From an empty directory to a running Kernel, Worker, app, Gateway, and MDK UI dashboard"
docs@tether_slug: tutorials/build-a-dashboard
---

> [!NOTE]
> If **Kernel**, **Worker**, or **Gateway** are unfamiliar terms, read [the architecture overview][architecture]
> first. The one Worker used here is the in-repo Avalon miner Worker (`backend/workers/miners/avalon`), run against its
> bundled mock device, so no hardware is needed.

This guide builds the smallest version of [the Starter site example][mvp-site] (`examples/mvp-site`): **one Worker, one Gateway route, one React page**. It
teaches the same end-to-end shape, including its UI layer, `@tetherto/mdk-react-devkit`
components driven by `@tetherto/mdk-react-adapter` hooks. However, it does so without that example's family-specific adapters,
persistence, history, commands, multi-page router, or chart aggregation.

> [!NOTE]
> This tutorial hand-assembles every piece to teach the wiring. To scaffold a real dashboard app against a stack you
> already have running, use [`mdk create dashboard` and `mdk run dashboard`](../reference/tooling/cli.md#mdk-create-dashboard-name) instead.

## Overview

This tutorial builds the smallest version of the full MDK stack: **one Worker, one Gateway route, one React page**.

What you'll have at the end:

```text
examples/minimal-dashboard/
  package.json
  start.js                     # boots Kernel + the one Worker + the app + Gateway, one process
  apps/
    dashboard/
      mdk-app.yaml              # app manifest
      mdk-plugin.json           # route table, one route: GET /overview
      lib/
        client.js               # the app's MDK client
      controllers/
        overview.js             # lists every Worker's devices + live telemetry
  ui/
    package.json
    tsconfig.json
    vite.config.ts
    index.html
    src/
      main.tsx                  # <MdkProvider> + render OverviewPage
      OverviewPage.tsx           # polls /overview, renders devkit components
```

No router, no charts, no hand-rolled CSS, just one page built from three
`@tetherto/mdk-react-devkit` primitives (`LabeledCard`, `DataTable`, `Badge`) and one
`@tetherto/mdk-react-adapter` hook (`useQuery`), the same building blocks [`examples/mvp-site/ui`][mvp-site-ui] uses, minus the
parts (router, sidebar, line charts, domain panels) this single-page, single-Worker dashboard doesn't need.

## Prerequisites

- Node.js `>=24`
- This repo checked out, with the backend and UI dependencies installed once from the repository root:

  ```bash
  npm install
  npm run setup:ui
  npm run build:ui
  ```

  Running `npm run setup` from the [Starter site example][mvp-site] (`examples/mvp-site`) is also supported, but it is
  broader: it installs these backend and UI dependencies plus the Starter site example and UI dependencies and builds the UI packages.
- Commands below assume you create a new `examples/minimal-dashboard/` directory alongside [`examples/mvp-site/`][mvp-site]
- [Outbound UDP to the HyperDHT bootstrap nodes][network-requirements]

<Steps>

<Step>

### Pick the Worker

Use the Avalon Worker as-is: `startAvalonWorker` boots its own Worker Runtime and provisioning store, and
`backend/workers/miners/avalon/mock/server` is a mock Avalon miner that speaks the same protocol as the real
hardware. Nothing in the steps below is specific to it, though: swap in one of
[the Starter site's Worker adapters][mvp-site-adapter] (`examples/mvp-site/backend/whatsminer-adapter.js` and its
siblings wrap the external miner plugins behind the same start-function shape; copy one into your project) or
your own Worker from [Build a third-party Worker][build-a-worker] and everything past the next step is unchanged.

</Step>

<Step>

### Boot Kernel and Worker in the same process

The simplest of the three [discovery modes][discovery-model]: one Node process owns both the Kernel and the Worker,
so there's no key file or DHT topic to manage.

`examples/minimal-dashboard/start.js`:

```js
'use strict'

const path = require('path')
const { getKernel, waitForDiscovery } = require('../../backend/core/mdk')
const { trustKernel } = require('../../backend/core/mdk/lib/local-discovery')
const { startAvalonWorker } = require('../../backend/workers/miners/avalon')
const avalonMock = require('../../backend/workers/miners/avalon/mock/server')

const ROOT = path.join(__dirname, '.mdk-data')
const MOCK_PORT = 4028
const HTTP_PORT = Number(process.env.MDK_HTTP_PORT) || 3000

async function main () {
  // the one mock device this dashboard will show, swap for real hardware later
  const mock = avalonMock.createServer({ host: '127.0.0.1', port: MOCK_PORT, type: 'a1346', serial: 'AV-0001' })
  await mock.ready

  // Kernel + the one Worker, same process
  const kernel = await getKernel({ root: ROOT })
  const { runtime, services } = await startAvalonWorker({
    workerId: 'avalon-1',
    model: 'a1346',
    storeDir: path.join(ROOT, 'avalon'),
    allowedKeys: [kernel.getClientPublicKey()],
    seedDevices: [{ info: { serialNum: 'AV-0001' }, opts: { address: '127.0.0.1', port: MOCK_PORT, password: 'admin' } }]
  })
  trustKernel(runtime, kernel)
  await kernel.registerWorker(runtime.getPublicKey())
  await waitForDiscovery(kernel, { minWorkers: 1 })

  const ids = services.provisioning.listDevices({ limit: 10 }).map((d) => d.id)
  console.log('worker registered: %s', ids.join(', '))
}

module.exports = { main, ROOT, HTTP_PORT }
if (require.main === module) main().catch((err) => { console.error(err); process.exit(1) })
```

`startAvalonWorker` owns the Worker Runtime, device provisioning, persistence, sampling, and shutdown; `seedDevices`
provisions the one mock miner on first boot. Workers are fail-closed: they answer only keys they were told to trust.
`allowedKeys` admits the Kernel's client key at boot, and `trustKernel(runtime, kernel)` keeps the Worker in step with
every key the Kernel admits later (the app's and the Gateway's, in Step 4).

`getKernel({ root: ROOT })` with no `topic`/`discovery` option defaults to DHT discovery, using the topic in
`~/.mdk/.dht-topic` when that file exists and a fresh random topic otherwise.
This example then registers the Worker's public key directly because both objects are in the same process. See the
[discovery model][workers-discovery] for the DHT, Local, and Same-process options to use in other deployments.

</Step>

<Step>

### Write the one app route

An [app][apps] is a directory with an app manifest, a route table and a controller. This one has a single read-only
route that lists every registered Worker's devices and pulls each one's default `metrics` telemetry bundle, with no
per-device-family branching, because there's only one family here.

#### 3.1 Write the app manifest

`examples/minimal-dashboard/apps/dashboard/mdk-app.yaml`:

```yaml
id: com.example.minimal-dashboard
version: 0.1.0
displayName: Minimal dashboard
permissions:
  - resources: [workers, devices]
    verbs: [list, read]
  - resources: [telemetry]
    verbs: [read]
```

`permissions` are what the app asks the operator to grant. In a CLI-run stack `mdk add app` and `mdk rbac init` turn them
into the app's role in `spec.rbac`; Step 4 writes the same role by hand, because this stack has no `mdk.yaml`.

#### 3.2 Write the route table

`examples/minimal-dashboard/apps/dashboard/mdk-plugin.json`:

```json
{
  "name": "@your-org/mdk-app-dashboard",
  "version": "0.1.0",
  "description": "Minimal dashboard app: one route that lists every registered device and its live telemetry.",
  "routes": [
    {
      "id": "dashboard.overview",
      "handler": "./controllers/overview.js",
      "http": { "method": "GET", "path": "/overview" },
      "description": "Live snapshot of every device across every registered Worker.",
      "safety": "read-only"
    }
  ]
}
```

#### 3.3 Write the controller

`examples/minimal-dashboard/apps/dashboard/lib/client.js` takes the app's Kernel client from the app runtime, which signs
it in as the app's service account:

```js
'use strict'

const { config } = require('@tetherto/mdk-gateway/plugin')

module.exports = config.mdkClient
```

`examples/minimal-dashboard/apps/dashboard/controllers/overview.js`:

```js
'use strict'

const mdkClient = require('../lib/client')

module.exports = async function overview (req) {
  const { workers } = await mdkClient.listWorkers()

  const devices = await Promise.all(
    workers.flatMap((w) => (w.deviceIds || []).map(async (deviceId) => {
      const tel = await mdkClient.pullTelemetry(deviceId, 'metrics')
      return { deviceId, workerId: w.workerId, workerState: w.state, ...((tel && tel.metrics) || {}) }
    }))
  )

  return { ts: Date.now(), devices }
}
```

A controller is `async (req) => value`: return a plain object, the Gateway serializes it to JSON itself; you never touch
`res`. `mdkClient` is the same client used everywhere else in MDK, with no knowledge of the underlying MDK Protocol
envelope required.

> [!NOTE]
> With more than one Worker family mixed in (miners, powermeters, sensors, ...) you'd branch by
> `deviceFamily` instead of spreading `tel.metrics` blindly. [The Starter site's overview controller][mvp-site-overview]
> shows that pattern once you outgrow this one.

</Step>

<Step>

### Serve the app and static page from the same Gateway

Add the app runtime and `startGateway` to `start.js`. `createAppRuntime()` runs the app's controllers and answers only the
Gateway's key; `startGateway()` mounts the app's route via `apps` (at `/`, because the page fetches `/overview` at the root)
and the built UI (Step 5's `ui/dist`) via `common.staticRootPath`. This is the complete canonical file; its boot order is mock,
Kernel, Worker, registration, readiness, app runtime, then Gateway:

```js
'use strict'

const fs = require('fs')
const path = require('path')
const { getKernel, startGateway, waitForDiscovery } = require('../../backend/core/mdk')
const { generateCredential } = require('../../backend/core/identity')
const { createAppRuntime } = require('../../backend/core/app-runtime')
const { trustKernel } = require('../../backend/core/mdk/lib/local-discovery')
const { startAvalonWorker } = require('../../backend/workers/miners/avalon')
const avalonMock = require('../../backend/workers/miners/avalon/mock/server')

const ROOT = path.join(__dirname, '.mdk-data')
const MOCK_PORT = 4028
const HTTP_PORT = Number(process.env.MDK_HTTP_PORT) || 3000
const PASSWORD = process.env.MDK_OPERATOR_PASSWORD || 'dashboard-demo'

async function main () {
  // Start the mock device before its Worker tries to connect.
  const mock = avalonMock.createServer({ host: '127.0.0.1', port: MOCK_PORT, type: 'a1346', serial: 'AV-0001' })
  await mock.ready

  // The app signs in to the Kernel as its own service account, `app:dashboard`. `mdk add app` writes this
  // credential file in a CLI-run stack; this script has no CLI, so it writes one itself.
  const appCredential = generateCredential()
  const credentialFile = path.join(ROOT, 'credentials', 'app-dashboard.json')
  fs.mkdirSync(path.dirname(credentialFile), { recursive: true, mode: 0o700 })
  fs.writeFileSync(
    credentialFile,
    JSON.stringify({ name: 'app:dashboard', privateKeyPem: appCredential.privateKeyPem }),
    { mode: 0o600 }
  )

  // Start Kernel, then the Avalon Worker, trusting the Kernel's keys. `rbac` is the policy an `mdk.yaml`
  // stack writes as `spec.rbac`: the app may read the fleet, and `operator` may call the one route.
  const kernel = await getKernel({
    root: ROOT,
    serviceAccounts: [{ name: 'app:dashboard', publicKey: appCredential.publicKey }],
    rbac: {
      enforcement: 'deny',
      roles: [
        {
          name: 'dashboard-app',
          rules: [
            { resources: ['workers'], verbs: ['list'] },
            { resources: ['devices'], verbs: ['read'] }
          ]
        },
        { name: 'dashboard-viewer', rules: [{ resources: ['dashboard/overview'], verbs: ['get'] }] }
      ],
      bindings: [
        { role: 'dashboard-app', subjects: [{ kind: 'ServiceAccount', name: 'app:dashboard' }] },
        { role: 'dashboard-viewer', subjects: [{ kind: 'User', name: 'operator' }] }
      ]
    }
  })

  // One operator to sign in as, the programmatic equivalent of `mdk user add operator`.
  await kernel.identity.upsertUser({ name: 'operator', password: PASSWORD })
  const { runtime, services } = await startAvalonWorker({
    workerId: 'avalon-1',
    model: 'a1346',
    storeDir: path.join(ROOT, 'avalon'),
    allowedKeys: [kernel.getClientPublicKey()],
    seedDevices: [{ info: { serialNum: 'AV-0001' }, opts: { address: '127.0.0.1', port: MOCK_PORT, password: 'admin' } }]
  })
  trustKernel(runtime, kernel)

  // Register the Worker and wait until it is ready before accepting HTTP traffic.
  await kernel.registerWorker(runtime.getPublicKey())
  await waitForDiscovery(kernel, { minWorkers: 1 })

  // Run the app; it accepts calls only from the Gateway's key and calls the Kernel with its own.
  const appDir = path.join(__dirname, 'apps', 'dashboard')
  const appKeyFile = path.join(ROOT, 'apps', 'dashboard.key')
  const gatewayKeyFile = path.join(ROOT, 'gateway.key')
  const app = createAppRuntime({
    name: 'dashboard',
    appDir,
    kernelKey: kernel.getPublicKey(),
    storeDir: path.join(ROOT, 'apps', 'dashboard'),
    keyFile: appKeyFile,
    credentialFile,
    allowedKeyFiles: [gatewayKeyFile]
  })
  await app.start()
  kernel.allowKey(app.getKernelPublicKey())

  await startGateway({
    kernel,
    port: HTTP_PORT,
    root: path.join(ROOT, 'gateway'),
    tmpdir: path.join(ROOT, 'gateway'),
    gatewayKeyFile,
    apps: [{ name: 'dashboard', appDir, keyFile: appKeyFile, mount: '/' }],
    common: { staticRootPath: path.join(__dirname, 'ui', 'dist') }
  })

  const ids = services.provisioning.listDevices({ limit: 10 }).map((d) => d.id)
  console.log('worker registered: %s', ids.join(', '))
  console.log(`dashboard up: http://localhost:${HTTP_PORT}/`)
}

module.exports = { main, ROOT, HTTP_PORT }
if (require.main === module) main().catch((err) => { console.error(err); process.exit(1) })
```

`startGateway({ kernel })` gives the Gateway an authority, so it serves `/auth/login` and checks every app route against the
policy above. `/overview` answers `401` without an access token and `403` for a caller no rule binds to
`dashboard/overview`, as [auth and permissions][apps-auth] sets out in full. The controller then reads the fleet as `app:dashboard`, which is why the app needs its own rules as
well as the operator's.

> [!WARNING]
> `dashboard-demo` is a password in a source file. On loopback, the browser keeps the refresh cookie over plain HTTP.
> On a network host, the Gateway marks it `Secure`, so the browser requires HTTPS to keep it. Keep this stack off
> untrusted networks. A production deployment needs TLS termination, network policy, and real credentials; write routes
> additionally need input validation, rate limits, and auditing.

> [!IMPORTANT]
> Serve the built page from `common.staticRootPath`, not a separate server on its own port. App
> controllers only receive `(req)`, never the underlying reply object, so a controller has no way to set
> `Access-Control-Allow-Origin`, and Gateway has no built-in CORS support. Building the UI (Step 5) and serving
> `ui/dist` from `staticRootPath` keeps `fetch('/overview')` same-origin with zero CORS configuration. This is also
> why [`examples/mvp-site`][mvp-site]'s Vite *dev* server proxies `/site/*` to the Gateway port instead of calling it
> cross-origin. Step 5's `vite.config.ts` proxies `/overview` the same way for hot-reload development.

</Step>

<Step>

### Write the single-page UI with MDK devkit components

Instead of hand-rolled HTML, the page is a small React + Vite app built from the same packages
[`examples/mvp-site/ui`][mvp-site-ui] uses, so `@tetherto/mdk-react-adapter` for the provider and data hook,
`@tetherto/mdk-ui-foundation` for the sign-in provider, `@tetherto/mdk-react-devkit`
for the components, scaled down to what one route needs: no router (one page), no charts (no history endpoint
here), no sidebar. Three primitives do the job: `LabeledCard` for the section container, `DataTable` for the sortable
device grid, and `Badge` to color-code `workerState`. That badge is the Worker's registry state, which says Kernel can route to the
Worker; it is not device liveness, so an unplugged miner still sits beside a green `ready`. A device's own `status` and the `{ error }`
on a telemetry channel are where its reachability shows.

`examples/minimal-dashboard/ui/package.json`:

```json
{
  "name": "@your-org/mdk-minimal-dashboard-ui",
  "type": "module",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build"
  },
  "dependencies": {
    "@tetherto/mdk-react-adapter": "file:../../../ui/packages/react-adapter",
    "@tetherto/mdk-react-devkit": "file:../../../ui/packages/react-devkit",
    "@tetherto/mdk-ui-foundation": "file:../../../ui/packages/ui-foundation",
    "react": "^19.2.0",
    "react-dom": "^19.2.0"
  },
  "devDependencies": {
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "^7.0.2",
    "vite": "^6.3.5"
  }
}
```

`examples/minimal-dashboard/ui/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src/**/*", "vite.config.ts"],
  "exclude": ["node_modules", "dist"]
}
```

`examples/minimal-dashboard/ui/vite.config.ts`: the dev-only proxy so `fetch('/overview')` and sign-in at `/auth/login`
both stay same-origin against the Gateway port, the same pattern
[`examples/mvp-site/ui/vite.config.ts`][mvp-site-vite-config] uses for `/site/*`:

```ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

declare const process: { env: Record<string, string | undefined> }

const apiPort = process.env.VITE_API_PORT || '3000'

export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.MDK_UI_PORT) || 3041,
    proxy: {
      '/overview': `http://localhost:${apiPort}`,
      // Sign-in and token refresh. The refresh cookie is scoped to /auth, so it must be same-origin too.
      '/auth': `http://localhost:${apiPort}`
    }
  }
})
```

`examples/minimal-dashboard/ui/index.html`:

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>MDK dashboard</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`examples/minimal-dashboard/ui/src/main.tsx`: `<MdkProvider>` wires the TanStack Query client `useQuery` needs and
resolves the API base URL, exactly as it does in [`examples/mvp-site/ui/src/main.tsx`][mvp-site-main-tsx]:

```tsx
import { MdkProvider, useAuthToken } from '@tetherto/mdk-react-adapter'
import { passwordAuth } from '@tetherto/mdk-ui-foundation'
import { StrictMode, useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'

import '@tetherto/mdk-react-devkit/styles.css'
import { OverviewPage } from './OverviewPage'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('ERR_ROOT_ELEMENT_MISSING')

// Same-origin: the Vite dev proxy forwards /overview and /auth/* to the gateway;
// in production the Gateway serves this build from staticRootPath.
const auth = passwordAuth({ baseUrl: '' })

function App() {
  const token = useAuthToken()
  const [restoring, setRestoring] = useState(true)
  const [error, setError] = useState('')

  // Wait for the refresh cookie check before showing the dashboard or sign-in form.
  useEffect(() => {
    let active = true
    void auth.restore().finally(() => { if (active) setRestoring(false) })
    return () => { active = false }
  }, [])

  if (restoring) return <p role="status">Restoring session…</p>
  if (token) return <OverviewPage />

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault()
        const form = new FormData(event.currentTarget)
        try {
          await auth.signInWithPassword({
            username: String(form.get('username')),
            password: String(form.get('password'))
          })
          setError('')
        } catch {
          setError('Sign-in failed')
        }
      }}
    >
      <input name="username" defaultValue="operator" aria-label="User name" />
      <input name="password" type="password" aria-label="Password" />
      <button type="submit">Sign in</button>
      {error ? <p role="alert">{error}</p> : null}
    </form>
  )
}

ReactDOM.createRoot(rootElement).render(
  <StrictMode>
    <MdkProvider apiBaseUrl="" auth={auth} fetcher={auth.fetcher}>
      <App />
    </MdkProvider>
  </StrictMode>
)
```

`passwordAuth({ baseUrl })` signs in at the Gateway's `POST /auth/login` and keeps the refresh token in the Gateway's
httpOnly cookie, out of reach of page scripts. Pass its `fetcher` to `MdkProvider`, then use `getFetcher(useQueryClient())`
in custom queries and mutations to renew the access token and retry when a request comes back `401`.
`MdkProvider` stores this transport; it does not replace an explicit `queryFn` or start token-refresh polling.
`useAuthToken()` subscribes to the shared token store, so a failed refresh or a final `401` clears the session and shows
the sign-in form. The loading state waits for session restoration before rendering either screen.
The [react-adapter auth presets][react-adapter-auth] cover the other providers:
`bearerTokenAuth()` for a token you already hold, `gatewayRedirectAuth({ oauthBaseUrl })` for a backend of your own
that serves an OAuth redirect flow (an MDK Gateway does not), and `noAuth()` for a fixture-backed demo, since every
app route on a real stack answers `401`.

Create `ui/src/OverviewPage.tsx` under your new `examples/minimal-dashboard/`: `useQuery` polls the route from Step 3 the same way
[`examples/mvp-site/ui/src/SitePage.tsx`][mvp-site-page] polls `/site/overview`; `DataTable` and `Badge` replace that page's
hand-rolled markup:

```tsx
import { useMdkContext, useQuery, useQueryClient } from '@tetherto/mdk-react-adapter'
import type { DataTableColumnDef } from '@tetherto/mdk-react-devkit'
import { Badge, DataTable, LabeledCard } from '@tetherto/mdk-react-devkit/primitives'
import { getFetcher } from '@tetherto/mdk-ui-foundation'

type Device = {
  deviceId: string
  workerId: string
  workerState: string
  hashrate_avg?: number
  power?: number
  temperature?: number
}

type Overview = { ts: number; devices: Device[] }

function stateBadgeStatus(state: string): 'success' | 'default' {
  return state === 'ready' ? 'success' : 'default'
}

const columns: DataTableColumnDef<Device, unknown>[] = [
  { accessorKey: 'deviceId', header: 'Device' },
  { accessorKey: 'workerId', header: 'Worker' },
  {
    id: 'workerState',
    header: 'Worker state',
    cell: ({ row }) => {
      const state = (row.original.workerState || 'unknown').toLowerCase()
      return <Badge status={stateBadgeStatus(state)} text={state} />
    }
  },
  {
    accessorKey: 'hashrate_avg',
    header: 'Hashrate (TH/s)',
    cell: ({ getValue }) => (Number(getValue()) || 0).toFixed(2)
  },
  {
    accessorKey: 'power',
    header: 'Power (W)',
    cell: ({ getValue }) => (Number(getValue()) || 0).toFixed(0)
  },
  {
    accessorKey: 'temperature',
    header: 'Temp (°C)',
    cell: ({ getValue }) => (Number(getValue()) || 0).toFixed(1)
  }
]

export function OverviewPage() {
  const { apiBaseUrl } = useMdkContext()
  const fetcher = getFetcher(useQueryClient())
  if (!fetcher) throw new Error('MDK fetcher is not configured')

  const overview = useQuery({
    queryKey: ['dashboard-overview'],
    // Use the provider's transport to send the token, refresh on 401, and parse the JSON body.
    queryFn: () => fetcher<Overview>(`${apiBaseUrl}/overview`),
    refetchInterval: 3000
  })

  return (
    <div style={{ padding: 24 }}>
      <LabeledCard label="Devices" isFullWidth>
        <DataTable<Device>
          data={overview.data?.devices ?? []}
          columns={columns}
          getRowId={(row) => row.deviceId}
          loading={overview.isLoading}
          enablePagination={false}
        />
      </LabeledCard>
    </div>
  )
}
```

A controller is `async (req) => value`; a page is `useQuery` + devkit components, and neither one touches the
other's plumbing. `OverviewPage` never imports `mdkClient`, and `overview.js` never imports React.

</Step>

<Step>

### Run it

#### 6.1 Add package.json

`examples/minimal-dashboard/package.json`:

```json
{
  "name": "@your-org/mdk-minimal-dashboard",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "build": "npm --prefix ui run build",
    "start": "node start.js"
  }
}
```

#### 6.2 Start the dashboard

Install each package's own dependencies, build the UI once, then boot the backend:

```bash
cd examples/minimal-dashboard
npm install
npm --prefix ui install
npm run build
npm run start
```

Open `http://localhost:3000/`, sign in as `operator` with `dashboard-demo`, and the page polls `/overview` every
3 seconds and shows the one Avalon miner reporting live telemetry from its mock. Confirm the API directly with:

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H 'content-type: application/json' \
  -d '{"username":"operator","password":"dashboard-demo"}' | jq -er .accessToken)

curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/overview
```

You should see JSON shaped like `{ "ts": ..., "devices": [{ "deviceId": "<uuid>", "workerId": "avalon-1", "workerState": "READY", "hashrate_avg": ..., "power": ..., "temperature": ..., ... }] }`.
`deviceId` is the id the provisioning store assigned on first boot; it is kept in `.mdk-data/avalon`, so it is the same on the next start.

### Hot-reload UI development

Vite does **not** replace the Gateway. Without hot reload you open `:3000` (Gateway serves the built `ui/dist`). With hot
reload you still need the Gateway for `/overview`, and Vite only serves the React app and proxies that path.

Keep **both** terminals running:

**Terminal 1, Gateway** (do not stop this):

```bash
cd examples/minimal-dashboard
npm run start
```

Wait for `dashboard up: http://localhost:3000/`.

**Terminal 2, Vite**:

```bash
cd examples/minimal-dashboard
VITE_API_PORT=3000 npm --prefix ui run dev
```

Open **`http://localhost:3041/`** (the Vite port), not `:3000`. Step 5's proxy forwards `/overview` to the Gateway on
`VITE_API_PORT`. If Terminal 1 is down, Vite logs `http proxy error: /overview` / `ECONNREFUSED` and the table stays empty.

</Step>

</Steps>

## Next steps

- **More Workers, zero controller changes**: `overview.js` already loops over every registered Worker generically.
  Register a second Worker the same way (Step 2's `startAvalonWorker` plus a copied Starter site adapter such as
  `startWhatsminerWorker`, each with its own mock port,
  `trustKernel(...)` and `kernel.registerWorker(...)`) and it appears in `/overview` for free.
- **A write route**: Add a second manifest entry (`POST /devices/{deviceId}/command`) calling
  `mdkClient.sendCommand(deviceId, 'setPowerMode', { mode })`, following the `command.js` example in
  [Gateway apps][apps], and a `Button` in `OverviewPage.tsx` that `POST`s to it. Before deploying any
  physical write command, require narrowly scoped authorization, validate its payload and target state, apply rate
  limits, and record an audit trail.
- **More pages, charts, history**: Add `react-router` and a second route/page, or graduate to the domain layer
  (`@tetherto/mdk-react-devkit/domain`'s `LineChartCard`, `MetricCard`, header stats bar) once the app
  grows a history endpoint to feed them. Compare [`examples/mvp-site/ui/src/DashboardPage.tsx`][mvp-site-dashboard-page] and
  [`examples/mvp-site/backend/gateway-plugins/site/controllers/history.js`][mvp-site-history-controller] for that shape.
- **Separate processes or hosts**: Replace the direct registration in Step 2 with Local discovery for processes on
  one machine or DHT discovery for separate hosts, as described in the [discovery model][workers-discovery].

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| `/overview` returns `{ devices: [] }` | `kernel.registerWorker(...)` wasn't awaited, or `startGateway` was called before `waitForDiscovery` resolved |
| `/overview` returns `500` / `Cannot read properties of null` | Controller spread `tel.metrics` when `pullTelemetry` returned `null`: keep Step 3's `(tel && tel.metrics) \|\| {}` guard |
| `pullTelemetry` throws / device shows zeros | The Worker couldn't reach the mock at boot: `await mock.ready` before `startAvalonWorker` seeds the device, and keep the seeded `port` equal to the mock's `MOCK_PORT` |
| `ERR_WORKER_ALLOWED_KEYS_REQUIRED` when the Worker starts | Workers are fail-closed: pass `allowedKeys: [kernel.getClientPublicKey()]` to `startAvalonWorker`, then call `trustKernel(runtime, kernel)` before `kernel.registerWorker(...)` as in Step 2 |
| Vite shows `http proxy error: /overview` / `ECONNREFUSED`, page at `:3041` has no data | Gateway is not listening on the proxy target: keep `npm run start` running in another terminal, and set `VITE_API_PORT` to that Gateway port (default `3000`). Open `:3041`, not `:3000` |
| Browser `fetch('/overview')` fails from Vite with CORS / wrong host when Gateway is up | See the CORS note in Step 4: the Vite proxy must target the Gateway (`VITE_API_PORT`); do not call a different origin from the page |
| `ERR_PLUGIN_HANDLER_NOT_FOUND: .../apps/dashboard: route "dashboard.overview" handler "./controllers/overview.js"` when the app runtime starts | `appDir` must point at the directory *containing* `mdk-app.yaml` and `mdk-plugin.json`, and the route's `handler` must be relative to `mdk-plugin.json` |
| `/overview` answers `404` | The app entry in `startGateway({ apps })` has no `mount: '/'`, so the route is served at `/apps/dashboard/overview` |
| `/overview` answers `503` | The app runtime has not written its key to `keyFile` yet, or it is not running |
| Gateway boots but the page 404s | `common.staticRootPath` must be an absolute path (`path.join(__dirname, 'ui', 'dist')`) pointing at a *built* UI (`npm run build` in Step 6), not a relative string or the unbuilt `ui/src` |
| `Cannot find module '@tetherto/mdk-react-devkit'` when building this tutorial's `ui/` | Run the Prerequisites' `npm run setup:ui && npm run build:ui` from the repo root first: [the monorepo's UI packages][ui-readme] ship pre-built `dist/` output that this tutorial's `ui/package.json` depends on via `file:` links |

## Links

[mvp-site]: ../../examples/mvp-site/README.md
<!-- docs@tether.io: mvp-site → https://github.com/tetherto/mdk/tree/main/examples/mvp-site -->

[mvp-site-adapter]: ../../examples/mvp-site/backend/whatsminer-adapter.js
<!-- docs@tether.io: mvp-site-adapter → https://github.com/tetherto/mdk/blob/main/examples/mvp-site/backend/whatsminer-adapter.js -->

[mvp-site-overview]: ../../examples/mvp-site/backend/gateway-plugins/site/controllers/overview.js
<!-- docs@tether.io: mvp-site-overview → https://github.com/tetherto/mdk/blob/main/examples/mvp-site/backend/gateway-plugins/site/controllers/overview.js -->

[mvp-site-vite-config]: ../../examples/mvp-site/ui/vite.config.ts
<!-- docs@tether.io: mvp-site-vite-config → https://github.com/tetherto/mdk/blob/main/examples/mvp-site/ui/vite.config.ts -->

[mvp-site-main-tsx]: ../../examples/mvp-site/ui/src/main.tsx
<!-- docs@tether.io: mvp-site-main-tsx → https://github.com/tetherto/mdk/blob/main/examples/mvp-site/ui/src/main.tsx -->

[mvp-site-page]: ../../examples/mvp-site/ui/src/SitePage.tsx
<!-- docs@tether.io: mvp-site-page → https://github.com/tetherto/mdk/blob/main/examples/mvp-site/ui/src/SitePage.tsx -->

[mvp-site-dashboard-page]: ../../examples/mvp-site/ui/src/DashboardPage.tsx
<!-- docs@tether.io: mvp-site-dashboard-page → https://github.com/tetherto/mdk/blob/main/examples/mvp-site/ui/src/DashboardPage.tsx -->

[mvp-site-history-controller]: ../../examples/mvp-site/backend/gateway-plugins/site/controllers/history.js
<!-- docs@tether.io: mvp-site-history-controller → https://github.com/tetherto/mdk/blob/main/examples/mvp-site/backend/gateway-plugins/site/controllers/history.js -->

[architecture]: ../concepts/architecture.md
<!-- docs@tether.io: architecture → concepts/architecture -->

[build-a-worker]: ../guides/workers/build-a-worker.md
<!-- docs@tether.io: build-a-worker → guides/workers/build-a-worker -->



[discovery-model]: ../../backend/workers/docs/architecture.md#discovery-model
<!-- docs@tether.io: discovery-model → https://github.com/tetherto/mdk/blob/main/backend/workers/docs/architecture.md#discovery-model -->

[workers-discovery]: ../../backend/workers/README.md
<!-- docs@tether.io: workers-discovery → reference/worker -->

[apps-auth]: ../guides/gateway/apps.md#auth-and-permissions
<!-- docs@tether.io: apps-auth → guides/gateway/apps#auth-and-permissions -->

[apps]: ../guides/gateway/apps.md
<!-- docs@tether.io: apps → guides/gateway/apps -->

[react-adapter-auth]: ../../ui/packages/react-adapter/README.md#authentication
<!-- docs@tether.io: react-adapter-auth → https://github.com/tetherto/mdk/blob/main/ui/packages/react-adapter/README.md#authentication -->

[network-requirements]: ../reference/environment.md#requirements
<!-- docs@tether.io: network-requirements → reference/environment#requirements -->

[mvp-site-ui]: ../../examples/mvp-site/ui/package.json
<!-- docs@tether.io: mvp-site-ui → https://github.com/tetherto/mdk/blob/main/examples/mvp-site/ui/package.json -->

[ui-readme]: ../../ui/README.md
<!-- docs@tether.io: ui-readme → https://github.com/tetherto/mdk/blob/main/ui/README.md -->
