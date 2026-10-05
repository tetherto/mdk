# Gateway

## Overview

The Gateway is a container that hosts [plugins](#extend-the-gateway): each plugin defines its own routes and business logic, and
opens its own connection to Kernel.

The Gateway, `@tetherto/mdk-gateway`, delivers an HTTP interface on top of the
[Kernel](../kernel/README.md): each plugin builds its own [`@tetherto/mdk-client`](../client/README.md) from its context to reach
the Kernel, which routes a query to whichever [Worker](../../workers/README.md) owns the target device.

Authentication is not among its responsibilities, as the [security model](#security-model) sets out.

> [!NOTE]
> The Gateway's responsibilities stop at sending the request to the right controller and returning whatever that controller produces;
> it never combines results from more than one controller itself. The route (the URL your app calls) is handled entirely by the plugin
> that declared it. That plugin's "controller" must build the whole answer
> and hand it back as the HTTP response. If a route needs to combine telemetry from many
> devices, such as total hashrate across every miner on site, that happens inside that one controller, which must
> query every relevant Worker and aggregate the results.

## HTTP API overview

The Gateway declares no application routes of its own. Every REST route it serves comes from one of three places, all wired in
[`http.node.wrk.js`](workers/http.node.wrk.js):

| Source | How it arrives |
|--------|----------------|
| Plugins | Every plugin the stack declares in `spec.gateway.plugins[]`, or that you pass as `extraPluginDirs` — and nothing else |
| [`additionalRoutes`](#raw-fastify-routes) | Raw Fastify route objects you pass to `startGateway()` |
| `GET /echo` | A debug route contributed by the httpd facility's `addDefaultRoutes` |

Which paths that adds up to is a property of the manifests, not of the Gateway. The
[plugin route reference](../plugins/README.md#plugins-mdk-ships) lists every route the plugins MDK ships serve, generated from their
`mdk-plugin.json` files so it cannot drift.

> [!IMPORTANT]
> A Gateway loads **only** what it is told to load. A stack that wants `telemetry`, `site-hashrate` or `site-monitor` names
> it like any other package — `package: "@tetherto/mdk-plugins/telemetry"` — and a stack that does not gets `404` on
> those paths. See [declaring a plugin MDK ships](../plugins/README.md#declare-a-plugin-in-your-stack).

## Live data

The Gateway has no push channel — clients poll its HTTP routes for updates.

> To see an example of this, consider the [React adapter](../../../ui/packages/react-adapter/README.md) which does this on fixed cadences for its
> hooks (for example, `useThingDetail` polls every 20 seconds, `useExplorerList` every 60).
> Note, while the poll cadence is a real Gateway fact, the route those two hooks poll,
> `/auth/list-things`, is illustrative — it is not served by any [built-in plugin](../plugins/README.md#plugins-mdk-ships). Get live data out of these hooks by
> writing a [Gateway plugin](../../../docs/guides/gateway/plugins.md) that serves the shape the hook expects;
> see each hook's own JSDoc for its exact endpoint and disclosure.

## Configuration

Config files are written to `opts.root/config/facs/` by `startGateway()`. Example files ship in `backend/core/gateway/config/facs/*.example`.
Edit the generated files to persist your changes across restarts.

| File | Controls |
|------|---------|
| `httpd.config.json` | Fastify HTTP server options |
| `store.config.json` | SQLite and Hyperbee storage paths |
| `net.config.json` | IP assignment (DHCP facility) |
| `logging.config.json` | Log level, format |

> [!NOTE]
> No config file here controls [authentication](../../../docs/guides/gateway/plugins.md#auth-and-permissions), because the Gateway performs none.
> Callers must be validated by your own identity layer, invoked from the controllers that need it.

## Kernel connection

> [!NOTE]
> `startGateway()`, used throughout this section, is exported by [`@tetherto/mdk-core`](../mdk/README.md), not by this
> `@tetherto/mdk-gateway` package. A Gateway connects to exactly one Kernel; fronting several per-site
> Kernels from a single Gateway is not supported.

The Gateway dials Kernel over HRPC (`@hyperswarm/rpc`) using the Kernel's listener public key. `startGateway()` resolves that key
**before any boot side effects**, in this order:

1. `kernelKey`: hex string or Buffer. Pass `kernelKey: false` to run without a Kernel connection (useful when testing without a live Kernel;
a plugin's own `mdkClient` still builds, but its calls fail per request with [`ERR_MDK_CLIENT_UNAVAILABLE`](../client/README.md#createmdkclientconfig-opts--auto-connecting-client)).
2. `kernel`: an in-process `KernelManager` handle; the key comes from `kernel.getPublicKey()`.
3. Key file: `keyFile` (default: `DEFAULT_KEY_FILE`, i.e. `os.tmpdir()/mdk/.kernel-key`), which `getKernel()` publishes on start.
4. If none resolves, `startGateway()` throws `ERR_KERNEL_KEY_FILE_NOT_FOUND`.

**Zero-config (same host, default)**: Start the Kernel with `getKernel()`, then `startGateway()` with no endpoint options: the
Gateway picks the key up from the key file automatically.

**Cross-host**: Obtain the Kernel listener key with `kernel.getPublicKey().toString('hex')` on the host running Kernel, then pass
it on the Gateway host:

```js
await startGateway({ kernelKey: '<kernel-listener-pubkey-hex>' })
```

For testnets, pass `bootstrap` to thread custom DHT bootstrap nodes to each plugin's own client.

Note the resolution happens in `startGateway()`, not in the worker: the Gateway worker ([`http.node.wrk.js`](workers/http.node.wrk.js)) consumes `ctx.kernelKey`
(plus optional `ctx.kernelBootstrap`) and deliberately does not read the key file itself — raw [`worker.js`](./worker.js) boots must pass
`ctx.kernelKey` explicitly. The worker itself never dials Kernel; it only hands the resolved key to each plugin's context. If the
HRPC connect fails, that plugin's own client fails its calls with `ERR_MDK_CLIENT_UNAVAILABLE` instead of crashing the HTTP server.

Pre v1.0, Kernel's allowlist, `auth.whitelist` defaults to empty (any HRPC caller is admitted). When an allowlist is configured, the [Gateway's persistent DHT
public key must be added before the connection is accepted](../kernel/README.md#transports); it stays stable across restarts.

## Security model

- **No built-in user authentication**: the Gateway serves the routes its plugins declare to any caller. Validating callers is work each controller
  does for itself, using an identity layer you supply
  ([auth and permissions](../../../docs/guides/gateway/plugins.md#auth-and-permissions))
- **Kernel connection security**: the HRPC connection is an encrypted Noise channel. Kernel maintains an HRPC firewall; when
  `auth.whitelist` is configured, the Gateway's persistent DHT public key must be in Kernel's `auth.whitelist` (pre v1.0 the default is an
  empty allowlist, so any caller is admitted).
  See [Kernel Transport](../kernel/README.md#transports) and the [`auth-whitelist` example](../../../examples/backend/kernel/auth-whitelist.js)
  for the key exchange pattern
- Once connected, Kernel trusts all messages from the Gateway implicitly, apart from the device-family write permissions it requires in the
  `authPerms` array accompanying each write action
- Human and AI callers reach the same routes on the same terms, since the Gateway distinguishes neither

## Extend the Gateway

### Plugin system (recommended)

Pass plugin directories via `extraPluginDirs` to load their routes at startup:

```js
await startGateway({
  kernel,
  extraPluginDirs: [
    path.join(__dirname, 'plugins/my-metrics')
  ]
})
```

Plugins receive `(req)` in every controller, and each builds its own `@tetherto/mdk-client` from the
context config it reads via `require('@tetherto/mdk-gateway/plugin')`. The plugins MDK ships load the same way, only
when a stack declares them; nothing auto-registers.

The [plugin authoring guide](../../../docs/guides/gateway/plugins.md) and the [plugin reference](../plugins/README.md) cover the full
manifest schema, controller contract, and plugin context, and [what the loader throws](#errors) is documented here.

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

These are registered as plain Fastify routes: no plugin context and no manifest validation. Unlike a plugin controller, the handler
receives the Fastify `reply`, so this is the way to control status codes.

## Errors

[`loadPlugin()`](workers/lib/plugin-loader.js) validates every manifest and handler at startup and throws on the
first problem:

| Code | Fires when | Fix |
| --- | --- | --- |
| `ERR_PLUGIN_MANIFEST_MISSING` | No `mdk-plugin.json` in the plugin directory | Add the manifest, or drop the directory from `extraPluginDirs` |
| `ERR_PLUGIN_MANIFEST_INVALID` | The manifest fails to parse as JSON, parses to a non-object value (e.g. a bare string or number), or is missing `name`, `version`, `routes`, or a route is missing `id`/`handler`/a valid `method`/`path`. A JSON array manifest passes the object check and fails on the missing `name` field instead — same code, different message. | Fix the field the error message names |
| `ERR_PLUGIN_ROUTE_DUPLICATE_ID` | Two routes in the same manifest share an `id` | Rename one of the duplicate route ids |
| `ERR_PLUGIN_HANDLER_NOT_FOUND` | A route's `handler` file path doesn't exist or fails to load | Fix the `handler` path for that route |
| `ERR_PLUGIN_HANDLER_NOT_FUNCTION` | A route's resolved handler module (or named export) isn't a function | Export a function from the file |

## Directory layout

```text
gateway/
├── workers/
│   ├── http.node.wrk.js          # WrkServerHttp — Fastify worker, mounts plugins and routes
│   └── lib/
│       ├── plugin-loader.js      # Loads mdk-plugin.json manifests, validates structure
│       ├── plugin-adapter.js     # Converts plugin routes to Fastify handlers, applies caching
│       ├── plugin-gateway.js     # Builds each plugin's per-plugin context ({ config })
│       ├── constants.js
│       ├── utils.js
│       └── server/lib/           # cachedRoute.js and send200.js, used by the adapter
├── config/
│   └── facs/                     # Example config files (*.json.example)
├── db/                           # SQLite database files
└── tests/
    ├── unit/lib/                 # One suite per lib module
    └── integration/
        └── api.test.js           # HTTP route tests
```

## Next steps

- [Run the Gateway](../../../docs/guides/gateway/run.md)
- [Add routes with the plugin system](../../../docs/guides/gateway/plugins.md)
- Browse the [supported plugins reference](../../../docs/reference/supported-plugins.md)
- See a complete [worked example](../../../examples/full-site/README.md)
- Browse the [`startGateway()` options](../mdk/README.md)
- Reach MDK over MCP — run the standalone [`@tetherto/mdk-mcp`](../mcp/README.md) process (`mdk run mcp`), which derives
  tools from this Gateway's own plugins without the Gateway hosting any MCP code itself
- Skip the HTTP surface and plugin system entirely by [connecting to Kernel directly](../client/README.md) with
  `@tetherto/mdk-client` — viable for a background service that only dispatches commands, though most applications build on the Gateway
