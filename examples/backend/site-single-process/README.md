# MDK site example (single-process)

Example deployment of an MDK site in **single-process** mode: one HTTP gateway and N miner Workers run inside the same Node.js process — no PM2, no Docker. 
Useful for local development, demos, and minimal-footprint deployments.

For the multi-process (PM2 or Docker) deployment, see [`examples/backend/site`](../site/README.md).

## Prerequisites

- **Node.js** >= 24
- Monorepo dependencies installed:

```bash
cd backend/core && npm run install:packages
cd backend/workers && npm run install:packages
```

## Site configuration

Copy and edit the site config:

```bash
cp config/mdk.config.json.example config/mdk.config.json
```

| Field | Description |
|-------|-------------|
| `mode` | Must be `"single-process"` |
| `env` | Optional. `"development"` or `"production"` (default: `development`) |
| `noAuth` | Optional. Set `true` to disable JWT auth on `/auth/*` routes — useful for smoke-testing endpoints with plain `curl`. Default: `false`. **Dev only — never enable in production.** |
| `services` | List of services to start in this process (see below) |

### Default services

| Name | Kind | Role |
|------|------|------|
| `kernel` | `kernel` | Orchestration Kernel — must come first; required by `gateway` and Workers |
| `gateway` | `gateway` | HTTP API on port `3000` |
| `wm-m56s` | `worker` | Whatsminer M56S Worker (`miner-whatsminer`) |
| `am-s19xp` | `worker` | Antminer S19XP Worker (`miner-antminer`) |

Worker entries require `worker`, `type`, and `rack` fields. Supported `worker:type` pairs are listed in `WORKER_REGISTRY` at the top of `index.js`; mirror that map if you add a manager class to `backend/workers/`.

The `kernel` entry must appear before any `gateway` or `worker` entry — both depend on the orchestrator being up. The example bails 
with `ERR_KERNEL_REQUIRED` if they're declared out of order.

## Directory layout

### Committed (source)

```
examples/backend/site-single-process/
├── README.md                 # This file
├── package.json              # Site npm scripts
├── index.js                  # In-process orchestration entry
├── config/
│   └── mdk.config.json.example
└── .gitignore
```

### Generated (do not commit)

```
examples/backend/site-single-process/
├── config/
│   └── mdk.config.json       # Your local config (copy from .example)
└── data/                     # Per-Worker runtime data (created at run time)
    └── rack-<name>/          # Per-rack store

$TMPDIR/mdk-site-single-process/
├── kernel/                      # Kernel's Corestore
│   └── store/kernel-db/
└── gateway/                 # Gateway's config/store
    ├── config/facs/
    └── ...
```

Kernel and gateway are pinned to sibling directories under `$TMPDIR/mdk-site-single-process/` — Hypercore's storage can't tolerate one
`Corestore` directory being nested under another in the same process, and the framework defaults put Kernel at `$TMPDIR/mdk/` with
gateway at `$TMPDIR/mdk/gateway/`. The example overrides both roots to disjoint sibling paths.

`initialize()` also creates a repo-level `tmp/` layout (configs, Worker stubs) under the monorepo root.

## How it works

`index.js` reads `config/mdk.config.json`, calls `initialize()` once, then walks `services[]` and dispatches each entry to the matching programmatic 
API exported from `backend/core/mdk`:

```mermaid
flowchart LR
  Config[mdk.config.json] --> Index[index.js]
  Index --> Init[initialize]
  Index --> Kernel[getKernel]
  Index --> Gateway[startGateway]
  Index --> Worker1[startWorker wm-m56s]
  Index --> Worker2[startWorker am-s19xp]

  subgraph proc [Single Node.js process]
    Init
    Kernel
    Gateway
    Worker1
    Worker2
  end

  Gateway <-->|MDK Protocol over HRPC| Kernel
  Kernel <-->|MDK Protocol over HRPC| Worker1
  Kernel <-->|MDK Protocol over HRPC| Worker2
```

All five layers run in one Node.js heap but still talk over the real MDK Protocol — the surface behavior is identical to the microservices example 
from a client's perspective.

The gateway connects to Kernel over HRPC — the example passes the in-process Kernel's public key (`kernel.getPublicKey()`) as `kernelKey` to 
`startGateway`. Workers register with Kernel via same-process discovery: `startWorker` calls `kernel.registerWorker()` directly with the adapter's 
public key, so no DHT topic or shared directory is needed. Runtime traffic between Kernel and each Worker still flows over HRPC. After 
`startWorker` is called for every entry, the example polls `waitForDiscovery` for up to 10 s and prints how many Workers Kernel sees.

Cleanup is centralized through `kernel._cleanup` (populated by `startGateway` and `startWorker`) and walked in reverse start order on 
`SIGINT` / `SIGTERM`, followed by `kernel.stop()`.

## Quickstart

```bash
cd examples/backend/site-single-process
cp config/mdk.config.json.example config/mdk.config.json
node index.js
```

That's it. `Ctrl+C` shuts everything down cleanly.

`npm start` also works.

### Hitting the API without a token

Set `"noAuth": true` in `mdk.config.json` to skip JWT validation on `/auth/*` routes. Then:

```bash
curl http://localhost:3000/auth/site
curl http://localhost:3000/auth/list-things
curl http://localhost:3000/auth/miners
curl http://localhost:3000/auth/permissions
```

Leave `noAuth` off (or remove it) for any deployment that's exposed beyond `localhost`.

## When to use single-process vs microservices

| Use single-process when | Use microservices ([`examples/backend/site`](../site/README.md)) when |
|---|---|
| Local development or demos | Production sites |
| Tests need a self-contained site | You need per-service restart isolation |
| Minimal-footprint embedded deployments | You're orchestrating many Workers across hosts |
| You don't need supervisor-managed restarts | A Worker crash must not take down the gateway |

## Troubleshooting

| Issue | What to check |
|-------|----------------|
| `Cannot find module './config/mdk.config.json'` | Run `cp config/mdk.config.json.example config/mdk.config.json` first |
| `ERR_KERNEL_REQUIRED: declare an "kernel" service before ...` | Move the `kernel` service entry above any `gateway`/`worker` entries in `mdk.config.json` |
| `ERR_WORKER_UNKNOWN: no manager for X:Y` | `worker:type` pair not in `WORKER_REGISTRY`. Add the entry locally or use a supported pair |
| `ERR_WORKER_PACKAGE: unknown worker package` | `worker` field doesn't map to a path in `WORKER_PACKAGES`. Add it to the local map |
| `EADDRINUSE :::3000` | Port 3000 is taken. Change `services[].port` in your config |
| `Corruption: IO error ... MANIFEST-* may be corrupted` | Stale Worker store from an abrupt kill. Delete `data/` and retry. (Clean `Ctrl+C` flushes properly — only `kill -9` should leave you in this state.) |
| `Corestore is closed` during gateway startup | A second `Corestore` was opened at a path nested under another. This example pins Kernel and gateway to disjoint roots — if you fork, keep them sibling directories |
| Native module errors | Re-run `install-packages.sh` in `backend/core` and `backend/workers` |
| Workers never register (Kernel sees 0) | Confirm the `kernel` service starts first and that each `startWorker()` call receives the live Kernel instance |

## Related packages

| Path | Purpose |
|------|---------|
| `backend/core/mdk` | `initialize()`, `startGateway()`, `startWorker()` — the programmatic APIs this example consumes |
| `backend/core/gateway` | HTTP worker spawned by `startGateway()` |
| `backend/workers/miners/*` | Miner manager implementations resolved by `resolveManagerClass()` |
