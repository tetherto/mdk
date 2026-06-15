# MDK site monitor example

End-to-end example showing how to build a mining-site dashboard on top of MDK.

**What runs:**
- Mock Whatsminer M56S miner (`mdk-e2e/server.js`)
- ORK — discovers the mock worker via DHT and exposes an IPC socket
- app-node — connects to ORK over IPC and serves a REST + OAuth2 API on `:3000`
- Vite UI — React app using MDK UI components, polls app-node for site hashrate

## Prerequisites

| Requirement | Version |
|---|---|
| Node.js | ≥ 24 |
| Google OAuth 2.0 client | (see setup below) |

## One-time setup

### 1. Build the MDK UI packages

The UI imports pre-built packages from `ui`. Build them once:

```bash
cd ui
npm install
npm run build
cd -
```

### 2. Install UI dependencies

```bash
cd examples/e2e/ui
npm install
cd -
```

### 3. Configure Google OAuth credentials

**a) Google Cloud Console**

1. Go to <https://console.cloud.google.com/apis/credentials>
2. Create an **OAuth 2.0 Client ID** (type: *Web application*)
3. Add to **Authorized redirect URIs**:
   ```
   http://localhost:3000/oauth/google/callback
   ```
4. Add to **Authorized JavaScript origins**:
   ```
   http://localhost:3030
   ```
5. Copy the **Client ID** and **Client Secret**

**b) App-node OAuth config**

Edit `backend/core/app-node/config/facs/httpd-oauth2.config.json`
(copy from `.example` if it doesn't exist):

```json
{
  "h0": {
    "method": "google",
    "credentials": {
      "client": {
        "id": "<YOUR_CLIENT_ID>",
        "secret": "<YOUR_CLIENT_SECRET>"
      }
    },
    "startRedirectPath": "/oauth/google",
    "callbackUri": "http://localhost:3000/oauth/google/callback",
    "callbackUriUI": "http://localhost:3000",
    "users": []
  }
}
```

**c) Set your Google account as super-admin**

Edit `backend/core/app-node/config/facs/auth.config.json` and set
`superAdmin` to your Google account email:

```json
{
  "a0": {
    "superAdmin": "you@example.com",
    ...
  }
}
```
## Running

### Terminal 1 — start all backend services + UI

```bash
node examples/e2e/start.js
```

This starts (with a short delay between each):
1. **ORK + mock miner** — mock Whatsminer M56S registers over DHT
2. **app-node** — HTTP server on `http://localhost:3000`
3. **UI dev server** — Vite on `http://localhost:3030`

Wait ~10 seconds for all services to initialise, then open:

```
http://localhost:3030
```

Click **Sign in with Google**, authorise with the email you set as `superAdmin`,
and the dashboard will start showing live hashrate data.

Press **Ctrl+C** to stop everything.

## Architecture

```
Mock miner (TCP :14028)
      │  Whatsminer protocol
      ▼
MDK Worker (Hyperswarm DHT)
      │  MDK Protocol over HRPC
      ▼
ORK (Unix IPC socket)
      │  IPC (mdk-client)
      ▼
app-node (HTTP :3000)
  ├─ GET  /oauth/google            → Google OAuth redirect
  ├─ GET  /oauth/google/callback   → exchange code → issue auth token
  └─ GET  /site-monitor/hashrate   → aggregate hashrate across all devices
      │  Bearer token (Authorization header)
      ▼
UI (Vite :3030)
  └─ SiteHashratePage.tsx
       ├─ useAuth (MDK auth store)
       ├─ useQuery → /site-monitor/hashrate every 5 s
       ├─ HashRateLineChart (MDK UI)
       └─ MetricCard × 3 (MDK UI)
```

## UI components used

All UI is built with `@tetherto/mdk-react-devkit` and `@tetherto/mdk-react-adapter`.
No custom component library or hand-rolled CSS is needed.

| Component | Package | Purpose |
|---|---|---|
| `Button` | `mdk-react-devkit/core` | Sign-in / Sign-out actions |
| `Typography` | `mdk-react-devkit/core` | All text and headings |
| `Spinner` | `mdk-react-devkit/core` | Loading state |
| `MetricCard` | `mdk-react-devkit/foundation` | Hashrate / Power / Device count |
| `HashRateLineChart` | `mdk-react-devkit/foundation` | Live hashrate timeline |
| `MdkProvider` | `mdk-react-adapter` | QueryClient + API base URL context |
| `useAuth` | `mdk-react-adapter` | Token store (set / read / clear) |
| `useQuery` | `mdk-react-adapter` | Data fetching with polling |
| `useMdkContext` | `mdk-react-adapter` | Read `apiBaseUrl` from provider |

## Extending this example

To add a new data panel, follow the same pattern as `SiteHashratePage.tsx`:

1. Add an endpoint in `backend/core/app-node/workers/lib/server/handlers/site-monitor.handlers.js`
2. Register the route in `backend/core/app-node/workers/lib/server/routes/site-monitor.routes.js`
3. Call the endpoint from the UI with `useQuery` + the `Authorization` header
4. Render with MDK UI components
