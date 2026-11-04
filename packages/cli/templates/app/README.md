# __PLUGIN_NAME__

An MDK **app** — HTTP endpoints that aggregate data from your workers'
devices over the MDK protocol. An app is an app manifest ([`mdk-app.yaml`](./mdk-app.yaml))
plus its plugin: a route manifest ([`plugin/mdk-plugin.json`](./plugin/mdk-plugin.json)) and one controller module per route;
`mdk run` runs it in its own process and the Gateway forwards each route to it. There is no root export.

## Layout

```
mdk-app.yaml                # app manifest: id, version, displayName, permissions, config defaults
plugin/mdk-plugin.json      # route manifest: id, handler, http.method + http.path
plugin/lib/client.js        # the app runtime's Kernel client, from @tetherto/mdk-gateway/plugin
plugin/controllers/*.js     # one module per route: async (req) => result
plugin/types.d.ts           # response types, shared by the controllers and the UI
```

Controllers are CommonJS: the app runtime loads `.js` and `.cjs` from `plugin/`. To type them, keep each route's
response type in `plugin/types.d.ts` and annotate the controller with `// @ts-check`, `@param {AppRequest} req` and a
JSDoc `@returns`, as `controllers/summary.js` does. The UI in `ui-src/` imports the same type with `import type`, so a
change to a route's shape fails the type check on both sides instead of at runtime. `npm run typecheck` checks both
(`typecheck:plugin` and `typecheck:ui` check one each), with the TypeScript installed in `ui-src/`.

Each controller receives `req` (`{ params, query, body, headers }`). Talk to
the Kernel through the client in `plugin/lib/client.js`, which the app runtime
provides through the ambient import override:

```js
const { config } = require('@tetherto/mdk-gateway/plugin')
module.exports = config.mdkClient
```

The app runtime freezes a per-plugin context onto
`@tetherto/mdk-gateway/plugin`: `config`
holds the `config` defaults in `mdk-app.yaml`, overridden by this app's
`spec.apps[].config` block, and `mdkClient`, a Kernel client signed in as the
app's service account (`app:<name>`). The Kernel checks every call against the
roles `spec.rbac` binds to that account, and `mdk add app` writes one granting
exactly the `permissions` this manifest requests.
Controllers do **not** take `mdkClient` from a `services` parameter.

The return value is sent as JSON (HTTP 200), so return plain data: a `Buffer` would arrive as its JSON form. Throw
`Error('ERR_...')` to return a 400.

Mark a route that only reads with `"safety": "read-only"`: `mdk run mcp` turns routes into agent tools and
withholds every other one as a write unless it is started with `--allow-write`. Mark a route that changes
devices with `"safety": "write"`.

No route is open: a caller needs an access token (`401` without one) and a
`spec.rbac` rule for the route (`403` without one). So a route needs a rule in the
stack's `mdk.yaml` as well as a handler here.

## Run it

This app is registered in your stack's `mdk.yaml` under `spec.apps` by
**package name** and resolved from `node_modules` (a `file:` dependency in the project's `package.json` links it):

```yaml
spec:
  apps:
    - name: __PLUGIN_APP__
      package: __PACKAGE_NAME__
      config: {}
```

Then boot the stack:

```bash
mdk run             # Kernel, workers, this app and the Gateway together
# or run the app on its own next to `mdk run kernel` and `mdk run gateway`:
mdk run app __PLUGIN_APP__
```

Call it: `GET http://localhost:<gatewayPort>/apps/__PLUGIN_APP__/api/__PLUGIN_NAME__/summary`
(set `mount` on the app entry to serve it under another prefix).
