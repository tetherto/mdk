# @tetherto/mdk-app-node

The **App Node** is the mandatory gateway between the client-facing world (UI, AI agents) and the ORK kernel. It is a Fastify-based HTTP/WebSocket server that handles authentication, RBAC, fleet aggregation, and MCP endpoint exposure.

UI and AI agents never connect to ORK directly. All traffic flows through the App Node.

## Quick Start

The easiest way to start the App Node is through `@tetherto/mdk`:

```js
const { getOrk, startAppNode } = require('@tetherto/mdk')

const ork = await getOrk()
const server = await startAppNode({ ork, port: 3000, noAuth: true })
// HTTP server is up at http://localhost:3000
```

For production (with OAuth2):
```js
const server = await startAppNode({
  ork,
  port: 3000,
  auth: {
    h0: { method: 'google', credentials: { client: { id: '...', secret: '...' } }, users: ['admin@example.com'] }
  }
})
```

## Responsibilities

- **Authentication:** OAuth2 via Google / Microsoft. JWT validation on all routes. Session management.
- **RBAC:** Role-based access control guards all ORK operations.
- **Fleet Aggregation:** Queries multiple workers via ORK and merges responses (site hashrate, average temperature, cross-rack efficiency).
- **ORK Proxy:** Forwards device commands and telemetry queries to ORK via `@tetherto/mdk-client` (IPC by default).
- **WebSocket:** Real-time telemetry subscriptions for the UI.
- **MCP Endpoint:** AI agent integration via the Model Context Protocol.

## HTTP API Overview

The App Node exposes REST routes for:

| Category | Endpoints |
|----------|-----------|
| Workers | List workers, get worker state |
| Devices | List devices, get telemetry, pull metrics, get capabilities |
| Commands | Send command, get command status |
| Logs | Tail logs, fetch historical logs |
| Settings | Get/set worker settings, device config |
| Comments | Add, edit, delete device comments |
| Stats | Aggregated site statistics |
| Health | Worker health status |

## WebSocket

Connect to `ws://localhost:3000/ws` for real-time telemetry subscriptions. Authentication is required in production mode.

## Configuration

Config files are written to `opts.root/config/facs/` by `startAppNode()`. Example files ship in `backend/core/app-node/config/facs/*.example`. Edit the generated files to persist your changes across restarts.

| File | Controls |
|------|---------|
| `auth.config.json` | JWT secret, session settings |
| `httpd.config.json` | Fastify HTTP server options |
| `httpd-oauth2.config.json` | OAuth2 providers (Google, Microsoft) |
| `store.config.json` | SQLite and Hyperbee storage paths |
| `net.config.json` | IP assignment (DHCP facility) |
| `logging.config.json` | Log level, format |

## ORK Connection

The App Node connects to ORK over IPC (Unix socket) by default. The socket path is configured in `common.json`:

```json
{ "orkIpc": "/tmp/mdk/ork.sock" }
```

Override via `startAppNode({ orkIpc: '/custom/path.sock' })` or pass `orkIpc: false` to disable the MDK client (useful when testing without a live ORK).

## Security Model

- UI and AI agents authenticate via **JWT Bearer tokens**
- ORK is protected by an HRPC **whitelist** — the App Node's public key must be in ORK's allowed list
- Once whitelisted, ORK trusts all messages from the App Node implicitly; user-level auth is the App Node's responsibility
- AI agents are treated as authenticated clients — they go through the same JWT/RBAC path as human API consumers

## Extending the App Node

Add custom routes by passing `additionalRoutes` to `startAppNode()`:

```js
await startAppNode({
  ork,
  additionalRoutes: [
    {
      method: 'GET',
      url: '/custom/endpoint',
      handler: async (req, reply) => { return { ok: true } }
    }
  ]
})
```

## Running Standalone

```bash
cd backend/core/app-node
npm install
npm run dev        # Development mode on port 3000
npm start          # Production mode
```

## Directory Layout

```
app-node/
├── workers/
│   └── http.node.wrk.js     # WrkServerHttp — Fastify worker
├── config/
│   └── facs/                # Example config files (*.json.example)
├── db/                      # SQLite database files
├── store/                   # Hyperbee storage
└── tests/
    ├── unit/
    └── integration/
        ├── api.test.js      # HTTP route tests
        └── ws.test.js       # WebSocket tests
```
