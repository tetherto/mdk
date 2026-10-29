---
title: Build your first app with a UI
description: "[⏱️ <15 min] From git clone to your own MDK app, with its page in the MDK dashboard, reading a mock miner"
docs@tether_slug: tutorials/build-your-first-app
---

> [!NOTE]
> If **Kernel**, **Worker**, or **Gateway** are unfamiliar terms, read [the architecture overview][architecture] first. You don't need it to
> finish this page: every step is a command.

## Overview

This quickstart takes a clean machine with Node.js to a running MDK project of your own, using only the `mdk` CLI: one Worker reading a
mock miner, one app with its own HTTP route and React page, and the MDK dashboard that loads that page. You write no code until the last
step, where you change the starter page and see it update.

What you'll have at the end:

- A Worker, `rig`, reading a mock miner that speaks the real wire protocol
- An app, `ops`, serving `GET /apps/ops/api/ops/summary` through the Gateway, with a starter page built from MDK UI components
- The MDK dashboard at `http://localhost:3030`, showing the app's page and its card on Home

The project lives outside the MDK checkout:

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
- git
- macOS or Linux, with a bash or zsh shell
- About 2 GB of free disk space
- Ports `3847` (Gateway), `3848` (Kernel) and `3030` (dashboard) free. `mdk run` fails if the Gateway or Kernel port is taken, so stop
  any stack still running from an earlier demo first. The dashboard moves to another port on its own.

## Time

| Part                            | Measured     | What takes the time                                       |
| ------------------------------- | ------------ | --------------------------------------------------------- |
| Get MDK                         | 1 min 2 s    | Clone, two `npm ci` runs, building the UI packages        |
| Create and scaffold the project | 1 min 19 s   | The dashboard's install, then the app's starter UI build  |
| Run it                          | 20 s         | Booting the stack and the dashboard dev server            |
| **Total**                       | **2 min 41 s** |                                                         |

These are command times from a fresh clone with an empty npm cache, so every package is downloaded, measured on an Apple M1 Pro with a
fast connection. A slower machine or network takes several times longer and still fits in 15 minutes with time to read each step. A second
project skips the first part.

<Steps>

<Step>

### Get MDK

#### 1.1 Clone the repo

```bash
git clone https://github.com/tetherto/mdk.git
cd mdk
```

#### 1.2 Install and build once

```bash
npm ci                                # the backend packages and the CLI
npm --prefix ui ci                    # the UI packages
npm run build:ui                      # build them: the dashboard and app UIs link to the built output
npm run build -w @tetherto/mdk-cli    # build the CLI
npm rebuild @tetherto/mdk-cli         # link the `mdk` command, now that it is built
export PATH="$PWD/node_modules/.bin:$PATH"
mdk --version
```

The `export` puts `mdk` on your `PATH` for this terminal only. Step 4 opens a second terminal; run the same `export` line there, from the
`mdk` directory, or add it to your shell profile with the absolute path.

> [!NOTE]
> Until the MDK packages are on npm, the CLI runs from this checkout, and the projects it scaffolds link the MDK packages from it. Keep the
> checkout where it is while you use the project.

</Step>

<Step>

### Create a project

Make a directory anywhere outside the checkout and write its stack spec:

```bash
mkdir ~/my-site && cd ~/my-site
cat > mdk.yaml <<'YAML'
apiVersion: mdk/v1
kind: Stack
metadata:
  name: my-site
spec:
  kernel: { port: 3848 }
  gateway: { port: 3847 }
  workers: []
  apps: []
YAML
```

> [!TIP]
> `mdk onboard` writes the same file interactively and can add Workers, apps and the dashboard for you. It needs an interactive terminal.

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

Expected output ends with:

```text
✔ Scaffolded app ops → /home/you/my-site/apps/ops
  package ops
  ✔ Built the starter UI → ui/index.js (source in ui-src/)
  ✔ Added to mdk.yaml under spec.apps
```

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
mdk run
```

This boots the Kernel, the `rig` Worker with its mock miner, the `ops` app and the Gateway in one process. Expected output ends with:

```text
✔ gateway listening on http://localhost:3847

Stack running. Press Ctrl+C to stop.
```

#### 4.2 Start the dashboard

In a second terminal, from `~/my-site`, with `mdk` on your `PATH`:

```bash
mdk run dashboard
```

The dashboard dev server prints its URL, `http://localhost:3030/` unless that port is taken.

#### 4.3 Open the app

Open `http://localhost:3030/` in a browser. Home shows an `ops` card with **Workers 1** and **Devices 1**. Select `ops` in the sidebar to
open the app's own page.

The same data is one HTTP call away. From any terminal:

```bash
curl http://localhost:3847/apps/ops/api/ops/summary
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
4. **The Gateway** serves the app's routes under `/apps/ops/` and forwards each call to the app.
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

[cli-apps]: ../../packages/cli/README.md#apps
<!-- docs@tether.io: cli-apps → https://github.com/tetherto/mdk/blob/main/packages/cli/README.md#apps -->

[build-a-worker]: ../guides/workers/build-a-worker.md
<!-- docs@tether.io: build-a-worker → guides/workers/build-a-worker -->

[run-a-site]: run-a-site.md
<!-- docs@tether.io: run-a-site → tutorials/run-a-site -->

[build-a-dashboard]: build-a-dashboard.md
<!-- docs@tether.io: build-a-dashboard → tutorials/build-a-dashboard -->
