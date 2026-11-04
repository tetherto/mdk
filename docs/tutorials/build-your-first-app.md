---
title: Build your first app with a UI
description: "[⏱️ ~15 min] From an npm install to your own MDK app, with its page in the MDK dashboard, reading a mock miner"
docs@tether_slug: tutorials/build-your-first-app
lastReviewedAt: "0.13.1"
---

> [!NOTE]
> If **Kernel**, **Worker**, or **Gateway** are unfamiliar terms, read [the architecture overview][architecture] first. You don't need it to
> finish this page: every step is a command.

## Overview

This quickstart takes a clean machine with Node.js to a running MDK project of your own, using only the `mdk` CLI: one Worker reading a
mock miner, one app with its own HTTP route and React page, and the MDK dashboard that loads that page. You write no code until the last
step, where you change the starter page and see it update.

What you'll have at the end:

- A Worker, `rig`, reading a mock miner served over HTTP, the same way a real device on the LAN would be
- An app, `ops`, serving `GET /apps/ops/api/ops/summary` through the Gateway, with a starter page built from MDK UI components
- The MDK dashboard at `http://localhost:3030`, showing the app's page and its card on Home

The project is a directory of its own:

```text
my-site/
├── mdk.yaml              # the stack spec: Kernel, Gateway, Workers, apps
├── package.json          # links workers/ and apps/<name>/ by file: dependencies
├── workers/
│   └── rig/              # the Worker: contract, handlers, mock device
├── apps/
│   ├── ops/              # the app: route table, controllers, ui-src/ and the built ui/
│   └── dashboard/        # the MDK dashboard (UI shell)
└── .mdk/                 # runtime state written by `mdk run`, disposable
```

## Prerequisites

- Node.js `>=24`
- npm 11 ([below 12][npm-below-12])
- Network access to npm and to GitHub, where the dashboard template is fetched from
- `jq`, to read the access token out of the sign-in response
- macOS or Linux, with a bash or zsh shell
- About 2 GB of free disk space
- Ports `3847` (Gateway), `49737` (the private DHT bootstrap) and `3030` (dashboard) free. `mdk run` fails if the Gateway port is
  taken, so stop any stack still running from an earlier demo first. The dashboard moves to another port on its own.

## Time

The commands themselves take a few minutes on a fast connection with an empty npm cache; the longest waits are the dashboard's
install and the app's starter UI build. A slower machine or network takes several times longer and still fits in 15 minutes with
time to read each step. A second project skips the first part.

<Steps>

<Step>

### Install the CLI

```bash
npm install -g @tetherto/mdk-cli
mdk --version
```

Every `mdk` command below runs from the project directory, in whichever terminal you open. The [install guide][cli-install]
covers `npx` for one-off use, and the source checkout for working on the CLI itself.

</Step>

<Step>

### Create a project

Make a directory anywhere and write its stack spec:

```bash
mkdir ~/my-site && cd ~/my-site
cat > mdk.yaml <<'YAML'
apiVersion: mdk/v1
kind: Stack
metadata:
  name: my-site
spec:
  network:
    dht: { host: 127.0.0.1, port: 49737 }
  kernel: { port: 3848 }
  gateway: { port: 3847 }
  workers: []
  apps: []
YAML
```

> [!TIP]
> `mdk onboard` writes the same file interactively and can add Workers, apps and the dashboard for you. It needs an interactive terminal.
> CLI `0.13.1` and later also write `spec.network.dht`; if `mdk --version` prints `0.13.0`, add that block to the file by hand.

`spec.network.dht` keeps the stack on a private bootstrap on loopback, so it needs no internet access. Drop it and every
component joins the public HyperDHT through `*.hyperdht.org`, which needs outbound UDP to those hosts — on a network that
blocks it, `mdk run` stops after `Starting worker …` and `mdk status` reports the Kernel unreachable with
`ERR_MDK_STATUS_TIMEOUT`. [Private DHT](../guides/deployment/private-dht.md) covers multi-host setups.

</Step>

<Step>

### Scaffold the Worker, the app and the dashboard

#### 3.1 Create the Worker

```bash
mdk create worker rig
```

This writes `workers/rig/`, a Worker Plugin with one mock device, adds it to `mdk.yaml` under `spec.workers`, and installs it.

#### 3.2 Create the app

```bash
mdk create app ops
```

This writes `apps/ops/` with a route table, a `summary` controller and a starter UI, adds it to `mdk.yaml` under `spec.apps`, and builds
the UI into `apps/ops/ui/`.

Expected output includes:

```text
✔ Scaffolded app ops → /home/you/my-site/apps/ops
  package ops
  ✔ Built the starter UI → ui/index.js (source in ui-src/)
  ✔ Added to mdk.yaml under spec.apps
  mdk.yaml spec.rbac role app-ops grants app:ops the Kernel access it requests
```

That last line is the app's own access policy: `mdk create app` writes an `app-ops` role from the app's `mdk-app.yaml`
permissions and binds it to the `app:ops` service account, so the app can reach the Kernel once the stack runs.

#### 3.3 Create the dashboard

```bash
mdk create dashboard
```

This copies the MDK dashboard into `apps/dashboard/`, points its dev server at the Gateway port from `mdk.yaml`, and installs it.

</Step>

<Step>

### Run it

#### 4.1 Start the stack

```bash
mdk rbac init
mdk run
```

`mdk rbac init` writes the roles and bindings `spec.rbac` needs, binding the CLI's own account to an admin role; the app's grant from
step 3.2 is already in place, so it reports `app ops grant already in place`. Without the admin binding `mdk run` refuses to boot a
Kernel nobody could administer.

`mdk run` boots the Kernel, the `rig` Worker with its mock miner, the `ops` app, and the Gateway in one process. Expected output ends with:

```text
✔ gateway listening on http://localhost:3847

Stack running. Press Ctrl+C to stop.
```

#### 4.2 Create a user

No route is open, so the dashboard and the HTTP call below both need a signed-in user. In a second terminal, from `~/my-site`,
with the Kernel still running:

```bash
mdk user add ops@example.com --admin   # prompts for a password
```

`--admin` binds the user to a role holding wildcards, which is what makes every route below answer. [Creating the first
operator][first-operator] covers what the flag writes, the other ways to sign in, and the failures to expect.

#### 4.3 Start the dashboard

From that same terminal:

```bash
mdk run dashboard
```

The dashboard dev server prints its URL, `http://localhost:3030/` unless that port is taken.

#### 4.4 Open the app

Open `http://localhost:3030/` in a browser and sign in as `ops@example.com` with the password you just set. Home shows an `ops` card with
**Workers 1** and **Devices 1**. Select `ops` in the sidebar to open the app's own page.

The same data is one HTTP call away. From any terminal:

```bash
TOKEN=$(curl -s -X POST http://localhost:3847/auth/login \
  -H 'content-type: application/json' \
  -d '{"username":"ops@example.com","password":"<the password you set>"}' | jq -er .accessToken)

curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3847/apps/ops/api/ops/summary
```

Expected output:

```text
{"ok":true,"kernelConnected":true,"workerCount":1,"deviceCount":1,"workers":[{"workerId":"rig","devices":1}]}
```

</Step>

<Step>

### Change the page

The page's source is `apps/ops/ui-src/`. Change the line under the heading in `apps/ops/ui-src/pages/overview-page.tsx`, then rebuild:

```bash
cd ~/my-site/apps/ops
npm run build:ui
```

Reload the `ops` page in the browser to see the change. `npm run dev:ui` rebuilds on every save instead.

</Step>

</Steps>

## What just happened

1. **`mdk.yaml`** is the stack spec. Each `mdk create` command added its component to it, and `mdk run` boots what it lists.
2. **The Worker** runs its mock miner (`mock: true` in `mdk.yaml`) and registers its device with the Kernel.
3. **The app** declares its routes in `apps/ops/plugin/mdk-plugin.json`. Its `summary` controller asks the Kernel which Workers and devices
   are connected.
4. **The Gateway** signs users in at `/auth/login`, checks every call against the `spec.rbac` rules bound to the signed-in user, serves the app's
   routes under `/apps/ops/`, and forwards each allowed call to the app.
5. **The dashboard** serves the app's built UI from `apps/ops/ui/`, and its dev server proxies `/apps/*` to the Gateway, so the page fetches
   from the same origin.

## Cleanup

Press Ctrl+C in both terminals. `mdk run` stops every component it started.

To reset the stack's state, delete `~/my-site/.mdk/`. To remove the project, delete `~/my-site/`.

## Next steps

- [Add your own route][cli-apps]: extend `apps/ops/plugin/` and read live telemetry from the Worker
- [Connect your own hardware][build-a-worker]: turn the scaffolded Worker into one for a real device
- [Run a mining site end to end][run-a-site]: boot the full demo site with several Worker families and a richer dashboard
- [Wire a dashboard by hand][build-a-dashboard]: learn what the CLI scaffolds by assembling each piece yourself

[architecture]: ../concepts/architecture.md
<!-- docs@tether.io: architecture → concepts/architecture -->

[npm-below-12]: ../reference/environment.md#why-npm-stays-below-12
<!-- docs@tether.io: npm-below-12 → reference/environment#why-npm-stays-below-12 -->

[cli-apps]: ../guides/gateway/apps.md
<!-- docs@tether.io: cli-apps → guides/gateway/apps -->

[cli-install]: ../guides/cli/install.md
<!-- docs@tether.io: cli-install → guides/cli/run-with-npm -->

[first-operator]: ../guides/security/create-the-first-operator.md
<!-- docs@tether.io: first-operator → guides/security/create-the-first-operator -->

[build-a-worker]: ../guides/workers/build-a-worker.md
<!-- docs@tether.io: build-a-worker → guides/workers/build-a-worker -->

[run-a-site]: run-a-site.md
<!-- docs@tether.io: run-a-site → tutorials/run-a-site -->

[build-a-dashboard]: build-a-dashboard.md
<!-- docs@tether.io: build-a-dashboard → tutorials/build-a-dashboard -->
