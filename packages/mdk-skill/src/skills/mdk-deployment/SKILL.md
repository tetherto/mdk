---
name: mdk-deployment
description: >
  Deploy and run a working MDK stack from mdk.yaml. Use when the task mentions
  "deploy", "run the stack", "start the Kernel + Workers + Gateway",
  "register a plugin", "mdk.yaml", or MDK environment configuration.
metadata:
  suite: mdk-developer-skill
  mdk_version: "0.5.0"
license: Apache-2.0
---

# Deploy and run an MDK stack

In CLI-managed projects (this folder), the stack is declared in `mdk.yaml` and
started with `mdk run`. Boot order matters: **Kernel → Workers → Gateway/UI**.

## Project shape

```
<project>/
├── mdk.yaml                 # Stack spec (source of truth)
├── package.json             # private root manifest; workers/* + plugins/* are npm workspaces
├── plugins/<name>/          # Gateway plugins (mdk create plugin)
├── workers/<name>/          # Worker Plugin packages (mdk create worker)
├── apps/dashboard/          # UI shell (mdk create dashboard) — apps/<name> if named explicitly
└── .mdk/                    # runtime state written by `mdk run` — gitignored, disposable
```

`workers/*` and `plugins/*` are npm workspaces: one root `npm install` links
every component into the project's `node_modules`, which is how the Gateway
and `mdk run` resolve them. `apps/*` (the dashboard) is deliberately **not** a
workspace — it links the MDK UI packages by `file:` path and installs on its
own, so its React is never hoisted alongside those links.

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
    plugins:
      - package: <plugin-package-name>   # e.g. fleet-summary, or @org/name
        config: {}
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

Both `mdk create worker <name>` and `mdk create plugin <name>` scaffold the
package **and** register it here automatically (Workers under
`spec.workers`, plugins under `spec.gateway.plugins`) — no manual
`package.json` linking step. They also seed a stack-unique mock port/device id
per Worker, so scaffolding several in one project never collides. If you add a
package by hand instead, mirror that: `npm install` at the project root (which
links the new workspace member), then append the entry yourself.

## Run commands

```bash
mdk run                     # whole stack from mdk.yaml: kernel + workers + gateway together
mdk run kernel
mdk run gateway
mdk run worker <name>       # e.g. mdk run worker demo-miner
mdk run dashboard           # the scaffolded UI shell's dev server
mdk run mcp                 # standalone MCP server for AI agents (needs Kernel running first)
```

`mdk run` with no target boots everything together; that's not a spec setting,
just which command you type. Use the per-component targets and separate
terminals when debugging one tier. Gateway port is `spec.gateway.port`
(example: `3847`); curl plugins at `http://127.0.0.1:<gateway-port>/api/...`.

Like the dashboard, `mcp` is never part of the default `all` target — always
start it explicitly, in its own terminal, after `mdk run kernel` (a standalone
`run mcp` has no in-process Kernel handle to reuse). It exposes each declared
Gateway plugin's routes as agent-callable tools, over `spec.mcp.port` if set,
else `spec.gateway.port + 100`.

Ctrl+C / SIGTERM stops components in reverse boot order (Gateway → Workers →
Kernel) and always exits, even if a component's own shutdown hangs.

### Verify

```bash
mdk status                              # environment + Kernel/Gateway/worker health, exit code encodes it
mdk status -o json | jq .health
curl -s http://127.0.0.1:3847/api/<route> | jq .
```

`mdk status` never starts, stops or repairs anything — it probes the Kernel
over HRPC and the Gateway over HTTP and reports declared-vs-registered Workers.
Exit codes: `0` healthy, `4` precondition not met (bad Node, invalid
`mdk.yaml`, packages not installed), `5` stack not fully up.

UI: `mdk run dashboard` (or `cd apps/dashboard && npm run dev` directly) and
open the page route added by `mdk-ui-component`.

## Scaffolding helpers

| Need               | Command                                                |
| ------------------ | ------------------------------------------------------ |
| Guided `mdk.yaml`  | `mdk onboard`                                          |
| New Worker package | `mdk create worker <name>` → then `mdk-worker-plugin`  |
| New Gateway plugin | `mdk create plugin <name>` → then `mdk-gateway-plugin` |
| New dashboard app  | `mdk create dashboard`                                 |

All three run `npm install` by default (`--no-install` to skip) and, for
Workers/plugins, install at the project root so the new package links as a
workspace member rather than getting its own nested `node_modules`.

## Boot-order invariant

1. Kernel listening.
2. Workers announce on the DHT topic, or attach directly when run in the same process.
3. Gateway loads plugins (needs Kernel + client).
4. UI last — it only talks to the Gateway.

Starting the UI or a plugin before the Worker is online yields empty arrays,
not necessarily HTTP errors — treat an empty `devices: []` in a plugin
response as a deployment signal, not a bug.

## Hand-off

| Next need                          | Skill                |
| ---------------------------------- | -------------------- |
| How many Workers / which host tier | `mdk-site-sizing`    |
| New device Worker                  | `mdk-worker-plugin`  |
| New aggregation API                | `mdk-gateway-plugin` |
| New dashboard page                 | `mdk-ui-component`   |
