---
title: Build a minimal single-page dashboard
description: "[⏱️ <15 min] From an empty directory to a running Kernel, Worker, Gateway plugin, and static HTML dashboard"
docs@tether_slug: tutorials/quickstart/build-a-dashboard
---

# Build a minimal single-page dashboard

[`examples/full-site`][full-site] is the fullest demonstration of the MDK stack: 11 Worker processes spanning miners,
containers, power meters, sensors, and miner pools, plus a multi-page React + Vite dashboard built on
`@tetherto/mdk-react-devkit`. That breadth is the point of that example — but it also means it's a lot to read
through if all you want is to understand (or prototype against) the actual wiring: Kernel, one Worker, a Gateway
route, a page that polls it.

This guide builds the smallest version of that same shape: **one Worker, one Gateway route, one static HTML page, no
build step**. It teaches the same end-to-end shape as `examples/full-site`, without that example's family-specific
adapters, persistence, history, commands, and aggregation.

> [!NOTE]
> If **Kernel**, **Worker**, or **Gateway** are unfamiliar terms, read [the architecture overview][architecture]
> first. This tutorial also assumes you've skimmed [Build a third-party Worker][build-a-worker] — the one Worker used
> here is [`backend/workers/samples/demo-worker`][demo-worker], the same zero-dependency reference Worker that tutorial
> is built around.

## Overview

This tutorial builds the smallest version of the full MDK stack: **one Worker, one Gateway route, one static HTML page, no build step**.

What you'll have at the end:

```
examples/minimal-dashboard/
  package.json
  start.js                     # boots Kernel + the one Worker + Gateway, one process
  plugins/
    dashboard/
      mdk-plugin.json           # one route: GET /overview
      controllers/
        overview.js             # lists every Worker's devices + live telemetry
  public/
    index.html                  # the single-page UI — plain HTML/JS, no bundler
```

No `ui/` package, no router, no build tooling. The page is one `.html` file the Gateway serves directly.

## Prerequisites

- Node.js `>=24`
- This repo checked out, with the backend dependencies installed once from the repository root:

  ```bash
  npm run setup:core
  npm run setup:workers
  ```

  Running `npm run setup` from `examples/full-site` is also supported, but it is broader: it installs these backend
  dependencies plus the full-site example and UI dependencies and builds the UI packages.
- Commands below assume a new `examples/minimal-dashboard/` directory alongside `examples/full-site/`

<Steps>

<Step>

### Pick the Worker

Use [`backend/workers/samples/demo-worker`][demo-worker] as-is — it needs no worker-infra services (provisioning
stores, alert templates), just `WorkerRuntime` and its own bundled mock device. Nothing in the steps below is
specific to it, though: swap in `startWhatsminerWorker`, `startAntminerWorker`, or your own Worker from
[Build a third-party Worker][build-a-worker] and everything past the next step is unchanged.

</Step>

<Step>

### Boot Kernel and Worker in the same process

The simplest of the three discovery modes ([full trade-offs here][deployment-trade-offs]): one Node process owns both the
Kernel and the Worker, so there's no key file or DHT topic to manage.

`examples/minimal-dashboard/start.js`:

```js
'use strict'

const path = require('path')
const { getKernel, waitForDiscovery } = require('../../backend/core/mdk')
const { startDemoWorker } = require('../backend/demo-worker-caller')
const demoMock = require('../../backend/workers/samples/demo-worker/mock/server')

const ROOT = path.join(__dirname, '.mdk-data')
const MOCK_PORT = 9101
const HTTP_PORT = Number(process.env.MDK_HTTP_PORT) || 3000

function onceListening (mock) {
  if (mock.server.listening) return Promise.resolve()
  return new Promise((resolve) => mock.server.once('listening', resolve))
}

async function main () {
  // the one fake device this dashboard will show — swap for real hardware later
  const mock = demoMock.createServer({ host: '127.0.0.1', port: MOCK_PORT, serial: 'WM3-0001' })
  await onceListening(mock)

  // Kernel + the one Worker, same process
  const kernel = await getKernel({ root: ROOT })
  const worker = await startDemoWorker({
    workerId: 'demo-worker-1',
    storeDir: path.join(ROOT, 'demo-worker-store'),
    seedDevices: [{ id: 'demo-0', opts: { host: '127.0.0.1', port: MOCK_PORT } }]
  })
  await kernel.registerWorker(worker.runtime.getPublicKey())
  await waitForDiscovery(kernel, { minWorkers: 1 })

  console.log('worker registered: %s', worker.deviceIds.join(', '))
}

module.exports = { main, ROOT, HTTP_PORT }
if (require.main === module) main().catch((err) => { console.error(err); process.exit(1) })
```

The demo Worker package exports a plugin and SQLite helper, not a boot function. The separate
[`demo-worker-caller`][demo-worker-caller] used here owns `WorkerRuntime`, device configuration, persistence,
sampling, and shutdown.

`getKernel({ root: ROOT })` with no `topic`/`discovery` option defaults to DHT discovery with a fresh random topic.
This example then registers the Worker's public key directly because both objects are in the same process. See the
[discovery model][workers-discovery] for the DHT, Local, and Same-process options to use in other deployments.

</Step>

<Step>

### Write the one Gateway plugin route

A [Gateway plugin][gateway-plugins] is a directory with a manifest and a controller. This one has a single read-only
route that lists every registered Worker's devices and pulls each one's default `metrics` telemetry bundle — no
per-device-family branching, because there's only one family here.

#### 3.1 Write the plugin manifest

`examples/minimal-dashboard/plugins/dashboard/mdk-plugin.json`:

```json
{
  "name": "@your-org/mdk-plugin-dashboard",
  "version": "0.1.0",
  "description": "Minimal dashboard plugin: one route that lists every registered device and its live telemetry.",
  "routes": [
    {
      "id": "dashboard.overview",
      "handler": "./controllers/overview.js",
      "auth": false,
      "http": { "method": "GET", "path": "/overview" },
      "description": "Live snapshot of every device across every registered Worker.",
      "safety": "read-only"
    }
  ]
}
```

#### 3.2 Write the controller

`examples/minimal-dashboard/plugins/dashboard/controllers/overview.js`:

```js
'use strict'

module.exports = async function overview (req, services) {
  const { workers } = await services.mdkClient.listWorkers()

  const devices = await Promise.all(
    workers.flatMap((w) => (w.deviceIds || []).map(async (deviceId) => {
      const tel = await services.mdkClient.pullTelemetry(deviceId, 'metrics')
      return { deviceId, workerId: w.workerId, workerState: w.state, ...tel.metrics }
    }))
  )

  return { ts: Date.now(), devices }
}
```

A controller is `async (req, services) => value` — return a plain object, the Gateway serializes it to JSON itself;
you never touch `res`. `services.mdkClient` is the same client used everywhere else in MDK — no knowledge of the
underlying MDK Protocol envelope required.

> [!NOTE]
> With more than one Worker family mixed in (miners, powermeters, sensors, ...) you'd branch by
> `deviceFamily` instead of spreading `tel.metrics` blindly — see [`examples/full-site/plugins/site/lib/site.js`][full-site-lib]
> for that pattern once you outgrow this one.

</Step>

<Step>

### Serve the plugin and static page from the same Gateway

Add `startGateway` to `start.js`, mounting the plugin via `extraPluginDirs` and the UI via
`common.staticRootPath`. This is the complete canonical file; its boot order is mock, Kernel, Worker, registration,
readiness, then Gateway:

```js
'use strict'

const path = require('path')
const { getKernel, startGateway, waitForDiscovery } = require('../../backend/core/mdk')
const { startDemoWorker } = require('../backend/demo-worker-caller')
const demoMock = require('../../backend/workers/samples/demo-worker/mock/server')

const ROOT = path.join(__dirname, '.mdk-data')
const MOCK_PORT = 9101
const HTTP_PORT = Number(process.env.MDK_HTTP_PORT) || 3000

function onceListening (mock) {
  if (mock.server.listening) return Promise.resolve()
  return new Promise((resolve) => mock.server.once('listening', resolve))
}

async function main () {
  // Start the mock device before its Worker tries to connect.
  const mock = demoMock.createServer({ host: '127.0.0.1', port: MOCK_PORT, serial: 'WM3-0001' })
  await onceListening(mock)

  // Start Kernel, then the Worker runtime that hosts the demo Worker plugin.
  const kernel = await getKernel({ root: ROOT })
  const worker = await startDemoWorker({
    workerId: 'demo-worker-1',
    storeDir: path.join(ROOT, 'demo-worker-store'),
    seedDevices: [{ id: 'demo-0', opts: { host: '127.0.0.1', port: MOCK_PORT } }]
  })

  // Register the Worker and wait until it is ready before accepting HTTP traffic.
  await kernel.registerWorker(worker.runtime.getPublicKey())
  await waitForDiscovery(kernel, { minWorkers: 1 })

  await startGateway({
    kernel,
    noAuth: true,
    port: HTTP_PORT,
    root: path.join(ROOT, 'gateway'),
    tmpdir: path.join(ROOT, 'gateway'),
    extraPluginDirs: [path.join(__dirname, 'plugins', 'dashboard')],
    common: { staticRootPath: path.join(__dirname, 'public') }
  })

  console.log('worker registered: %s', worker.deviceIds.join(', '))
  console.log(`dashboard up: http://localhost:${HTTP_PORT}/`)
}

module.exports = { main, ROOT, HTTP_PORT }
if (require.main === module) main().catch((err) => { console.error(err); process.exit(1) })
```

> [!IMPORTANT]
> The route's `"auth": false` and Gateway's `noAuth: true` are **local-development settings**. Do not expose this
> Gateway directly to an untrusted network. Production deployments require TLS termination, authentication,
> authorization, and network policy. Before production, remove `noAuth: true`, set the route's `"auth"` to `true`,
> and declare its required `"permissions"`. Write routes also need input validation, rate limits, and auditing.

> [!IMPORTANT]
> Serve the page from `common.staticRootPath`, not a separate dev server on its own port. Gateway plugin controllers
> only receive `(req, services)` — never the underlying reply object — so a controller has no way to set
> `Access-Control-Allow-Origin`, and Gateway has no built-in CORS support. For this tutorial, use `staticRootPath` so
> `fetch('/overview')` stays same-origin. In production, a same-origin reverse proxy is another option. This is also
> why `examples/full-site`'s Vite dev server proxies `/site/*` to the Gateway port instead of calling it
> cross-origin.

</Step>

<Step>

### Write the single-page UI

No framework, no bundler — one HTML file that polls `/overview` and renders a table.

`examples/minimal-dashboard/public/index.html`:

```html
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>MDK dashboard</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; background: #0b0d12; color: #e6e6e6; }
    h1 { font-weight: 600; }
    table { border-collapse: collapse; width: 100%; margin-top: 1rem; }
    th, td { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 1px solid #2a2d35; }
    th { color: #9aa0ac; font-weight: 500; }
    .worker-state-ready { color: #4ade80; }
    .worker-state-offline, .worker-state-unknown { color: #f87171; }
  </style>
</head>
<body>
  <h1>Devices</h1>
  <table id="devices">
    <thead>
      <tr><th>Device</th><th>Worker</th><th>Worker state</th><th>Hashrate (TH/s)</th><th>Power (W)</th><th>Temp (&deg;C)</th></tr>
    </thead>
    <tbody></tbody>
  </table>

  <script>
    async function refresh () {
      const res = await fetch('/overview')
      const { devices } = await res.json()
      document.querySelector('#devices tbody').innerHTML = devices.map((d) => `
        <tr>
          <td>${d.deviceId}</td>
          <td>${d.workerId}</td>
          <td class="worker-state-${(d.workerState || 'unknown').toLowerCase()}">${d.workerState || 'unknown'}</td>
          <td>${(d.hashrate_rt ?? 0).toFixed(2)}</td>
          <td>${(d.power ?? 0).toFixed(0)}</td>
          <td>${(d.temperature ?? 0).toFixed(1)}</td>
        </tr>`).join('')
    }
    refresh()
    setInterval(refresh, 3000)
  </script>
</body>
</html>
```

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
  "scripts": { "start": "node start.js" }
}
```

#### 6.2 Start the dashboard

```bash
cd examples/minimal-dashboard
npm run start
```

Open `http://localhost:3000/` — the page polls `/overview` every 3 seconds and shows the one `demo-0` device
reporting live telemetry from its mock. Confirm the API directly with:

```bash
curl -s http://localhost:3000/overview | node -e "process.stdin.pipe(process.stdout)"
```

</Step>

</Steps>

## Next steps

- **More Workers, zero controller changes** — `overview.js` already loops over every registered Worker generically.
  Register a second Worker the same way (Step 2's `startDemoWorker` + `startWhatsminerWorker`, etc., both followed by
  `kernel.registerWorker(...)`) and it appears in `/overview` for free.
- **A write route** — add a second manifest entry (`POST /devices/{deviceId}/command`) calling
  `services.mdkClient.sendCommand(deviceId, 'setPowerMode', { mode })`, following the `command.js` example in
  [Gateway plugins][gateway-plugins], and a button in `index.html` that `POST`s to it. Before deploying any physical
  write command, require narrowly scoped authorization, validate its payload and target state, apply rate limits,
  and record an audit trail.
- **More pages** — add more static `.html` files under `public/`, or graduate straight to the same
  `@tetherto/mdk-react-adapter` / `@tetherto/mdk-react-devkit` stack `examples/full-site/ui` uses for a routed,
  multi-page dashboard with prebuilt chart/panel components.
- **Separate processes or hosts** — replace the direct registration in Step 2 with Local discovery for processes on
  one machine or DHT discovery for separate hosts, as described in the [discovery model][workers-discovery].

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| `/overview` returns `{ devices: [] }` | `kernel.registerWorker(...)` wasn't awaited, or `startGateway` was called before `waitForDiscovery` resolved |
| `pullTelemetry` throws / device shows `unknown` | The Worker's `connect()` couldn't reach the mock at boot — confirm the mock's `listening` event fired before `startDemoWorker` seeded it (the `onceListening` call in the boot sequence) |
| Browser `fetch('/overview')` fails from a page opened via `file://` or a separate dev server | Serve `index.html` via `common.staticRootPath` on the same Gateway/port, not a separate origin — see the CORS note in the Gateway step |
| `ERR_PLUGIN_HANDLER_NOT_FOUND: routes.dashboard.overview: ./controllers/overview.js` on Gateway boot | `extraPluginDirs` must point at the directory *containing* `mdk-plugin.json`, not the controller file itself |
| Gateway boots but the page 404s | `common.staticRootPath` must be an absolute path (`path.join(__dirname, 'public')`), not a relative string |

## Links

[full-site]: ../../../examples/full-site/README.md
<!-- docs@tether.io: full-site → https://github.com/tetherto/mdk/tree/main/examples/full-site -->

[full-site-lib]: ../../../examples/full-site/plugins/site/lib/site.js
<!-- docs@tether.io: full-site-lib → https://github.com/tetherto/mdk/blob/main/examples/full-site/plugins/site/lib/site.js -->

[architecture]: ../../concepts/architecture.md
<!-- docs@tether.io: architecture → concepts/architecture -->

[build-a-worker]: ../../guides/workers/build-a-worker.md
<!-- docs@tether.io: build-a-worker → guides/workers/build-a-worker -->

[demo-worker]: ../../../backend/workers/samples/demo-worker/index.js
<!-- docs@tether.io: demo-worker → https://github.com/tetherto/mdk/blob/main/backend/workers/samples/demo-worker/index.js -->

[demo-worker-caller]: ../../../examples/backend/demo-worker-caller/index.js
<!-- docs@tether.io: demo-worker-caller → https://github.com/tetherto/mdk/blob/main/examples/backend/demo-worker-caller/index.js -->

[deployment-trade-offs]: ../../concepts/deployment-topologies.md#the-trade-off
<!-- docs@tether.io: deployment-trade-offs → concepts/deployment-topologies#the-trade-off -->

[workers-discovery]: ../../concepts/stack/workers.md#discovery-model
<!-- docs@tether.io: workers-discovery → concepts/stack/workers#discovery-model -->

[gateway-plugins]: ../../guides/gateway/plugins.md
<!-- docs@tether.io: gateway-plugins → guides/gateway/plugins -->
