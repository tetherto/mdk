---
title: Gateway apps
description: Build, publish, and install MDK apps with the mdk-app.yaml manifest, the mdk-plugin.json route table, and a UI module
docs@tether_slug: guides/gateway/apps
---

## Overview

The Gateway serves HTTP routes from apps. An app is a package with an `mdk-app.yaml` manifest, a route table
(`mdk-plugin.json`, in `plugin/` or at the package root) and one controller file per route. Each app runs in its own process
under [`@tetherto/mdk-app-runtime`][app-runtime-readme]: the Gateway reads only the route table and forwards each request to
that runtime over HRPC, so no app code runs inside the Gateway. A Gateway serves exactly the apps your stack declares in
`spec.apps[]` and nothing else.

> [!NOTE]
> An app builds its own [`@tetherto/mdk-client`][mdk-client-readme] to call into the Kernel. No knowledge of the MDK
> Protocol envelope or internal message shapes is required.

## Prerequisites

- The [`mdk` CLI is installed][cli-install], with a project `mdk.yaml` (`mdk onboard` writes one)

## Apps MDK ships

Each app MDK ships lives in its own repository, listed in the [supported apps reference][supported-apps], and its
README documents the routes it serves. Declare one by package name:

```yaml
# mdk.yaml
spec:
  gateway:
    port: 3847
  apps:
    - name: demo
      package: "@tetherto/mdk-app-demo"
```

> [!IMPORTANT]
> A stack serves only the apps it declares. Any other path answers `404`. If a [React adapter][react-adapter] hook reads a
> route, declare the app that serves it.

Third-party apps are documented by their own manifests. `mdk add app <source>` installs one from npm or GitHub, checks it
with the same rules as `mdk validate app`, and only then adds it under `spec.apps`.

<Steps>

<Step>

### Create an app

```bash
mdk create app fleet
```

This scaffolds `apps/fleet`, links it into the project's `package.json`, and adds it under `spec.apps` in `mdk.yaml`
(`--no-stack-entry` prints the entry instead). For an app that lives in its own repo and installs with
`mdk add app github:<owner>/<repo>#<tag>`, run `mdk create app fleet --flat` in the repo instead: it scaffolds at the repo root and touches no
project. The scaffold carries one read-only summary route:

```text
apps/fleet/
├── mdk-app.yaml               # app manifest
├── package.json
└── plugin/
    ├── mdk-plugin.json        # route table
    ├── lib/client.js          # the app's MDK client
    ├── types.d.ts             # response types, shared with the UI
    └── controllers/summary.js # one module per route
```

`mdk-app.yaml` describes the app to the operator:

| Field         | Status   | Description                                                                     |
| ------------- | -------- | ------------------------------------------------------------------------------- |
| `id`          | Required | Reverse-DNS id, e.g. `com.example.fleet`                                        |
| `version`     | Required | Semver, equal to the `package.json` version                                     |
| `displayName` | Required | Human name                                                                      |
| `description` | Optional | One-line summary                                                                |
| `permissions` | Required (`[]` for none) | Rules `{ resources, verbs, resourceNames? }` the app asks the operator to approve |
| `config`      | Optional | Default config handed to the controllers                                        |
| `main`        | Optional | The app's background logic, `<file>[#export]` beside the route table. Called as `main(config, context)` and awaited before the runtime first serves, so a store or collector it sets up is ready for the controllers |

> [!IMPORTANT]
> The Kernel enforces `spec.rbac` on every call the app makes. `mdk add app` grants the app's service account (`app:<name>`)
> exactly these `permissions`, as a role in `mdk.yaml` the operator may narrow, so request every Kernel resource the app
> reads or writes: a call outside them throws `ERR_KERNEL_ACTION_FORBIDDEN` and reaches HTTP as `403`.

`mdk validate app fleet` checks the manifest, its version against `package.json`, the permission rules and the route
table, by the same rules the app runtime and the Gateway apply at boot (the version check is the validator's own), and
that `spec.rbac` in `mdk.yaml` grants `app:fleet` what the manifest requests.

</Step>

<Step>

### Write the routes

#### 2.1 Edit the route table

`mdk-plugin.json` declares the plugin identity (`name`, `version`) and a `routes` array. Each route needs an `id`, a
`handler` path, and either an `http` block with a `method` and `path`, or those same `method`/`path` fields flattened to the route's top level;
the agent app uses the flat form. Rather than copy a synthetic example, start from a real manifest and trim it:

- [`examples/mvp-site/backend/gateway-plugins/site/mdk-plugin.json`][mvp-site-manifest]: four routes including `GET`s with query
parameters, and `POST`s with a `requestBody` and path parameters
- `mdk-app-demo/mdk-plugin.json`: two read-only `GET` routes with query parameters, each annotated with `safety`
- `mdk-app-agent/mdk-plugin.json`: `auth: true` routes in the flat form, one of them a stream route

The two apps live in [their own repositories][supported-apps-availability]; the `mvp-site` manifest is the one in this
repository.

Path parameters use `{param}` syntax — the loader normalises them to Fastify's `:param` format. For named exports use `"handler":
"./controllers/foo.js#namedExport"`. The loader enforces the fields; [what it refuses, and why][gateway-readme-errors] is the
Gateway README's `ERR_PLUGIN_MANIFEST_INVALID` row.

#### 2.2 Write a controller

A controller builds its own [`@tetherto/mdk-client`][mdk-client-readme] once, from the app's
context config, in a `lib/client.js` every controller in the app requires.

Every controller exports an `async function (req)`:

```js
// controllers/live.js — read live telemetry
const mdkClient = require('../lib/client')

module.exports = async function live (req) {
  const deviceId = req.query.deviceId
  const telemetry = await mdkClient.pullTelemetry(deviceId, 'metrics')
  return { deviceId, ...telemetry }
}
```

A write a user asks for goes through `req.mdk`, the request's Kernel client. It acts for the signed-in user, so the Kernel checks
their own `spec.rbac` rules as well as the app's, and the write-command log records them via the app:

```js
// controllers/command.js — dispatch a command for the signed-in user
module.exports = async function command (req) {
  const deviceId = req.params.deviceId
  const { mode } = req.body

  const result = await req.mdk.sendCommand(deviceId, 'setPowerMode', { mode })

  return {
    deviceId,
    commandId: result.commandId,
    status: result.status
  }
}
```

</Step>

<Step>

### Declare and mount it

`mdk create app` already wrote this entry; a hand-written one has the same shape:

```yaml
spec:
  apps:
    - name: fleet          # ^[a-z][a-z0-9-]*$, unique in the stack
      package: fleet       # npm name or local path
      config: {}           # optional: overrides the mdk-app.yaml config defaults
      mount: /             # optional: serve the routes at the root instead of /apps/fleet
```

The Gateway serves an app's routes under `/apps/<name>` unless `mount` is set, so the scaffold's `GET /api/fleet/summary`
answers at `/apps/fleet/api/fleet/summary`, or at `/api/fleet/summary` with `mount: /`. Mount an app at the root only when a
client calls its paths there, as the [agent app][agent-plugin-readme] needs for its UI.

</Step>

<Step>

### Run it

```bash
mdk run             # Kernel, Workers, one runtime process per app, then the Gateway
mdk run app fleet   # or only this app, in the foreground, beside `mdk run kernel` and `mdk run gateway`
```

The runtime loads the route table and every handler before it serves, so a missing file or invalid manifest fails that app
at startup. It accepts calls only from the Gateway's key (`.mdk/gateway.key`); until it is up, its routes answer `503`.

No route is open, so [sign in and send the access token](#call-a-route) to reach
`http://localhost:3847/apps/fleet/api/fleet/summary`.

[Exposing an app's routes to the operator agent][expose-data] turns them into MCP tools with no separate manifest.

</Step>

</Steps>

### The app's UI module

An app's routes are one half of it, and this is the other. `ui/index.js` default-exports `defineMdkApp` from
[`@tetherto/mdk-react-adapter`][react-adapter], which types the contract a shell loads:

```tsx
// ui-src/index.tsx, built to ui/index.js
export default defineMdkApp({
  id: 'com.example.fleet',
  displayName: 'Fleet',
  routes: [{ path: '', component: Overview }],
  panels: [{ id: 'drift', slot: 'home', component: DriftCard }]
})
```

`mdk create app` scaffolds `ui-src/` with one page and one Home panel, plus a placeholder `ui/index.js` that
`npm run build:ui` replaces.

#### Share response types with the UI

Controllers are CommonJS JavaScript: the app runtime loads `.js` and `.cjs` from `plugin/`, so a TypeScript controller
must be compiled to one first. Type a route's response once, in `plugin/types.d.ts`, and check both halves against it. The
controller names the type with JSDoc under `// @ts-check`, and the UI imports it with `import type`, which the UI build erases:

```js
// plugin/controllers/summary.js
// @ts-check
/** @typedef {import('../types').AppRequest} AppRequest */
/** @typedef {import('../types').Summary} Summary */

/**
 * @param {AppRequest} req
 * @returns {Promise<Summary>}
 */
module.exports = async function summary (req) { /* ... */ }
```

```ts
// ui-src/data/summary.ts
import type { Summary } from '../../plugin/types'
```

`AppRequest` in the same file types the `req` every controller receives, so new controllers do not re-type it.
The scaffold wires the summary route this way, and `npm run typecheck` checks both halves, so renaming a field fails the
type check in the controller and in every component that reads it.

| Field         | Contains                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------ |
| `id`          | The app's reverse-DNS id. Must equal `id` in `mdk-app.yaml`: the shell checks it against the installed app's id, so a package cannot load under another app's identity |
| `displayName` | The name the shell shows, and the fallback for a route that sets no `label` or a panel that sets no `title` |
| `routes`      | Pages the shell mounts under `/app/<name>/`, in the app's own sidebar group. `path` is relative, `''` being the landing page; `label` sets the sidebar label; `section` groups the page with the others naming it; `hidden` routes a deep link without listing it |
| `sections`    | Optional. An icon for a route `section`: `label` is the `section` its routes name, `icon` a component the shell renders with no props. A section works with no entry here, which only adds what a label alone cannot |
| `panels`      | Components the shell composes into pages it owns. `slot` picks where: every MDK shell provides `MDK_APP_PANEL_SLOT.HOME`, and a shell ignores slots it does not know |

The dashboard serves its app list at `/app-ui.json`, written from the stack's `mdk.yaml` by `mdk run dashboard`. It imports
each app's `ui/index.js`, checks it against the contract, and adds its stylesheets to the page, so installing an app needs no
dashboard change: restart the dashboard and the app's pages and panels are there. An app whose UI fails to load is reported
on its own instead of taking the dashboard down.

> [!IMPORTANT]
> A built UI module imports React and the MDK packages by bare specifier, and the dashboard resolves those to its own
> instances through an import map. A shell that does not map them fails to load every app UI.

### Publish and install an app

An app is an npm package, so shipping one is `npm publish` or a Git tag. What makes it installable is what the tarball
carries and what the consumer runs.

#### Package it

`package.json` `files` has to ship `mdk-app.yaml`, `plugin/` and `ui/`. Commit the built `ui/` rather than building on
install: a GitHub install runs no build, so an unbuilt `ui/` reaches the consumer as a missing module.

```json
{
  "files": ["mdk-app.yaml", "plugin/", "ui/", "README.md"]
}
```

Run `mdk validate app <name>` before publishing or tagging. It checks the manifest, its version against `package.json`, the
permission rules and the route table by the same rules the app runtime and the Gateway apply at boot.

#### Publish it

Either source works, and an app does not have to reach npm at all:

```bash
git tag v0.2.0 && git push --tags   # install from GitHub at that tag
npm publish --access public         # or publish under your own scope
```

#### Install it

A consumer adds the app to their stack from either source, then starts it:

```bash
mdk add app @your-org/mdk-app-fleet@^1
mdk add app github:your-org/mdk-app-fleet#v0.2.0 --name fleet
mdk run
```

`mdk add app` installs with `npm install --ignore-scripts --save-exact`, so no install script of an unchecked package runs
and the exact version is recorded. It then checks the package with the same rules as `mdk validate app` and only then writes
the `spec.apps` entry, keeping the stack file's comments and formatting. A refused package leaves `mdk.yaml`, `package.json`
and the lockfile as they were. The [CLI reference][cli-add] covers `--name`, repeat installs, and the worker equivalent.

> [!NOTE]
> A GitHub source cannot be added with `--no-install`: its package name is only known once npm has fetched it.

#### Declare what it needs

An app states its own config defaults under `config` in `mdk-app.yaml`, and the operator overrides them per stack. [Supplying
per-app config](#supplying-per-app-config) covers the layering.

### Start apps from code

Outside the CLI, pass each app to `startGateway()` from `@tetherto/mdk-core` as `apps` (the complete list, nothing else is
mounted) and run each one with `createAppRuntime()`, allowing only the Gateway's key:

```js
const path = require('path')
const { startGateway } = require('@tetherto/mdk-core')
const { createAppRuntime } = require('@tetherto/mdk-app-runtime')

const appDir = path.join(__dirname, 'apps/fleet')

const runtime = createAppRuntime({
  name: 'fleet',
  appDir,
  kernelKey: kernel.getPublicKey(),
  storeDir: './run/apps/fleet',
  keyFile: './run/fleet.key',
  allowedKeyFiles: ['./run/gateway.key'],
  kernelKeyFile: './run/fleet.kernel.pub'
})
await runtime.start()
kernel.allowKey(runtime.getKernelPublicKey())

await startGateway({
  kernel,
  port: 3000,
  gatewayKeyFile: './run/gateway.key',
  apps: [{ name: 'fleet', appDir, keyFile: './run/fleet.key' }]
})
```

The runtime's Kernel key must be admitted before its controllers call the Kernel, through `kernel.allowKey()`, the Kernel's
`auth.whitelist`, or the trusted-keys directory. [`startGateway()`'s apps reference][core-apps] lists the validation errors,
and [`@tetherto/mdk-app-runtime`][app-runtime-readme] the runtime options. `startGateway()` throws
`ERR_GATEWAY_EXTRA_PLUGIN_DIRS_UNSUPPORTED` when passed `extraPluginDirs`.

### The `req` object

A controller's only argument. The controller reference documents every field
(`params`, `query`, `body`, `headers`, `_info`) and how it's assembled.

### The app's context module

`require('@tetherto/mdk-gateway/plugin')` resolves, inside an app's controllers, to that app's own frozen context. The
controller reference shows a controller building its own client from it:

| Field | Type | Contains |
| --- | --- | --- |
| `config` | `object` | The `mdk-app.yaml` `config` defaults with the app's `spec.apps[].config` layered over them key-by-key, plus `mdkClient`: the app runtime's Kernel client, signed in as the app's service account (`app:<name>`), so every call is checked against `spec.rbac` |
| `logger` | `object` | The app runtime's logger, namespaced `mdk:app:<name>` |
| `onReady` | `function` | Registers a callback that runs once the app runtime is serving, or straight away if it already is. Errors thrown inside it are caught and logged, not fatal |

### Supplying per-app config

That config isn't declared in `mdk-plugin.json`. Defaults live under `config` in `mdk-app.yaml`, and the stack spec overrides
them per app with `spec.apps[].config` (`createAppRuntime({ config })` from code):

```yaml
spec:
  apps:
    - name: custom-metrics
      package: ./apps/custom-metrics
      config:
        apiKey: ${METRICS_API_KEY}
```

Build a `lib/client.js` from it once per app and `require` that module from every controller that
needs one — there is no per-request Kernel access to guard, only the client's own connect failures:

> [!IMPORTANT]
> `createMdkClient` connects on first use and memoizes the connection. A failure maps to `ERR_MDK_CLIENT_UNAVAILABLE` (or your own
> `opts.errorCode`) and resets so the next call retries — guard the call, not a null client:
> ```js
> try {
>   return await mdkClient.pullTelemetry(deviceId, 'metrics')
> } catch (err) {
>   if (err.message === 'ERR_MDK_CLIENT_UNAVAILABLE') throw new Error('ERR_KERNEL_UNREACHABLE')
>   throw err
> }
> ```

### Read hardware data

Call the client directly for live device data — [`pullTelemetry`, `getCapabilities`, and `listWorkers`][client-readme-methods]
are documented with their return shapes in the client's own reference.

A Worker is single-device, so a live fleet-wide total — hashrate across every miner on site, say — is the controller's own job:
list every Worker, pull each device's live telemetry, and add the numbers up:

```js
const { workers } = await mdkClient.listWorkers()
const pulls = workers.flatMap((w) => (w.deviceIds || []).map(async (deviceId) => {
  const { metrics } = await mdkClient.pullTelemetry(deviceId, 'metrics')
  return metrics?.stats?.hashrate_mhs?.avg || 0
}))
const totalHashrateMhs = (await Promise.all(pulls)).reduce((sum, v) => sum + v, 0)
```

[`demo/controllers/summary.js`][demo-plugin-summary] is the smallest worked example of this fan-out, worth starting
from if you're authoring your own app.

There is no separate Gateway-side store for historical or aggregated data, either. Read the series from each Worker's own
persisted tail-log with [`pullTelemetry`][client-readme-methods], addressed to the device whose history you want:

```js
const history = await mdkClient.pullTelemetry(deviceId, { type: 'logs', key: 'stat-1D', tag: 't-miner', start, end })
```

> [!NOTE]
> A `stat-*` log is shared: the read opens the log named by `key` and `tag`, checks the tag belongs to the device you
> addressed, and returns the stored series without narrowing it to that device. So a response can include figures from
> devices the caller cannot address, and a caller scoped to one device still reads the shared total
> ([what `resourceNames` does and does not bound][rbac-scope-limits]). A tag the addressed device does not carry is
> refused with `ERR_LOG_TAG_FORBIDDEN`. Do not treat one device as standing for its whole Worker, and do not assume a
> Worker with no current devices has no retained history.

[`demo/controllers/history.js`][demo-plugin-history] is the smallest worked example — a single-file version with an
optional per-device filter and a Kernel-unavailable fallback.

Both live and historical calls are network calls through the client — guard both [the same way](#supplying-per-app-config). An
unguarded `pullTelemetry` throws `ERR_MDK_CLIENT_UNAVAILABLE` straight through to the caller as an
unhandled `500` the moment a Worker or the Kernel drops; neither path degrades more gracefully than the other.

### Send a command

[`sendCommand`][client-readme-methods] dispatches via the Kernel to the Worker that owns the device — the command
must be declared in the Worker's [`mdk-contract.json`][contract-schema]. `controllers/command.js` above shows the pattern; return shape
is `commandId`, `status`, `result`, `error`.

### Caching

Add a `"cache"` array of dot-path strings to a route to enable request-level caching. The key is the route id plus those values, so a route
whose answer depends on the caller adds an identity path such as `_info.user.userId`. On an `auth: true` route the
[auth check](#auth-and-permissions) runs before the cache lookup. A forced refresh with `?overwriteCache=true` is honored only when the
`authVerifier` returned an identity whose `perms` array holds `cache:overwrite`; any other request uses normal cache behavior.
The manifest reference shows the field in a real manifest.

### Stream routes

Add `"stream": true` to a route to own the raw `ServerResponse` instead of returning a plain value — for SSE or any
other response Fastify shouldn't serialize. The manifest reference covers the mechanism and the
handler's error behavior. [`mdk-app-agent`][agent-plugin-readme] is a shipping example — its message route
streams `text/event-stream` this way; see the [agent Gateway-deployment guide][agent-guide] for the consumer side.

### Auth and permissions

Every route of an app is checked against `spec.rbac` at the Gateway: the caller needs a bearer access token (`POST /auth/login`
issues one) and a rule granting the route's resource and verb. Without a token the Gateway answers `401 ERR_AUTH_UNAUTHORIZED`,
and without a rule `403 ERR_AUTH_FORBIDDEN`, before body validation, the cache and your controller. Who may call the route is the
operator's to set in `mdk.yaml`; the manifest only says how the route is governed:

| Route field    | Status   | Description                                                                                       |
| -------------- | -------- | ------------------------------------------------------------------------------------------------- |
| `verb`         | Optional | `get`, `list`, `create`, `update` or `delete`. Default: `GET` `get`, `POST` `create`, `PUT`/`PATCH` `update`, `DELETE` `delete` |
| `resourceName` | Optional | `{ "param": "<name>" }`, `{ "query": "<name>" }` or `{ "body": "<name>" }`: where the instance a rule's `resourceNames` matches comes from |

The resource is `<app>/<path>`: the app's name in `spec.apps` and the route's path template, so the route `/miners/:id` of
`ops-center` is `ops-center/miners/:id`. A rule for it:

```yaml
spec:
  rbac:
    roles:
      - name: rack3-tech
        rules:
          - resources: [ops-center/miners/command]
            verbs: [create]
            resourceNames: ["rack-3-*"]      # matched against the route's resourceName field
    bindings:
      - role: rack3-tech
        subjects: [{ kind: User, name: tech@example.com }]
```

The verified identity reaches the controller as `req._info`, `{ kind, sub, email?, groups? }`, so identity never comes from the
request body. [The Gateway's security model][gateway-concept-auth] lists the rest of the defaults.

#### Call a route

Sign in for an access token, then send it as a bearer token. The user to sign in as is [the first operator][first-operator]
that `mdk user add <name> --admin` creates:

```bash
TOKEN=$(curl -s -X POST http://127.0.0.1:<gateway-port>/auth/login \
  -H 'content-type: application/json' \
  -d '{"username":"<user>","password":"<password>"}' | jq -er .accessToken)

curl -s -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:<gateway-port>/apps/<app-name>/api/<domain>/<resource> | jq .
```

The token lasts minutes and the refresh token rotates on every use, so a long-running client signs in again rather than
holding one token. A browser dashboard uses [`passwordAuth()`][ui-sessions] instead of signing in this way.

A Gateway started with no Kernel and no credential falls back to an `authVerifier` for routes marked `"auth": true`:

```js
await startGateway({
  kernelKey: false,
  gatewayKeyFile: './run/gateway.key',
  apps: [{ name: 'fleet', appDir, keyFile: './run/fleet.key' }],
  // route is { id, method, path, app, permissions } from the manifest
  authVerifier: async (request, route) => {
    const token = request.headers.authorization?.replace('Bearer ', '')
    if (!token) return false
    return { user: { userId: await validateToken(token) } }
  }
})
```

The controller then reads the verified identity:

```js
module.exports = async function protectedRoute (req) {
  const { sub, groups } = req._info
  // Who asked. Kernel calls through req.mdk act for them; config.mdkClient calls act as the app (app:<name>).
}
```

The Gateway forwards that identity to the app runtime with the request, so `req._info` is set in the app's process too.

> [!IMPORTANT]
> A controller's return value always goes out as `200`, as JSON: it crosses from the app runtime to the Gateway serialized, so
> return plain data (a `Buffer` arrives as `{ type: 'Buffer', data: [...] }`; send bytes from a `stream: true` route). A thrown error is shaped by [`errorResponse`][error-response]: its status comes
> from `err.statusCode` when it is an integer 400 or higher, and falls back to `400` for an `ERR_*` error and `500` for anything
> else, which is a bug rather than a bad request. Attach `.statusCode` to get a specific
> code, the way `protectedRoute` does here; the bundled agent app uses this same pattern for its 503, 404, and 409 responses. The
> body is `{ statusCode, error, message }`, and `message` carries the error's own text for `ERR_*` codes and for Fastify's own 4xx
> errors (validation, content type, body size); any other message is replaced with the status text and logged.

### Manifest validation errors

The app runtime validates the route table and every handler at startup, and the Gateway the route table, and each throws if
anything is wrong — see the loader's error codes for the full list.

## Next steps

- Watch [an app answer an HTTP request with live fleet data][see-an-app-serve-data] in about five minutes
- Try the [live site backend example][all-workers-guide] for a complete worked app with three routes: a live site overview,
  a historical series, and a command endpoint running under PM2 or Docker
- Build the [minimal dashboard tutorial][minimal-dashboard] — end-to-end worked example of the single-app + controller pattern
- Get the [demo app][supported-apps-availability], the smallest complete worked example of both fan-out patterns above
- Understand [how Workers declare their data][build-a-worker] via [`mdk-contract.json`][contract-schema] — what
  [`mdkClient`][client-readme-methods] reads and [`sendCommand`][client-readme-methods] dispatches
- See the full manifest and controller reference
- Review the [Gateway API and config][gateway-readme]
- Follow [how a request travels and who Kernel admits][control-plane]
- Secure the site with the [security blueprint][security-blueprint]

## Links

[contract-schema]: ../../../backend/core/mdk-worker/mdk-contract.schema.json
<!-- docs@tether.io: contract-schema → https://github.com/tetherto/mdk/blob/main/backend/core/mdk-worker/mdk-contract.schema.json -->

[supported-apps-availability]: ../../reference/supported-apps.md#availability
<!-- docs@tether.io: supported-apps-availability → reference/supported-apps#availability -->

[agent-plugin-readme]: https://github.com/tetherto/mdk-app-agent
<!-- docs@tether.io: agent-plugin-readme → https://github.com/tetherto/mdk-app-agent -->

[demo-plugin-summary]: https://github.com/tetherto/mdk-app-demo/blob/main/controllers/summary.js
<!-- docs@tether.io: demo-plugin-summary → https://github.com/tetherto/mdk-app-demo/blob/main/controllers/summary.js -->

[demo-plugin-history]: https://github.com/tetherto/mdk-app-demo/blob/main/controllers/history.js
<!-- docs@tether.io: demo-plugin-history → https://github.com/tetherto/mdk-app-demo/blob/main/controllers/history.js -->

[ui-sessions]: ../../../ui/packages/ui-foundation/README.md#sessions
<!-- docs@tether.io: ui-sessions → https://github.com/tetherto/mdk/blob/main/ui/packages/ui-foundation/README.md#sessions -->

[gateway-concept-auth]: ../../../backend/core/gateway/README.md
<!-- docs@tether.io: gateway-concept-auth → https://github.com/tetherto/mdk/blob/main/backend/core/gateway/README.md -->

[all-workers-guide]: ../deployment/run-all-workers-site.md
<!-- docs@tether.io: all-workers-guide → guides/deployment/run-all-workers-site -->


[mvp-site-manifest]: ../../../examples/mvp-site/backend/gateway-plugins/site/mdk-plugin.json
<!-- docs@tether.io: mvp-site-manifest → https://github.com/tetherto/mdk/blob/main/examples/mvp-site/backend/gateway-plugins/site/mdk-plugin.json -->

[supported-apps]: ../../reference/supported-apps.md
<!-- docs@tether.io: supported-apps → reference/supported-apps -->

[error-response]: ../../../backend/core/gateway/workers/lib/plugin-adapter.js
<!-- docs@tether.io: error-response → https://github.com/tetherto/mdk/blob/main/backend/core/gateway/workers/lib/plugin-adapter.js -->

[mdk-client-readme]: ../../../backend/core/client/README.md
<!-- docs@tether.io: mdk-client-readme → https://github.com/tetherto/mdk/blob/main/backend/core/client/README.md -->

[client-readme-methods]: ../../../backend/core/client/README.md#client-methods
<!-- docs@tether.io: client-readme-methods → https://github.com/tetherto/mdk/blob/main/backend/core/client/README.md#client-methods -->

[gateway-readme]: ../../../backend/core/gateway/README.md
<!-- docs@tether.io: gateway-readme → https://github.com/tetherto/mdk/blob/main/backend/core/gateway/README.md -->

[gateway-readme-errors]: ../../../backend/core/gateway/README.md#errors
<!-- docs@tether.io: gateway-readme-errors → https://github.com/tetherto/mdk/blob/main/backend/core/gateway/README.md#errors -->

[cli-install]: ../cli/install.md
<!-- docs@tether.io: cli-install → guides/cli/run-with-npm -->

[cli-add]: ../../reference/tooling/cli.md#mdk-add-app-source-and-mdk-add-worker-source
<!-- docs@tether.io: cli-add → reference/tooling/cli#mdk-add-app-source-and-mdk-add-worker-source -->

[first-operator]: ../security/create-the-first-operator.md
<!-- docs@tether.io: first-operator → guides/security/create-the-first-operator -->

[app-runtime-readme]: ../../../backend/core/app-runtime/README.md
<!-- docs@tether.io: app-runtime-readme → https://github.com/tetherto/mdk/blob/main/backend/core/app-runtime/README.md -->

[core-apps]: ../../../backend/core/mdk/README.md#apps
<!-- docs@tether.io: core-apps → https://github.com/tetherto/mdk/blob/main/backend/core/mdk/README.md#apps -->

[see-an-app-serve-data]: ../../tutorials/see-an-app-serve-data.md
<!-- docs@tether.io: see-an-app-serve-data → tutorials/see-an-app-serve-data -->

[minimal-dashboard]: ../../tutorials/build-a-dashboard.md
<!-- docs@tether.io: minimal-dashboard → tutorials/build-a-dashboard -->
[build-a-worker]: ../workers/build-a-worker.md
<!-- docs@tether.io: build-a-worker → guides/workers/build-a-worker -->

[react-adapter]: ../../../ui/packages/react-adapter/README.md
<!-- docs@tether.io: react-adapter → https://github.com/tetherto/mdk/blob/main/ui/packages/react-adapter/README.md -->

[expose-data]: ../agent/expose-data.md
<!-- docs@tether.io: expose-data → guides/agent/expose-data -->

[agent-guide]: ../agent/gateway-deployment.md
<!-- docs@tether.io: agent-guide → guides/agent/gateway-deployment -->

[control-plane]: ../../concepts/control-plane.md
<!-- docs@tether.io: control-plane → https://github.com/tetherto/mdk/blob/main/docs/concepts/control-plane.md -->

[security-blueprint]: ../security/index.md
<!-- docs@tether.io: security-blueprint → guides/security -->

[rbac-scope-limits]: ../security/index.md#step-4-write-the-policy-and-put-identity-in-the-gateway
<!-- docs@tether.io: rbac-scope-limits → guides/security#step-4-write-the-policy-and-put-identity-in-the-gateway -->
