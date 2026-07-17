# MDK site monitor example

End-to-end example showing how to build a mining-site dashboard on top of MDK.

**What runs:**
- Mock [Whatsminer M56S](../../backend/workers/miners/whatsminer/README.md) miner
  ([`mdk-e2e/server.js`](../backend/mdk-e2e/server.js))
- [Kernel](../../docs/concepts/architecture.md#the-kernel) — discovers the mock Worker via DHT and exposes an HRPC listener
- [Gateway](../../docs/concepts/architecture.md#gateway) — connects to Kernel over HRPC (by its public key) and serves a REST API on `:3000`
  (noAuth mode)
- Vite UI — React app using MDK UI components, polls Gateway for site hashrate
  ([`ui/src/SiteHashratePage.tsx`](ui/src/SiteHashratePage.tsx))

## Prerequisites

- Node.js ≥ 24

## One-time setup

### 1. Install backend dependencies

Run from the repository root:

#### 1.1 Core packages

```bash
cd backend/core
npm run install:packages
cd -
```

Installs `node_modules` for `mdk`, `kernel`, `gateway`, `client`, `plugins`, and the
`examples/mdk-e2e` backend server.

#### 1.2 Worker packages

```bash
cd backend/workers
npm run install:packages
cd -
```

Installs `node_modules` for `workers/base` and all Worker drivers (including
`workers/miners/whatsminer`) that `mdk-e2e/server.js` imports at runtime.

### 2. Build the MDK UI packages

The UI imports pre-built packages from `ui/`. Build them once:

```bash
cd ui
npm install
npm run build
cd -
```

### 3. Install UI dependencies

```bash
cd examples/e2e/ui
npm install
cd -
```

> [!NOTE]
> The example runs in `noAuth` mode — the gateway skips JWT validation and the UI
> skips the Google login screen. No OAuth credentials are required. To add Google
> OAuth to your own deployment, see
> [Add real auth (Google OAuth)](../../docs/tutorials/get-started/dashboard.md).

## Running

Start the interactive CLI from the repository root:

```bash
node examples/e2e/start.js
```

The CLI prints a help menu and waits for commands. To start the full example, type:

```
start all
```

This starts, with a short delay between each:
1. **gateway** — Kernel + mock miner + HTTP server on `http://localhost:3000`
2. **UI dev server** — Vite on `http://localhost:3030`

Once the UI service starts (watch for the Vite ready message), open:

```
http://localhost:3030
```

The dashboard will start showing live hashrate data immediately — no sign-in required.

Other useful commands: `status`, `stop all`, `help`. Press **Ctrl+C** or type `exit` to
stop everything and quit.

## Architecture

```
Mock miner (TCP :14028)
      │  Whatsminer protocol
      ▼
MDK Worker (Hyperswarm DHT)
      │  MDK Protocol over HRPC
      ▼
Kernel (in-process, same Node process as gateway)
      │  HRPC (mdk-client, by kernel public key)
      ▼
gateway (HTTP :3000, noAuth mode)
  └─ GET  /site-monitor/hashrate   → aggregate hashrate across all devices
      │  no auth token required (noAuth mode)
      ▼
UI (Vite :3030)
  └─ SiteHashratePage.tsx
       ├─ useQuery → /site-monitor/hashrate every 5 s
       ├─ LineChart (MDK UI)
       └─ MetricCard × 3 (MDK UI)
```

## UI components used

All UI is built with [`@tetherto/mdk-react-devkit`](../../ui/packages/react-devkit/README.md) and
[`@tetherto/mdk-react-adapter`](../../ui/packages/react-adapter/README.md).
No custom component library or hand-rolled CSS is needed.

| Component | Package | Purpose |
|---|---|---|
| `Button` | `mdk-react-devkit/primitives` | Sign-in / Sign-out actions |
| `Typography` | `mdk-react-devkit/primitives` | All text and headings |
| `Spinner` | `mdk-react-devkit/primitives` | Loading state |
| `LineChart` | `mdk-react-devkit/primitives` | Time-series data visualization |
| `MetricCard` | `mdk-react-devkit/domain` | Hashrate / Power / Device count |
| `MdkProvider` | `mdk-react-adapter` | QueryClient + API base URL context |
| `useAuth` | `mdk-react-adapter` | Token store (set / read / clear) |
| `useQuery` | `mdk-react-adapter` | Data fetching with polling |
| `useMdkContext` | `mdk-react-adapter` | Read `apiBaseUrl` from provider |

## Extending this example

To add a new data panel, follow the plugin pattern shown in
[`examples/full-site/plugins/site/`](../full-site/plugins/site/):

1. Create a plugin directory with an `mdk-plugin.json` manifest
2. Add a controller file referenced from the manifest
3. Pass the plugin directory to `startGateway()` via `extraPluginDirs`
4. Call the new endpoint from the UI with `useQuery` + the `Authorization` header
5. Render with MDK UI components

See the [Gateway plugin guide](../../docs/guides/gateway/plugins.md) for the full manifest schema and controller contract.
