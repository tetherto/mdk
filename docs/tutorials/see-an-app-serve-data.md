---
title: See an app serve your data
description: "[⏱️ ~5 min] Scaffold a Worker and an app with the CLI, run the stack, and watch the app answer an HTTP request with live fleet data"
docs@tether_slug: tutorials/see-an-app-serve-data
---

> [!NOTE]
> If Kernel, Gateway, Worker, or app are unfamiliar, read [terminology][terminology] first.

## Overview

The Gateway serves no data routes of its own. It routes HTTP requests to apps, so every endpoint your application reads comes
from an app your stack declares. This tutorial scaffolds one with the `mdk` CLI and runs it so you can watch that happen once
before writing your own.

What you'll have at the end:

- A mock miner Worker with one seed device, scaffolded by `mdk create worker`
- An app with one read-only route, scaffolded by `mdk create app` and running in its own process
- A Gateway on `:3847` forwarding `GET /apps/fleet/api/fleet/summary` to that app
- The JSON body of that request printed to your terminal, counting the Workers and devices the Kernel knows about

## Prerequisites

- [Node.js][node] >=24 (LTS)
- npm 11 [(< 12)][npm-version]
- The [`mdk` CLI installed][cli-install]
- [Outbound UDP to the HyperDHT bootstrap nodes][network-requirements]
- `jq`, to read the access token out of the sign-in response

<Steps>

<Step>

### Create a project

```bash
mkdir fleet-demo && cd fleet-demo
```

Write a minimal `mdk.yaml`:

```yaml
apiVersion: mdk/v1
kind: Stack
metadata:
  name: fleet-demo
spec:
  workers: []
  gateway:
    port: 3847
  apps: []
```

`mdk onboard` writes the same file interactively; this tutorial keeps it to the fields it uses.

</Step>

<Step>

### Scaffold a Worker and an app

```bash
mdk create worker demo-miner
mdk create app fleet
```

Each command copies a template, links the package into the project's `package.json`, runs `npm install`, and adds an entry to
`mdk.yaml`: the Worker under `spec.workers` with a `mock: true` seed device, the app under `spec.apps`. `mdk create app` also
builds the app's starter UI into `ui/` and writes the app's grant into `spec.rbac`: the role and binding that give it the
Kernel access its manifest requests.

</Step>

<Step>

### Run the stack

```bash
mdk rbac init
mdk run
```

`mdk rbac init` completes `spec.rbac`: it binds the CLI's own account to an admin role and reports the app grant that
`mdk create app` already wrote as in place. Without the admin binding `mdk run` refuses to boot a Kernel nobody could
administer.

`mdk run` boots the Kernel, the Worker and its mock device, one runtime process for the app, then the Gateway. Leave it running.
No app route is open, so [create the first operator][first-operator] from a second terminal, sign in, and call the route with
the access token:

```bash
mdk user add ops@example.com --admin   # prompts for a password of at least 12 characters; the Kernel must still be running

TOKEN=$(curl -s -X POST http://localhost:3847/auth/login \
  -H 'content-type: application/json' \
  -d '{"username":"ops@example.com","password":"<the password you set>"}' | jq -er .accessToken)

curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3847/apps/fleet/api/fleet/summary
```

Expected output:

```text
{"ok":true,"kernelConnected":true,"workerCount":1,"deviceCount":1,"workers":[{"workerId":"demo-miner","devices":1}]}
```

> [!IMPORTANT]
> If `mdk run` reports every component ready but `mdk user add` answers `Kernel unreachable`, the machine has no outbound UDP
> to the DHT bootstrap nodes: the components booted, but the CLI cannot reach the Kernel from a second terminal. Open the
> network as the prerequisites describe, or run the stack on the [local and air-gapped profile][private-dht].

A `workerCount` of `0` means the Worker has not registered yet; call again after a few seconds. That JSON came from a route the
Gateway did not have until the stack declared an app that serves it.

</Step>

<Step>

### Read the files that produced it

The parts of the app this tutorial exercises are a manifest, a route table and a controller. The scaffold also ships a starter
UI, which no step here opens:

```text
apps/fleet/
├── mdk-app.yaml               # id, version, displayName, permissions, config defaults
├── plugin/
│   ├── mdk-plugin.json        # the route table the Gateway reads
│   ├── lib/client.js          # the app's MDK client
│   └── controllers/summary.js # the handler
├── ui-src/                    # starter page source, not used in this tutorial
└── ui/                        # that page, built by `mdk create app`
```

`plugin/mdk-plugin.json` declares the route: an `id`, the `handler` path, an `http` block giving the method and path, and
`"safety": "read-only"`, which is what lets `mdk run mcp` offer the route to an agent as a tool.

`plugin/controllers/summary.js` is the handler, shown abridged. Every controller is `async function (req)` and returns a
plain object, which is sent back as JSON. It never touches a response object:

```js
const mdkClient = require('../lib/client')

module.exports = async function summary (req) {
  const resp = await mdkClient.listWorkers()
  const workers = (resp && resp.workers) || []
  // ... count devices across every Worker and return the counts
}
```

The generated file also catches `ERR_MDK_CLIENT_UNAVAILABLE` and answers `kernelConnected: false`, so the route stays
callable while the Kernel is still booting.

`mdkClient`, built once for the app in `plugin/lib/client.js` from `require('@tetherto/mdk-gateway/plugin')`, is the same
protocol client used everywhere else in MDK. **Aggregation lives here, in the app.** Workers are structurally single-device,
so a Worker can only ever answer for one device; combining them into a fleet view is the app's job.

> [!NOTE]
> The route answered because `--admin` bound `ops@example.com` to a role holding wildcards. Every app route is checked against `spec.rbac`:
> a request with no token answers `401`, and a signed-in caller with no rule over `fleet/api/fleet/summary` answers `403`.
> Narrowing a user down to the resources they should reach is covered in
> [auth and permissions](../guides/gateway/apps.md#auth-and-permissions).

</Step>

</Steps>

## What just happened

1. **Scaffolding** copied a Worker template (a mock miner: a small HTTP JSON device API) and an app template into
   `workers/demo-miner` and `apps/fleet`, and registered both in `mdk.yaml`.
2. **Kernel** started fail-closed. Each caller, the app runtime included, published its key to `.mdk/trusted-keys/`, which is how the Kernel admits it.
   Admission only lets a caller connect: every request past sign-in carries an access token the Kernel checks against `spec.rbac`.
3. **Worker** started with its mock device and registered with the Kernel in the same process. Run on its own with
   `mdk run worker`, it publishes its key to `.mdk/keys/` instead, where the Kernel discovers it.
4. **App runtime** started `apps/fleet` in its own process, loaded its route table and controller, and accepted calls only from the Gateway's key.
5. **Gateway** signed `ops@example.com` in at `/auth/login`, checked the access token and the rule over `fleet/api/fleet/summary`, then read the app's
   `mdk-plugin.json`, mounted its route under `/apps/fleet`, and forwarded your request to the app runtime over HRPC.
6. **The controller** called `listWorkers()` on the Kernel and returned the counts as JSON.

## Cleanup

Stop `mdk run` with Ctrl+C, then remove the project:

```bash
cd .. && rm -rf fleet-demo
```

## Next steps

- Write your own routes by [building an app][apps]: the manifests, controllers, reading hardware, and sending commands
- Put a page in front of your route by [building a minimal single-page dashboard][build-a-dashboard]: the same shape with a React front end
- Integrate your own hardware by [building a third-party Worker][build-a-worker]
- See the whole stack instead of one route by [running a mining site end to end][run-a-site]

## Links

[node]: https://nodejs.org/
<!-- docs@tether.io: external link — preserve URL -->

[npm-version]: ../reference/environment.md#why-npm-stays-below-12
<!-- docs@tether.io: npm-version → reference/environment -->

[terminology]: ../reference/glossary.md
<!-- docs@tether.io: terminology → reference/glossary -->

[cli-install]: ../guides/cli/install.md
<!-- docs@tether.io: cli-install → guides/cli/run-with-npm -->

[apps]: ../guides/gateway/apps.md
<!-- docs@tether.io: apps → guides/gateway/apps -->

[build-a-dashboard]: build-a-dashboard.md
<!-- docs@tether.io: build-a-dashboard → tutorials/build-a-dashboard -->

[build-a-worker]: ../guides/workers/build-a-worker.md
<!-- docs@tether.io: build-a-worker → guides/workers/build-a-worker -->

[run-a-site]: run-a-site.md
<!-- docs@tether.io: run-a-site → tutorials/run-a-site -->

[first-operator]: ../guides/security/create-the-first-operator.md
<!-- docs@tether.io: first-operator → guides/security/create-the-first-operator -->

[network-requirements]: ../reference/environment.md#requirements
<!-- docs@tether.io: network-requirements → reference/environment#requirements -->

[private-dht]: ../guides/deployment/private-dht.md
<!-- docs@tether.io: private-dht → guides/deployment/private-dht -->
