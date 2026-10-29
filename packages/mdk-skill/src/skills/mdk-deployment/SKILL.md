---
name: mdk-deployment
description: >
  Deploy and run a working MDK stack from mdk.yaml. Use when the task mentions
  "deploy", "run the stack", "start the Kernel + Workers + Gateway",
  "register a plugin", "register an app", "mdk.yaml", or MDK environment configuration.
metadata:
  suite: mdk-developer-skill
  mdk_version: "0.5.0"
license: Apache-2.0
---

# Deploy and run an MDK stack

In CLI-managed projects (this folder), the stack is declared in `mdk.yaml` and
started with `mdk run`. Boot order matters: **Kernel → Workers → apps → Gateway/UI**.

## Project shape

```
<project>/
├── mdk.yaml                 # Stack spec (source of truth)
├── package.json             # private root manifest; links workers/<name> and apps/<name> by file: deps
├── workers/<name>/          # Worker Plugin packages (mdk create worker)
├── apps/<name>/             # apps: mdk-app.yaml + plugin/ route table (mdk create app)
├── apps/dashboard/          # UI shell (mdk create dashboard)
└── .mdk/                    # runtime state written by `mdk run` — gitignored, disposable
```

Workers and apps are linked from the root manifest by relative `file:`
dependencies: one root `npm install` links every component into the project's
`node_modules`, which is how `mdk run` resolves them. The dashboard is
deliberately **not** linked — it links the MDK UI packages by `file:` path and
installs on its own, so its React is never hoisted alongside those links.

## `mdk.yaml` essentials

```yaml
apiVersion: mdk/v1
kind: Stack
metadata:
  name: <stack-name>
spec:
  kernel:
    port: 3848
  gateway:
    port: 3847
  apps:
    - name: <app-name>                 # ^[a-z][a-z0-9-]*$; routes served under /apps/<app-name>
      package: <app-package-name>      # e.g. fleet-summary, or @org/name
      config: {}                       # overrides the mdk-app.yaml config defaults
      # mount: /                       # serve at the Gateway root (required for @tetherto/mdk-app-agent)
  mcp:
    port: 3947   # optional — defaults to gateway.port + 100
  workers:
    - name: <worker-name>
      package: ./workers/<worker-name>   # local path, or an installed npm name
      config:
        mock: true
        devices:
          - id: dev-0
            opts: { host: 127.0.0.1, port: 18080, serial: DEV-0 }
```

Both `mdk create worker <name>` and `mdk create app <name>` scaffold the
package **and** register it here automatically (Workers under
`spec.workers`, apps under `spec.apps`) — no manual
`package.json` linking step. `create worker` also seeds a stack-unique mock port/device id
per Worker, so scaffolding several in one project never collides. A published
package goes through `mdk add app <npm-or-github-source>` / `mdk add worker <source>`,
which installs it, validates it, and only then adds the entry. If you add a
package by hand instead, mirror that: `npm install` at the project root, append the
entry yourself, then check it with `mdk validate app <name>` / `mdk validate worker <name>`.

`spec.gateway.plugins` is rejected by the CLI; move each entry to `spec.apps` with a `name`.

## Run commands

```bash
mdk run                     # whole stack from mdk.yaml: kernel + workers + one process per app + gateway
mdk run kernel
mdk run gateway
mdk run worker <name>       # e.g. mdk run worker demo-miner
mdk run app <name>          # one app runtime, in the foreground
mdk run dashboard           # the scaffolded UI shell's dev server
mdk run mcp                 # standalone MCP server for AI agents (needs Kernel running first)
```

`mdk run` with no target boots everything together; that's not a spec setting,
just which command you type. Use the per-component targets and separate
terminals when debugging one tier. Gateway port is `spec.gateway.port`
(example: `3847`); curl an app at `http://127.0.0.1:<gateway-port>/apps/<app-name>/api/...`
(or at `/api/...` when its entry sets `mount: /`). Each app runs in its own runtime process
and accepts calls only from the Gateway's key; the Gateway forwards each request to it.

Like the dashboard, `mcp` is never part of the default `all` target — always
start it explicitly, in its own terminal, after `mdk run kernel` (a standalone
`run mcp` has no in-process Kernel handle to reuse). It reads `spec.apps` and exposes each
declared app's routes as agent-callable tools, over `spec.mcp.port` if set,
else `spec.gateway.port + 100`. Routes not marked `"safety": "read-only"` are withheld
unless it is started with `--allow-write`.

Every caller signs in to the Kernel as its own service account (the CLI as `mdk-cli`, the Gateway as
`mdk-gateway`, each app as `app:<name>`) and may do only what a `spec.rbac` binding grants it. An app's
`permissions` in `mdk-app.yaml` become its role (`mdk create app`, `mdk add app` and `mdk rbac init` write it;
the [`mdk-app-rbac`](../mdk-app-rbac/SKILL.md) skill derives it from the code). A `spec.rbac` under which nobody
may write the policy makes `mdk run` refuse to boot the Kernel: run `mdk rbac init` first.

Ctrl+C / SIGTERM stops components in reverse boot order (Gateway → apps → Workers →
Kernel) and always exits, even if a component's own shutdown hangs.

### Verify

```bash
mdk status                              # environment + Kernel/Gateway/worker health, exit code encodes it
mdk status -o json | jq .health
curl -s http://127.0.0.1:3847/apps/<app-name>/api/<route> | jq .
```

`mdk status` never starts, stops or repairs anything — it probes the Kernel
over HRPC and the Gateway over HTTP, reports declared-vs-registered Workers, and
counts an app as running while a live process holds its run lock.
Exit codes: `0` healthy, `4` precondition not met (bad Node, invalid
`mdk.yaml`, packages not installed), `5` stack not fully up.

UI: `mdk run dashboard` (or `cd apps/dashboard && npm run dev` directly) and
open the page route added by `mdk-ui-component`.

## Scaffolding helpers

| Need               | Command                                                |
| ------------------ | ------------------------------------------------------ |
| Guided `mdk.yaml`  | `mdk onboard`                                          |
| New Worker package | `mdk create worker <name>` → then `mdk-worker-plugin`  |
| New app            | `mdk create app <name>` (`mdk-create-app`) → then `mdk-gateway-plugin` for its routes |
| Published app      | `mdk add app <npm-or-github-source>`                   |
| New dashboard app  | `mdk create dashboard`                                 |

The `create` commands run `npm install` by default (`--no-install` to skip) and, for
Workers/apps, install at the project root so the new package links into the
project rather than getting its own nested `node_modules`.

## Boot-order invariant

1. Kernel listening.
2. Workers announce on the DHT topic, or attach directly when run in the same process.
3. One runtime process per app (each builds its own Kernel client).
4. Gateway reads each app's route table and forwards requests to its runtime; an app not up yet answers `503`.
5. UI last — it only talks to the Gateway.

Starting the UI or an app before the Worker is online yields empty arrays,
not necessarily HTTP errors — treat an empty `devices: []` in an app
response as a deployment signal, not a bug.

## Hand-off

| Next need                          | Skill                |
| ---------------------------------- | -------------------- |
| How many Workers / which host tier | `mdk-site-sizing`    |
| New device Worker                  | `mdk-worker-plugin`  |
| New app package                    | `mdk-create-app`     |
| New aggregation API                | `mdk-gateway-plugin` |
| New dashboard page                 | `mdk-ui-component`   |
