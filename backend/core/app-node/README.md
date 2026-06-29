# App Node

## Overview

[App Node](../../../docs/concepts/stack/app-node.md), `@tetherto/mdk-app-node`, wraps [`@tetherto/mdk-client`](../client/README.md)
and delivers an authenticated HTTP, WebSocket, and MCP interface for consumers that need those capabilities.
It handles authentication, RBAC, fleet aggregation, and MCP endpoint exposure on top of the [ORK kernel](../ork/README.md).
For use cases that do not need the App Node's HTTP surface, RBAC, or plugin system, see
[Use an alternative gateway](../../../docs/concepts/stack/app-node.md#use-an-alternative-gateway).

> [!TIP] 
> New to the App Node? Read the [App Node concept page](../../../docs/concepts/stack/app-node.md). 
> Ready to run it? Follow the [run guide](../../../docs/how-to/app-node/run.md).

> [!NOTE]
> The App Node connects to ORK via [`@tetherto/mdk-client`](../client/README.md). While
> `startAppNode()` currently accepts one ORK endpoint — `ork`, `orkKey`, or `orkIpc`,
> multi-site aggregation (a single App Node fronting several per-site ORK kernels via `mdk-client`) is
> on the roadmap.

## HTTP API overview

The App Node exposes two categories of REST routes:

**Core ORK-proxy routes** — hardcoded in `workers/lib/server/routes/`, always present:

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

**Plugin routes** — loaded through the plugin system, extendable via `extraPluginDirs`:

| Plugin | Routes |
|--------|--------|
| `auth` | `/auth/userinfo`, `/auth/token`, `/auth/permissions`, `/auth/ext-data` |
| `telemetry` | `/auth/metrics/*` (hashrate, consumption, efficiency, temperature, containers) |
| `site-hashrate` | `/api/site/hashrate-history` |

The [plugin reference](../plugins/README.md) lists every default route, its method, auth requirement, and parameters.

## WebSocket subscriptions

Connect to `ws://localhost:3000/ws` for real-time telemetry subscriptions. Authentication is required in production mode.

## Configuration

Config files are written to `opts.root/config/facs/` by `startAppNode()`. Example files ship in `backend/core/app-node/config/facs/*.example`.
Edit the generated files to persist your changes across restarts.

| File | Controls |
|------|---------|
| `auth.config.json` | JWT secret, session settings |
| `httpd.config.json` | Fastify HTTP server options |
| `httpd-oauth2.config.json` | OAuth2 providers (Google, Microsoft) |
| `store.config.json` | SQLite and Hyperbee storage paths |
| `net.config.json` | IP assignment (DHCP facility) |
| `logging.config.json` | Log level, format |

## ORK connection

Two transports are available. Pass exactly one to `startAppNode()`:

**IPC (default — same host)**

The App Node dials ORK over a Unix socket. The default socket path is `os.tmpdir()/mdk/ork.sock`.

```json
{ "orkIpc": "/tmp/mdk/ork.sock" }
```

Override via `startAppNode({ orkIpc: '/custom/path.sock' })` or pass `orkIpc: false` to disable the MDK client
(useful when testing without a live ORK).

**HRPC (cross-host)**

When ORK runs on a separate host, pass the ORK HRPC gateway public key. This selects the HRPC transport and disables IPC automatically:

```js
await startAppNode({ orkKey: '<ork-gateway-pubkey-hex>' })
```

Obtain the ORK gateway key with `ork.getPublicKey().toString('hex')` on the host running ORK, then share it with the App Node host.

Pre v1.0, ORK's `auth.whitelist` defaults to empty (any HRPC caller is admitted). When an allowlist is configured, the App Node's DHT
public key must be added before the connection is accepted — see [ORK transports](../ork/README.md#transports).

## Security model

- UI and AI agents authenticate via **JWT Bearer tokens**
- **ORK connection security** depends on the transport:
  - **IPC (same host, default)**: implicit trust — no allowlisting needed
  - **HRPC (remote ORK)**: ORK maintains an HRPC firewall; the App Node's DHT public key must be in ORK's `auth.whitelist`.
  See [ORK Transports](../ork/README.md#transports) and the [`auth-whitelist` example](../../../examples/backend/ork/auth-whitelist.js)
  for the key exchange pattern.
- Once connected, ORK trusts all messages from the App Node implicitly; user-level auth is the App Node's responsibility
- AI agents are treated as authenticated clients, going through the same JWT/RBAC path as human API consumers

## Extend the App Node

### Plugin system (recommended)

Pass plugin directories via `extraPluginDirs` to load additional routes at startup alongside the default plugins:

```js
await startAppNode({
  ork,
  extraPluginDirs: [
    path.join(__dirname, 'plugins/my-metrics')
  ]
})
```

Plugins receive `(req, services)` in every controller, where `services.mdkClient` and `services.dataProxy` give access to ORK
and historical data without any protocol knowledge. The default plugins (`auth`, `telemetry`, `site-hashrate`) are loaded the same way.

The [plugin authoring guide](../../../docs/how-to/app-node/plugins.md) and the [plugin reference](../plugins/README.md) cover the full manifest schema, controller
contract, services bag, and loader errors.

### Raw Fastify routes

For one-off handlers that do not need the plugin manifest format, pass `additionalRoutes` directly:

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

These are registered as plain Fastify routes — no `services` injection, no manifest validation, no auth wiring.

## Directory layout

```
app-node/
├── workers/
│   ├── http.node.wrk.js          # WrkServerHttp — Fastify worker, mounts plugins and routes
│   └── lib/
│       ├── plugin-loader.js      # Loads mdk-plugin.json manifests, validates structure
│       ├── plugin-adapter.js     # Converts plugin routes to Fastify handlers, wires auth/cache
│       ├── auth.js               # JWT validation, OAuth2 callbacks
│       ├── data.proxy.js         # Historical data aggregation via worker tail-logs
│       └── server/               # Raw Fastify route definitions (non-plugin routes)
├── config/
│   └── facs/                     # Example config files (*.json.example)
├── db/                           # SQLite database files
├── store/                        # Hyperbee storage
└── tests/
    ├── unit/
    └── integration/
        ├── api.test.js           # HTTP route tests
        └── ws.test.js            # WebSocket tests
```

## Next steps

- Understand the [App Node as a development surface](../../../docs/concepts/stack/app-node.md)
- [Run the App Node](../../../docs/how-to/app-node/run.md)
- [Add routes with the plugin system](../../../docs/how-to/app-node/plugins.md)
- Browse the [default plugin route reference](../plugins/README.md)
- See a complete [worked example](../../../examples/full-site/README.md)
- Browse the [`startAppNode()` options](../mdk/README.md)
