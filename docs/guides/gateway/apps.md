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
> The app runtime builds the app's [`@tetherto/mdk-client`][mdk-client-readme] and hands it to every controller as
> `config.mdkClient`, signed in as the app's service account. No knowledge of the MDK Protocol envelope or internal
> message shapes is required.

## Prerequisites

- The [`mdk` CLI is installed][cli-install], with a project `mdk.yaml` (`mdk onboard` writes one)

## Apps MDK ships

The [supported apps reference][supported-apps] lists where to get each catalog app. Each is a demo to read
alongside this guide. To try a Gateway app with
the 0.14 CLI, start with the local `fleet` scaffold below.

> [!IMPORTANT]
> A stack serves only the apps it declares. Any other path answers `404`. If a [React adapter][react-adapter] hook reads a
> route, declare the app that serves it.

Third-party apps are documented by their own manifests. `mdk add app <source>` installs one from npm or GitHub, checks the
package as `mdk validate app` does, and only then adds it under `spec.apps`.

<Steps>

<Step>

### Create an app

```bash
mdk create app fleet
```

This scaffolds `apps/fleet`, links it into the project's `package.json`, and adds it under `spec.apps` in `mdk.yaml`
(`--no-stack-entry` prints the entry instead). For an app that lives in its own repo and installs with
`mdk add app github:<owner>/<repo>#<tag>`, run `mdk create app fleet --flat` in the repo instead: it scaffolds at the repo root and touches no
project. The scaffold carries one read-only summary route and a starter UI that shows it:

```text
apps/fleet/
├── mdk-app.yaml               # app manifest
├── package.json               # `files` ships the manifest, plugin/, ui/, and README.md
├── README.md
├── plugin/
│   ├── mdk-plugin.json        # route table
│   ├── lib/client.js          # re-exports the app runtime's Kernel client
│   ├── types.d.ts             # response types, shared with the UI
│   └── controllers/summary.js # one module per route
├── ui-src/                    # UI source with its own package.json and Vite build, not published
└── ui/index.js                # the built UI module, committed; a placeholder until `npm run build:ui`
```

`mdk-app.yaml` describes the app to the operator: its `id`, `version`, `displayName`, the Kernel `permissions` it asks for, default
`config` and optional background `main`. Every field is in the [app runtime's manifest reference][app-runtime-manifest]. Keep
`version` equal to the `package.json` version; `mdk validate app` checks it.

> [!IMPORTANT]
> The Kernel enforces `spec.rbac` on every call the app makes. `mdk add app` grants the app's service account (`app:<name>`)
> exactly these `permissions`, as a role in `mdk.yaml` the operator may narrow, so request every Kernel resource the app
> reads or writes: a call outside them throws `ERR_KERNEL_ACTION_FORBIDDEN`, which the route answers [as the app runtime
> sends it][app-runtime-http-errors].

Check it with `mdk validate app fleet`; [what it checks][cli-validate] is in the CLI reference.

</Step>

<Step>

### Write the routes

#### 2.1 Edit the route table

`mdk-plugin.json` declares the plugin identity (`name`, `version`) and a `routes` array. Each route needs an `id`, a
`handler` path, and either an `http` block with a `method` and `path`, or those same `method`/`path` fields flattened to the route's top level;
the agent app uses the flat form. A table that declares `"routeTableVersion": "1"`, as `mdk create app` writes it, is held
to the [route-table schema's][route-table-fields] OpenAPI-shaped rules as errors by `mdk validate app`; a table without it gets
them as warnings. Rather than copy a synthetic example, start from a real manifest and trim it:

- [`examples/mvp-site/backend/gateway-plugins/site/mdk-plugin.json`][mvp-site-manifest]: `GET` routes with query
parameters, and `POST` routes with a `requestBody` and path parameters
- `mdk-app-demo/mdk-plugin.json`: read-only `GET` routes with query parameters, each annotated with `safety`
- `mdk-app-agent/mdk-plugin.json`: `auth: true` routes in the flat form, one of them a stream route

The demo and agent apps live in [their own repositories][supported-apps-availability]; the `mvp-site` manifest is the one in this
repository.

Path parameters use `{param}` syntax; the loader normalizes them to Fastify's `:param` format. For named exports use `"handler":
"./controllers/foo.js#namedExport"`. Every field is listed in the [route-table field reference][route-table-fields], generated from
the [schema][route-table-schema] the app runtime publishes. The loader enforces the fields at boot; [what it refuses, and
why][app-runtime-load-errors] is app-runtime's `ERR_PLUGIN_MANIFEST_INVALID` row.

Give each route a `description` that says what it does and when to call it. It becomes the description of the MCP tool derived from the
route, and the route's Purpose in an HTTP reference if you [generate one][app-runtime-route-table]; without one, `mdk validate app` warns,
and a generated reference shows "Not declared".

The Gateway validates a route's `schema` and `requestBody` with [type coercion][gateway-request-forwarding]: write a
nullable number, string, boolean, or array as a type list (`"type": ["number", "null"]`), not as the `anyOf` that
`z.toJSONSchema` writes for a bounded nullable, or a JSON `null` reaches the controller as `0`, `""`, `false`, or an array.

#### 2.2 Write a controller

The app runtime builds the app's [`@tetherto/mdk-client`][mdk-client-readme] and hands it to controllers as
`config.mdkClient`; the scaffold's `lib/client.js` re-exports it, and every controller in the app requires that module.

Every controller exports an `async function (req)`:

```js
// controllers/live.js: read live telemetry
const mdkClient = require('../lib/client')

module.exports = async function live (req) {
  const deviceId = req.query.deviceId
  const telemetry = await mdkClient.pullTelemetry(deviceId, 'metrics')

  // No telemetry: no Worker owns the device, or its Worker could not read it
  if (telemetry.error) {
    const code = String(telemetry.error)
    const statusCode = code.startsWith('ERR_DEVICE_NOT_FOUND') ? 404 : 503
    throw Object.assign(new Error(code), { statusCode })
  }

  return { deviceId, ...telemetry }
}
```

A write a user asks for goes through `req.mdk`, the request's Kernel client. It acts for the signed-in user, so the Kernel checks
their own `spec.rbac` rules as well as the app's, and the write-command log records them via the app:

```js
// controllers/command.js: dispatch a command for the signed-in user
module.exports = async function command (req) {
  const deviceId = req.params.deviceId
  const { mode } = req.body

  const result = await req.mdk.sendCommand(deviceId, 'setPowerMode', { mode })

  // The Kernel refused the command, such as an undeclared command or a param outside the contract's rules
  if (result.status === 'REJECTED') throw new Error(result.error)

  return {
    deviceId,
    commandId: result.commandId,
    status: result.status
  }
}
```

Neither call throws on a Kernel error reply: [`pullTelemetry`][client-pull-telemetry] and [`sendCommand`][client-send-command]
each resolve with the reason in `error`. Returned as is, that reply reaches the caller as `200`. Thrown with its code, it gets the
status the [controller rule][app-route-errors] gives that code, or the `statusCode` the controller attaches, as `live.js` does.
[An authorization refusal throws][client-auth-refusal] instead, with its code as `err.code`, and the same rule answers it.

The app's own rules must allow the write too, so an app with a route like this one requests
`{ resources: [devices], verbs: [write] }` in its `permissions`. Without it the Kernel refuses the command with
`ERR_KERNEL_ACTION_FORBIDDEN`.

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

If your stack has no administrative binding, run `mdk rbac init` before its first start. Projects created with
`mdk onboard` already have the CLI admin binding.

```bash
mdk run             # Kernel, Workers, one runtime process per app, then the Gateway
mdk run app fleet   # or only this app, in the foreground, beside `mdk run kernel` and `mdk run gateway`
```

The runtime loads the route table and every handler before it serves, so a missing file or invalid manifest fails that app
at startup. It accepts calls only from the keys `mdk run` allows, the Gateway's (`.mdk/gateway.key`) and the MCP server's
(`.mdk/mcp.key`); until it is up, its routes answer `503`.

No route is open, so [sign in and send the access token](#call-a-route) to reach
`http://localhost:3847/apps/fleet/api/fleet/summary`.

An app's routes [become MCP tools][expose-data] with no separate manifest. The operator agent calls them only with
`strictToolGating` off.

</Step>

</Steps>

### The app's UI module

An app's routes are one half of it, and this is the other. `ui/index.js` default-exports the result of `defineMdkApp` from
[`@tetherto/mdk-react-adapter`][react-adapter], an identity function that types the contract a shell loads:

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
| `displayName` | Repeats `displayName` from `mdk-app.yaml`, which is what the shell shows; the shell checks only that this one is set. A panel with no `title` falls back to it, as do some unlabelled sidebar entries |
| `routes`      | Pages the shell mounts under `/app/<name>/`. `path` is relative, `''` being the landing page; `label` sets the sidebar label; `section` groups the page with the others naming it; `hidden` routes a deep link without listing it |
| `sections`    | Optional. An icon for a route `section`: `label` is the `section` its routes name, `icon` a component the shell renders with no props. A section works with no entry here, which only adds what a label alone cannot |
| `panels`      | Components the shell composes into pages it owns. `slot` picks where: every MDK shell provides `MDK_APP_PANEL_SLOT.HOME`, and a shell ignores slots it does not know |

The sidebar lists only routes that are not `hidden` and have no `:` or `*` in their `path`, because a deep link needs a value
only another page can give it. With one such route, the app gets a single entry, labelled with the route's `label` or else
`displayName`, whatever its `path`. With several, the app gets a group named `displayName`, where an unlabelled entry shows
its raw `path`, or `displayName` for the landing page. When the app is the only one installed and its routes use `section`,
its sections and other pages are listed at the top level, without the group.

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

`package.json` `files` has to ship `mdk-app.yaml`, `plugin/`, and `ui/`. Commit the built `ui/` rather than building on
install: a GitHub install runs no build, so an unbuilt `ui/` reaches the consumer as a missing module.

```json
{
  "files": ["mdk-app.yaml", "plugin/", "ui/", "README.md"]
}
```

Run [`mdk validate app <name>`][cli-validate] before publishing or tagging.

An app you plan to list also has to meet the [listing criteria][listing-criteria], which add
[smoke checks against a mock Kernel][cli-validate].

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

`mdk add app` installs with `npm install --ignore-scripts --save-exact`, so no install script of an unchecked package
runs and the exact version is recorded. For a GitHub source, that's the commit the lockfile resolved, written into
`package.json` as `github:<owner>/<repo>#<sha>`. It then checks the package as `mdk validate app` does
and only then writes the `spec.apps` entry, keeping the stack file's comments and formatting. A refused package leaves
`mdk.yaml`, `package.json` and the lockfile as they were. The [CLI reference][cli-add] covers `--name`, repeat installs,
and the worker equivalent.

> [!NOTE]
> A GitHub source cannot be added with `--no-install`: its package name is only known once npm has fetched it.

#### Declare what it needs

An app states its own config defaults under `config` in `mdk-app.yaml`, and the operator overrides them per stack. [Supplying
per-app config](#supplying-per-app-config) covers the layering.

### Start apps from code

Outside the CLI, pass each app to `startGateway()` from `@tetherto/mdk-core` as `apps` (the complete list, nothing else is
mounted) and run each one with `createAppRuntime()`, allowing only the Gateway's key and passing the app's service-account
credential, which `mdk add app` writes to `.mdk/credentials/apps/<name>.json` (`mdk run` also writes it at boot when it is
missing). `mdk create app` doesn't write it, so for a local `fleet` app already linked by `mdk create app`, run
`mdk add app fleet --no-install` once first. The boot script also needs two packages that neither `mdk create app` nor
`mdk add app` installs:

```bash
npm install @tetherto/mdk-core @tetherto/mdk-app-runtime
```

Then boot the Kernel, the app, and the Gateway:

```js
const path = require('path')
const { getKernel, startGateway } = require('@tetherto/mdk-core')
const { createAppRuntime } = require('@tetherto/mdk-app-runtime')
const fleet = require('./.mdk/credentials/apps/fleet.json') // written by mdk add app

const main = async () => {
  // Registers app:fleet and grants it what its routes call, as mdk-app.yaml permissions would under mdk run
  const kernel = await getKernel({
    rbac: {
      enforcement: 'deny',
      roles: [{
        name: 'app-fleet',
        rules: [{ resources: ['workers'], verbs: ['list'] }, { resources: ['devices'], verbs: ['read', 'write'] }]
      }],
      bindings: [{ role: 'app-fleet', subjects: [{ kind: 'ServiceAccount', name: 'app:fleet' }] }]
    },
    serviceAccounts: [{ name: fleet.name, publicKey: fleet.publicKey }]
  })

  const appDir = path.join(__dirname, 'apps/fleet')

  const runtime = createAppRuntime({
    name: 'fleet',
    appDir,
    kernelKey: kernel.getPublicKey(),
    credentialFile: './.mdk/credentials/apps/fleet.json',
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
}

main().catch((err) => { console.error(err); process.exit(1) })
```

> [!TIP]
> Without network options, the Kernel, runtime, and Gateway join the public HyperDHT. On a machine that cannot reach it,
> pass the [private DHT options][private-dht] to each of them.

Under `mdk run`, the CLI registers each app's account and applies its `permissions` for you. From code, pass
`serviceAccounts` and `rbac` in the boot script so the app can authenticate and make its calls, unless the Kernel's
stored policy and accounts already cover the app.

> [!WARNING]
> `rbac` and `serviceAccounts` are the Kernel's complete policy and service-account list, applied at every start: the
> policy replaces the stored one, and any service account not listed is removed. Users stay but lose their bindings. On a
> Kernel that already has a policy, users, or accounts, merge the `app-fleet` role, binding, and account into the ones it
> already has, or everyone else loses access. The [`getKernel` options][getkernel-options] define both.

To create a user on this Kernel, call `await kernel.identity.upsertUser({ name, password })` from your boot script
using a password supplied by the operator. Bind the user to a role in the same `rbac` policy with the access they need,
then [sign in and call a route](#call-a-route). `mdk user add` doesn't reach this Kernel: it reads the Kernel key from
`.mdk/kernel.key`, which `mdk run` writes, while `getKernel()` writes its key to `~/.mdk/.kernel-key` by default.

The runtime's Kernel key must be admitted before its controllers call the Kernel, through `kernel.allowKey()`, as the example does,
or the trusted-keys directory. The credential is the app's service account, `app:fleet`, as `mdk add app`
writes it to `.mdk/credentials/apps/<name>.json`; a runtime with a `kernelKey` and no credential logs a warning, and the
Kernel refuses every call it makes. [`startGateway()`'s apps reference][core-apps] lists the validation errors,
and [`@tetherto/mdk-app-runtime`][app-runtime-options] the runtime options. `startGateway()` throws
`ERR_GATEWAY_EXTRA_PLUGIN_DIRS_UNSUPPORTED` when passed `extraPluginDirs`.

### The `req` object

A controller's only argument: `params`, `query`, `body`, and `headers` from the request, `_info` with the identity the
Gateway verified, and `mdk`, the request's Kernel client. [The app runtime's reference][app-runtime-readme] describes how
`req.mdk` and `req._info` are assembled.

### The app's context module

`require('@tetherto/mdk-gateway/plugin')` resolves, inside an app's controllers, to that app's own frozen context. The
scaffold's `lib/client.js` reads `config.mdkClient` from it:

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

`config.mdkClient` is already built, so `require` the scaffold's `lib/client.js` from every controller that needs it.
There is no per-request Kernel access to guard, only the client's own connect failures:

> [!IMPORTANT]
> The client connects on first use and memoizes the connection. A failure arrives with `err.code` set to
> `ERR_MDK_CLIENT_UNAVAILABLE` and a message that adds the cause, and the next call dials again. Guard
> the call on `err.code`, not on the message and not on a null client:
> ```js
> let telemetry
> try {
>   telemetry = await mdkClient.pullTelemetry(deviceId, 'metrics')
> } catch (err) {
>   // The Kernel is down, not the caller's fault: answer 503
>   if (err.code === 'ERR_MDK_CLIENT_UNAVAILABLE') throw Object.assign(new Error('ERR_KERNEL_UNREACHABLE'), { statusCode: 503 })
>   throw err
> }
>
> // A Kernel error reply resolves instead of throwing: answer it as `live.js` does
> if (telemetry.error) {
>   const code = String(telemetry.error)
>   const statusCode = code.startsWith('ERR_DEVICE_NOT_FOUND') ? 404 : 503
>   throw Object.assign(new Error(code), { statusCode })
> }
> return telemetry
> ```

### Read hardware data

Call the client directly for live device data: [`pullTelemetry`, `getCapabilities`, and `listWorkers`][client-readme-methods]
are documented with their return shapes in the client's own reference.

A fleet-wide number, hashrate across every miner on site say, must never start a second hardware polling loop. Workers
whose contract declares `telemetryPollIntervalMs` already poll their devices and store the series, so read the fleet
from those stores in one call with [`pullSnapshot`][client-readme-methods], or let the Workers compute the number with
[`pullAggregate`][client-readme-methods]:

```js
const { workers } = await mdkClient.listWorkers()
const workerIds = workers.map((w) => w.workerId)

const snap = await mdkClient.pullSnapshot({ workers: workerIds, metrics: ['hashrate_avg'] })
const values = Object.values(snap.devices).map((d) => d.metrics.hashrate_avg?.value).filter(Number.isFinite)
const totalHashrate = values.reduce((sum, v) => sum + v, 0)
// Workers that could not answer, such as one that does not poll, are not in the total
const leftOut = Object.keys(snap.errors ?? {})

const agg = await mdkClient.pullAggregate({ workers: workerIds, ops: { hashrate_total: { op: 'sum', src: 'metrics.hashrate_avg' } } })
// agg.ops.hashrate_total, agg.deviceCount, agg.errors (Workers that could not answer)
```

Each Worker names its metrics in its own [contract][build-a-worker], and `hashrate_avg` is the Avalon Worker's name.
`pullSnapshot` still returns a device whose Worker names hashrate differently, with no error and no `hashrate_avg` in its
`metrics`, so count `values`, not `snap.devices` entries; the example's `Number.isFinite` filter drops the missing
value. `pullAggregate` reports that Worker in `agg.errors` as `ERR_AGGREGATE_SRC_UNKNOWN`.

A Worker that does not poll has no store, so both calls report it under `errors` as `ERR_TELEMETRY_STORE_DISABLED` and
`snap.devices` holds none of its devices. Return `leftOut` with `totalHashrate`, so the caller can tell a partial total
from the fleet's, then read such a Worker live with `pullTelemetry` per device, or ask its operator to set
`telemetryPollIntervalMs`. The miner
Workers on the [Starter site][starter-site] declare no poll interval, so on that site both calls report every miner under
`errors`, and the fleet read falls back to `pullTelemetry` per device.

An op groups or filters on a metric, on `deviceId`, or on a label the operator gave the device in `mdk.yaml` under
`config.devices[].info` (`group: 'info.container'`): the labels are the only part of a device's configuration an app
can read this way.

Read `deviceCount` and `errors` before you treat a number as a fleet total. `deviceCount` counts the devices whose
stored point held a reading, so a listed Worker that is registered with no devices answers, adds nothing to
`deviceCount` and leaves every op at its empty value (a `sum` of `0`). `ops` is `{}` only when no listed Worker
answered at all, and each of those is then under `errors`. A Worker with no devices resolves to no device name, so a
caller whose `devices` `read` rule is narrowed with `resourceNames` is refused for a list that names it
(`ERR_KERNEL_ACTION_FORBIDDEN`); only an unscoped rule covers it.

Before you swap `sum` for `avg`, read [what a merged `avg` answers][fleet-reads]: it may not be the figure your
question needs.

The Kernel checks `devices` `read` for every device of each listed Worker, so an app that reads the fleet requests it
in `mdk-app.yaml` beside the scaffold's `workers` `list`:

```yaml
permissions:
  - { resources: [workers], verbs: [list] }
  - { resources: [devices], verbs: [read] }
```

Without the rule the call throws `ERR_KERNEL_ACTION_FORBIDDEN`, which the route answers [as the app runtime sends
it][app-runtime-http-errors], with that message. A
Worker that collects its own telemetry is left out of the Kernel's scheduled pull, so nothing polls its devices twice.

`pullTelemetry(deviceId, 'metrics')` still reads one device live when the question is about that device right now.

[`demo/controllers/summary.js`][demo-plugin-summary] is a small worked example of a fleet read, worth starting from if
you're authoring your own app.

There is no separate Gateway-side store for historical or aggregated data, either. Read the series from each Worker's own
persisted tail-log with [`pullTelemetry`][client-readme-methods], addressed to a device on a Worker that keeps one, such as a
container:

```js
const history = await mdkClient.pullTelemetry(containerId, { type: 'logs', key: 'stat-1D', tag: 't-container', start, end })

// A refusal resolves, such as ERR_UNKNOWN_QUERY_TYPE from a Worker that keeps no log
if (history.error) throw new Error(history.error)
```

The Kernel authorizes a `pullTelemetry` call as `devices` `read` on the device it addresses and does not inspect the
query; what comes back is decided by the Worker. These store-backed query types exist on a Worker that runs the
[Worker Runtime's store services][worker-store-services] (in this repo, the container and temperature Workers); a
`WorkerRuntimeV2` Worker keeps its history in its telemetry store and answers `pullSnapshot` with `from` instead.
`mdk run` boots every Worker on `WorkerRuntimeV2`, so a Worker on a CLI stack answers only `list` of these query types, with
every device it runs. It refuses the others: a read addressed to one device gets `ERR_UNKNOWN_QUERY_TYPE`, unless the Worker's
contract declares a telemetry channel of that name, and a read with no device addressed, as `pullWorkerQuery` sends, gets
`ERR_DEVICE_ID_REQUIRED`. A host that starts a store-services Worker itself, as the
[Antspace development script][antspace-dev] does, can serve them.

| Query type                                       | What a read addressed to one device returns                                                                                                                       |
|--------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `logs` with `key: 'thing-5m'`, `logs_multi`, `historical_logs` | The addressed device's own snapshot series, alerts, and info changes; the `tag` and `deviceIds` fields cannot point it at another device               |
| `logs` with a `stat-*` key                       | The series the Worker stores for `tag`, aggregated over every device carrying that tag; a tag the addressed device does not carry is refused with `ERR_LOG_TAG_FORBIDDEN` |
| `list`, `stats`, `thing_config`                  | The addressed device only                                                                                                                                         |
| `count`, `config`, `settings`, `ext_data`        | Worker-level facts: the device count, the contract, the settings, or the pool data, whichever device you address                                                   |

To read a Worker's own records rather than one device's, ask the Worker: [`pullWorkerQuery`][client-readme-methods]
runs the query on each listed Worker with no device addressed and answers per Worker, and the Kernel checks `devices`
`read` on every device of each listed Worker, as it does for `pullSnapshot`:

```js
const { workers: perWorker, errors } = await mdkClient.pullWorkerQuery({ workers: [workerId], type: 'list', status: true, limit: 200 })
// perWorker[workerId].things: the Worker's devices, up to `limit`, each with its latest snapshot (a WorkerRuntimeV2 Worker answers `devices`); errors?.[workerId] when it could not answer
const series = await mdkClient.pullWorkerQuery({ workers: [workerId], type: 'logs', key: 'stat-1D', tag: 't-container', start, end })
```

> [!NOTE]
> A `stat-*` log is shared: a response can include figures from devices the caller cannot address, and a caller scoped
> to one device still reads the shared total ([what `resourceNames` does and does not bound][rbac-scope-limits]). Do
> not treat one device as standing for its whole Worker: a device-addressed read answers for that device. A Worker
> with no current devices still has its retained history; read it with `pullWorkerQuery`, which for a Worker with no
> devices only an unscoped `devices` `read` rule allows.

[`demo/controllers/history.js`][demo-plugin-history] reads history a different way: it pulls a `history` telemetry channel
that the Worker's contract declares (`pullTelemetry(deviceId, { type: 'history', limit })`), with an optional per-device
filter and a Kernel-unavailable fallback.

Both live and historical calls are network calls through the client, so guard both [the same way](#supplying-per-app-config). An
unguarded `pullTelemetry` throws `ERR_MDK_CLIENT_UNAVAILABLE` straight through to the caller as a
`400` the moment the Kernel drops. When only a Worker drops, `pullTelemetry` does not throw: it answers `{ error }`
(`ERR_WORKER_UNREACHABLE`, `ERR_WORKER_NOT_ROUTABLE`, or `ERR_DEVICE_NOT_FOUND`), so check `res.error` before the field you
read. A Worker that hangs instead can still time the request out with `ERR_MDK_REQUEST_TIMEOUT`.

### Send a command

[`sendCommand`][client-readme-methods] dispatches via the Kernel to the Worker that owns the device. The command must be
declared in the Worker's [`mdk-contract.json`][contract-schema], and [the command controller](#22-write-a-controller) shows the
pattern. The return value is the Kernel's acceptance, `{ commandId, status: 'QUEUED' }` or `{ error, status: 'REJECTED' }`,
not the command's outcome; read that with `getCommandStatus`.

### Caching

Add a `"cache"` array of dot-path strings to a route to enable request-level caching. The key is the app name, the route id
and those values; on a route the Gateway authenticates, every route under `spec.rbac` or an `auth: true` route under
`authVerifier`, it adds a hash of the caller's identity, so a per-caller answer needs no identity path of its own. The
[auth check](#auth-and-permissions) runs before the cache lookup. Who may force a refresh with `?overwriteCache=true` is in the
[Gateway's security model][gateway-security-model], and [the route-table field reference][route-table-fields] lists the field.

### Stream routes

Add `"stream": true` to a route to write the response yourself, through a second argument that behaves like a
`ServerResponse` over the runtime's channel, instead of returning a plain value: for SSE or any other response Fastify
shouldn't serialize. [Stream backpressure][app-runtime-stream] covers the mechanism. A handler that throws before it sends
headers answers a JSON error body; after that the channel closes without an end, so the caller sees a truncated body.
[`mdk-app-agent`][agent-plugin-readme] is a shipping example: its message route streams `text/event-stream` this way, and
[the agent Gateway-deployment guide][agent-guide] covers the consumer side.

The HTTP caller's pace doesn't reach your handler: `raw.write()` reports only the app runtime's own connection to the Gateway.
When an HTTP caller falls more than the Gateway's [`maxStreamBufferBytes`][gateway-request-forwarding] (default 16 MiB) behind
the handler, the Gateway closes the stream and logs `ERR_APP_STREAM_OVERFLOW` at `warn`: the caller has the status the handler
sent and part of the body, and the connection closes before the response completes. Write a stream a slow caller can keep up
with, and have the caller treat an incomplete response as a failure.

### Auth and permissions

Every route of an app is checked against `spec.rbac` at the Gateway: the caller needs a bearer access token (`POST /auth/login`
issues one) and a rule granting the route's resource and verb. Without a token the Gateway answers `401 ERR_AUTH_UNAUTHORIZED`,
and without a rule `403 ERR_AUTH_FORBIDDEN`, before body validation, the cache, and your controller. The Gateway reference lists
[every error an app route can answer][app-route-errors], in the order the checks run. Who may call the route is the operator's to
set in `mdk.yaml`; the manifest only says how the route is governed:

| Route field    | Status   | Description                                                                                       |
| -------------- | -------- | ------------------------------------------------------------------------------------------------- |
| `verb`         | Optional | `get`, `list`, `create`, `update`, or `delete`. Without it, the verb comes from the HTTP method, as the [Gateway's security model][gateway-security-model] maps it |
| `resourceName` | Optional | `{ "param": "<name>" }`, `{ "query": "<name>" }`, or `{ "body": "<name>" }`: where the instance a rule's `resourceNames` matches comes from |

A route's `auth` and `permissions` fields aren't read here: they're input to [the `authVerifier` fallback](#call-a-route), so a `permissions`
list gates nothing under `spec.rbac`. `mdk validate app` warns about a route that sets `permissions`, and the Gateway logs each such route at boot.

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

The token lasts minutes and the refresh token [rotates on every use][identity-sessions], so a long-running client signs in again rather than
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
    return { kind: 'user', sub: await validateToken(token) }
  }
})
```

The controller reads whatever the Gateway verified: `{ kind, sub, email?, groups? }` under `spec.rbac`, or exactly what
`authVerifier` returned:

```js
module.exports = async function protectedRoute (req) {
  const { sub } = req._info   // who asked; under spec.rbac, req.mdk acts for a user, but as the app for a service account
  const row = await findRowFor(sub)
  if (!row) throw Object.assign(new Error('ERR_ROW_NOT_FOUND'), { statusCode: 404 })
  return row
}
```

The Gateway forwards that identity to the app runtime with the request, so `req._info` is set in the app's process too.

> [!IMPORTANT]
> A controller's return value always goes out as `200`, as JSON: it crosses from the app runtime to the Gateway serialized, so
> return plain data (a `Buffer` arrives as `{ type: 'Buffer', data: [...] }`; send bytes from a `stream: true` route). A thrown
> error's status and message follow [the app runtime's rule][app-runtime-http-errors], and the Gateway sends it as
> `{ statusCode, error, message }` ([`errorResponse`][error-response]). Start the message with an `ERR_*` code when the caller should
> read it; any other message reaches the caller as the status text, and the app runtime logs the original. Attach `.statusCode`
> when the default status doesn't fit: `400` for an `ERR_*` error, since most are input errors (`403` for
> `ERR_KERNEL_ACTION_FORBIDDEN`), and `500` for any other. Always attach it to an `ERR_*` error that isn't the caller's fault, such
> as `503` for a dependency that's down. `protectedRoute` attaches `404` here, and the bundled agent app uses the same pattern for
> its 503, 404, and 409 responses. Fastify's own 4xx errors (validation, content type, body size) keep their message.

### Manifest validation errors

The app runtime validates the route table and every handler at startup, and the Gateway the route table, and each throws if
anything is wrong. [The loader's error codes][app-runtime-load-errors] list every case.

## Next steps

- Watch [an app answer an HTTP request with live fleet data][see-an-app-serve-data] in about five minutes
- Run the [multi-Worker site under PM2][all-workers-guide], whose site app serves every device's data through one `/site` HTTP API
- Build the [minimal dashboard tutorial][minimal-dashboard]: an end-to-end worked example of the single-app + controller pattern
- Get the [demo app][supported-apps-availability], the smallest complete worked example of both fleet reads, `pullSnapshot` and `pullAggregate`
- Study the [reporting app][reporting-app], one package with a Gateway plugin and a dashboard UI
- Understand [how Workers declare their data][build-a-worker] via [`mdk-contract.json`][contract-schema]: what
  [`mdkClient`][client-readme-methods] reads and [`sendCommand`][client-readme-methods] dispatches
- Look up [every route-table field][route-table-fields], generated from the schema the app runtime publishes
- Generate [an app's HTTP reference and OpenAPI document][app-runtime-route-table] from its route table, in the app's own repository
- Review the [Gateway API and config][gateway-readme]
- Follow [how a request travels and who Kernel admits][control-plane]
- Secure the site with the [security blueprint][security-blueprint]

## Links

[contract-schema]: ../../../backend/core/mdk-worker/mdk-contract.schema.json
<!-- docs@tether.io: contract-schema → https://github.com/tetherto/mdk/blob/main/backend/core/mdk-worker/mdk-contract.schema.json -->

[worker-store-services]: ../../../backend/core/mdk-worker/README.md#store-services
<!-- docs@tether.io: worker-store-services → https://github.com/tetherto/mdk/blob/main/backend/core/mdk-worker/README.md#store-services -->

[antspace-dev]: ../containers/run-antspace-worker.md#development
<!-- docs@tether.io: antspace-dev → guides/containers/run-antspace-worker#development -->

[reporting-app]: https://github.com/tetherto/mdk-app-reporting-tool
<!-- docs@tether.io: reporting-app → https://github.com/tetherto/mdk-app-reporting-tool -->

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

[client-auth-refusal]: ../../../backend/core/client/README.md#createmdkclientconfig-opts--auto-connecting-client
<!-- docs@tether.io: client-auth-refusal → https://github.com/tetherto/mdk/blob/main/backend/core/client/README.md#createmdkclientconfig-opts--auto-connecting-client -->

[client-pull-telemetry]: ../../../backend/core/client/README.md#pulltelemetrydeviceid-querytype--promiseobject
<!-- docs@tether.io: client-pull-telemetry → https://github.com/tetherto/mdk/blob/main/backend/core/client/README.md#pulltelemetrydeviceid-querytype--promiseobject -->

[client-send-command]: ../../../backend/core/client/README.md#sendcommanddeviceid-command-params--promiseobject
<!-- docs@tether.io: client-send-command → https://github.com/tetherto/mdk/blob/main/backend/core/client/README.md#sendcommanddeviceid-command-params--promiseobject -->

[app-route-errors]: ../../../backend/core/gateway/docs/http-api.md#errors-on-every-app-route
<!-- docs@tether.io: app-route-errors → https://github.com/tetherto/mdk/blob/main/backend/core/gateway/docs/http-api.md#errors-on-every-app-route -->

[starter-site]: ../../tutorials/run-a-site.md
<!-- docs@tether.io: starter-site → tutorials/run-a-site -->

[gateway-readme]: ../../../backend/core/gateway/README.md
<!-- docs@tether.io: gateway-readme → https://github.com/tetherto/mdk/blob/main/backend/core/gateway/README.md -->

[app-runtime-load-errors]: ../../../backend/core/app-runtime/README.md#route-table-load-errors
<!-- docs@tether.io: app-runtime-load-errors → https://github.com/tetherto/mdk/blob/main/backend/core/app-runtime/README.md#route-table-load-errors -->

[app-runtime-manifest]: ../../../backend/core/app-runtime/README.md#manifest
<!-- docs@tether.io: app-runtime-manifest → https://github.com/tetherto/mdk/blob/main/backend/core/app-runtime/README.md#manifest -->

[app-runtime-http-errors]: ../../../backend/core/app-runtime/README.md#errors-an-http-caller-receives
<!-- docs@tether.io: app-runtime-http-errors → https://github.com/tetherto/mdk/blob/main/backend/core/app-runtime/README.md#errors-an-http-caller-receives -->

[cli-validate]: ../../../packages/cli/README.md#adding-and-validating-apps-and-workers
<!-- docs@tether.io: cli-validate → https://github.com/tetherto/mdk/blob/main/packages/cli/README.md#adding-and-validating-apps-and-workers -->

[gateway-security-model]: ../../../backend/core/gateway/README.md#security-model
<!-- docs@tether.io: gateway-security-model → https://github.com/tetherto/mdk/blob/main/backend/core/gateway/README.md#security-model -->

[identity-sessions]: ../../../backend/core/identity/README.md#sessions-end-when
<!-- docs@tether.io: identity-sessions → https://github.com/tetherto/mdk/blob/main/backend/core/identity/README.md#sessions-end-when -->

[gateway-request-forwarding]: ../../../backend/core/gateway/README.md#request-forwarding
<!-- docs@tether.io: gateway-request-forwarding → https://github.com/tetherto/mdk/blob/main/backend/core/gateway/README.md#request-forwarding -->

[listing-criteria]: ../../../CONTRIBUTING.md#listing-criteria
<!-- docs@tether.io: listing-criteria → support/community/contributing#listing-criteria -->

[cli-install]: ../cli/install.md
<!-- docs@tether.io: cli-install → guides/cli/run-with-npm -->

[cli-add]: ../../reference/tooling/cli.md#mdk-add-app-source-and-mdk-add-worker-source
<!-- docs@tether.io: cli-add → reference/tooling/cli#mdk-add-app-source-and-mdk-add-worker-source -->

[private-dht]: ../deployment/private-dht.md#pass-the-profile-to-each-component
<!-- docs@tether.io: private-dht → guides/deployment/private-dht#pass-the-profile-to-each-component -->

[first-operator]: ../security/create-the-first-operator.md
<!-- docs@tether.io: first-operator → guides/security/create-the-first-operator -->

[app-runtime-readme]: ../../../backend/core/app-runtime/README.md
<!-- docs@tether.io: app-runtime-readme → https://github.com/tetherto/mdk/blob/main/backend/core/app-runtime/README.md -->

[app-runtime-options]: ../../../backend/core/app-runtime/README.md#options
<!-- docs@tether.io: app-runtime-options → https://github.com/tetherto/mdk/blob/main/backend/core/app-runtime/README.md#options -->

[app-runtime-route-table]: ../../../backend/core/app-runtime/README.md#route-table
<!-- docs@tether.io: app-runtime-route-table → https://github.com/tetherto/mdk/blob/main/backend/core/app-runtime/README.md#route-table -->

[app-runtime-stream]: ../../../backend/core/app-runtime/README.md#stream-backpressure
<!-- docs@tether.io: app-runtime-stream → https://github.com/tetherto/mdk/blob/main/backend/core/app-runtime/README.md#stream-backpressure -->

[route-table-fields]: ../../../backend/core/app-runtime/docs/route-table-fields.md
<!-- docs@tether.io: route-table-fields → https://github.com/tetherto/mdk/blob/main/backend/core/app-runtime/docs/route-table-fields.md -->

[route-table-schema]: ../../../backend/core/app-runtime/mdk-plugin.schema.json
<!-- docs@tether.io: route-table-schema → https://github.com/tetherto/mdk/blob/main/backend/core/app-runtime/mdk-plugin.schema.json -->


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

[expose-data]: ../agent/expose-data.md#serve-an-apps-routes-as-tools
<!-- docs@tether.io: expose-data → guides/agent/expose-data#serve-an-apps-routes-as-tools -->

[agent-guide]: ../agent/gateway-deployment.md
<!-- docs@tether.io: agent-guide → guides/agent/gateway-deployment -->

[control-plane]: ../../concepts/control-plane.md
<!-- docs@tether.io: control-plane → https://github.com/tetherto/mdk/blob/main/docs/concepts/control-plane.md -->

[fleet-reads]: ../../concepts/control-plane.md#fleet-reads
<!-- docs@tether.io: fleet-reads → https://github.com/tetherto/mdk/blob/main/docs/concepts/control-plane.md#fleet-reads -->

[security-blueprint]: ../security/index.md
<!-- docs@tether.io: security-blueprint → guides/security -->

[rbac-scope-limits]: ../security/index.md#step-4-write-the-policy-and-put-identity-in-the-gateway
<!-- docs@tether.io: rbac-scope-limits → guides/security#step-4-write-the-policy-and-put-identity-in-the-gateway -->

[getkernel-options]: ../../../backend/core/mdk/README.md#getkernelopts--promisekernelmanager
<!-- docs@tether.io: getkernel-options → https://github.com/tetherto/mdk/blob/main/backend/core/mdk/README.md#getkernelopts--promisekernelmanager -->
