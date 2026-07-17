# Gateway

## Overview

The Gateway is where your business logic is defined and you can extend the logic with [plugins](#extend-the-gateway). It's your Node.js server 
that connects to the Kernel over HRPC, sends typed queries and receives aggregated responses. You decide what happens to your telemetry data.

[Gateway](../../../docs/concepts/stack/gateway.md), `@tetherto/mdk-gateway`, wraps [`@tetherto/mdk-client`](../client/README.md)
and delivers an authenticated HTTP, WebSocket, and MCP interface for consumers that need those capabilities.
It handles authentication, RBAC, fleet aggregation, and MCP endpoint exposure on top of the [Kernel](../kernel/README.md).
For use cases that do not need the Gateway's HTTP surface, RBAC, or plugin system, see
[Connect without the Gateway](../../../docs/concepts/stack/gateway.md#connect-without-the-gateway).

> [!TIP] 
> New to the Gateway? Read the [Gateway concept page](../../../docs/concepts/stack/gateway.md). 
> Ready to run it? Follow the [run guide](../../../docs/guides/gateway/run.md).

> [!NOTE]
> The Gateway connects to Kernel via [`@tetherto/mdk-client`](../client/README.md). While
> `startGateway()` currently accepts one Kernel endpoint — `kernel`, `kernelKey`, or a key file,
> multi-site aggregation (a single Gateway fronting several per-site Kernel kernels via `mdk-client`) is
> on the roadmap.

## HTTP API overview

The Gateway exposes two categories of REST routes:

**Core Kernel-proxy routes** — hardcoded in `workers/lib/server/routes/`, always present:

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

Config files are written to `opts.root/config/facs/` by `startGateway()`. Example files ship in `backend/core/gateway/config/facs/*.example`.
Edit the generated files to persist your changes across restarts.

| File | Controls |
|------|---------|
| `auth.config.json` | JWT secret, session settings |
| `httpd.config.json` | Fastify HTTP server options |
| `httpd-oauth2.config.json` | OAuth2 providers (Google, Microsoft) |
| `store.config.json` | SQLite and Hyperbee storage paths |
| `net.config.json` | IP assignment (DHCP facility) |
| `logging.config.json` | Log level, format |

## Kernel connection

The Gateway dials Kernel over HRPC (`@hyperswarm/rpc`) using the Kernel's listener public key. `startGateway()` resolves that key
**before any boot side effects**, in this order:

1. `kernelKey` — hex string or Buffer. Pass `kernelKey: false` to run without a Kernel connection (useful when testing without a live Kernel; 
`services.mdkClient` stays `null`).
2. `kernel` — an in-process `KernelManager` handle; the key comes from `kernel.getPublicKey()`.
3. Key file — `keyFile` (default: `DEFAULT_KEY_FILE`, i.e. `os.tmpdir()/mdk/.kernel-key`), which `getKernel()` publishes on start.
4. If none resolves, `startGateway()` throws `ERR_KERNEL_KEY_FILE_NOT_FOUND`.

**Zero-config (same host, default)** — start the Kernel with `getKernel()`, then `startGateway()` with no endpoint options: the
Gateway picks the key up from the key file automatically.

**Cross-host** — obtain the Kernel listener key with `kernel.getPublicKey().toString('hex')` on the host running Kernel, then pass
it on the Gateway host:

```js
await startGateway({ kernelKey: '<kernel-listener-pubkey-hex>' })
```

For testnets, pass `bootstrap` to thread custom DHT bootstrap nodes to the Gateway's Client.

Note the resolution happens in `startGateway()`, not in the worker: the Gateway worker (`http.node.wrk.js`) consumes `ctx.kernelKey`
(plus optional `ctx.kernelBootstrap`) and deliberately does not read the key file itself — raw `worker.js` boots must pass
`ctx.kernelKey` explicitly. If the HRPC connect fails, the worker degrades gracefully (`mdkClient = null`) instead of crashing the
HTTP server.

Pre v1.0, Kernel's `auth.whitelist` defaults to empty (any HRPC caller is admitted). When an allowlist is configured, the Gateway's DHT
public key must be added before the connection is accepted — see [Kernel transport](../kernel/README.md#transports).

## Security model

- UI and AI agents authenticate via **JWT Bearer tokens**
- **Kernel connection security**: the HRPC connection is an encrypted Noise channel. Kernel maintains an HRPC firewall; when
  `auth.whitelist` is configured, the Gateway's DHT public key must be in Kernel's `auth.whitelist` (pre v1.0 the default is an
  empty allowlist — any caller is admitted).
  See [Kernel Transport](../kernel/README.md#transports) and the [`auth-whitelist` example](../../../examples/backend/kernel/auth-whitelist.js)
  for the key exchange pattern.
- Once connected, Kernel trusts all messages from the Gateway implicitly; user-level auth is the Gateway's responsibility
- AI agents are treated as authenticated clients, going through the same JWT/RBAC path as human API consumers

## Extend the Gateway

### Plugin system (recommended)

Pass plugin directories via `extraPluginDirs` to load additional routes at startup alongside the default plugins:

```js
await startGateway({
  kernel,
  extraPluginDirs: [
    path.join(__dirname, 'plugins/my-metrics')
  ]
})
```

Plugins receive `(req, services)` in every controller, where `services.mdkClient` and `services.dataProxy` give access to Kernel
and historical data without any protocol knowledge. The default plugins (`auth`, `telemetry`, `site-hashrate`) are loaded the same way.

The [plugin authoring guide](../../../docs/guides/gateway/plugins.md) and the [plugin reference](../plugins/README.md) cover the full 
manifest schema, controller contract, services bag, and loader errors.

### Raw Fastify routes

For one-off handlers that do not need the plugin manifest format, pass `additionalRoutes` directly:

```js
await startGateway({
  kernel,
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
gateway/
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

- Understand the [Gateway as a development surface](../../../docs/concepts/stack/gateway.md)
- [Run the Gateway](../../../docs/guides/gateway/run.md)
- [Add routes with the plugin system](../../../docs/guides/gateway/plugins.md)
- Browse the [default plugin route reference](../plugins/README.md)
- See a complete [worked example](../../../examples/full-site/README.md)
- Browse the [`startGateway()` options](../mdk/README.md)
