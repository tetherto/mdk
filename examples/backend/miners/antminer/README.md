# MDK Antminer Example (single-process)

A small, self-contained **Antminer** mining site you can clone and run with **no real hardware**.
One Kernel, one HTTP gateway, and four Antminer Workers — S19 XP, S19 XP Hydro, S21, and S21 Pro —
all in a single Node.js process. Each Worker is backed by a **mock** Antminer device, so the whole
site comes up on `localhost` and is immediately curl-able.

This is the Antminer-specific counterpart of the brand-agnostic
[`examples/backend/site-single-process`](../../site-single-process/README.md). If
you're new to MDK, start there for the orchestration mechanics; this example layers the **mock
device + registration** half on top so the API actually returns miners.

## What it demonstrates

- Bringing up Kernel + gateway + N Workers in one process (single-process mode).
- Starting a **mock Antminer** per Worker and **registering** it as a thing.
- The full Antminer model family (S19XP, S19XPH, S21, S21PRO) in one site.
- Live mock telemetry pulled through the Kernel over the MDK Protocol — no hardware (see `verify.js`).

## Prerequisites

- **Node.js >= 24**
- Monorepo dependencies installed (from the repo root):

```bash
npm run setup:core      # backend/core packages
npm run setup:workers   # backend/workers packages (includes miner-antminer + its mock)
```

> Without these the example fails at startup with `Cannot find module 'debug'` (or similar). This is
> the most common first-run problem — install before anything else.

## Architecture

```mermaid
flowchart LR
  Config[mdk.config.json] --> Index[index.js]
  Index --> Init[initialize]
  Index --> Kernel[getKernel]
  Index --> Gateway[startGateway :3000]
  Index --> W1[startWorker S19XP]
  Index --> W2[startWorker S19XPH]
  Index --> W3[startWorker S21]
  Index --> W4[startWorker S21PRO]

  subgraph proc [Single Node.js process]
    Init
    Kernel
    Gateway
    W1
    W2
    W3
    W4
    M1[mock :14021]
    M2[mock :14022]
    M3[mock :14023]
    M4[mock :14024]
  end

  Gateway <-->|MDK Protocol over HRPC| Kernel
  Kernel <-->|MDK Protocol over Hyperswarm DHT| W1
  Kernel <-->|MDK Protocol over Hyperswarm DHT| W2
  Kernel <-->|MDK Protocol over Hyperswarm DHT| W3
  Kernel <-->|MDK Protocol over Hyperswarm DHT| W4
  W1 <-->|HTTP digest loopback| M1
  W2 <-->|HTTP digest loopback| M2
  W3 <-->|HTTP digest loopback| M3
  W4 <-->|HTTP digest loopback| M4
```

The mocks are the only addition over `site-single-process`: each Worker polls its mock over
Bitmain's HTTP digest API on loopback, exactly as it would poll a real Antminer.

## The four Antminer models

| Service | `type` | Mock `type` | Mock port | Auth |
|---|---|---|---|---|
| `am-s19xp`   | `S19XP`   | `s19xp`   | 14021 | digest `root` / `root` |
| `am-s19xph`  | `S19XPH`  | `s19xp_h` | 14022 | digest `root` / `root` |
| `am-s21`     | `S21`     | `s21`     | 14023 | digest `root` / `root` |
| `am-s21pro`  | `S21PRO`  | `s21pro`  | 14024 | digest `root` / `root` |

> Note the `S19XPH` → `s19xp_h` mapping: the registry/manager key is `S19XPH` but the mock and its
> initial-state files use the underscored `s19xp_h`. `index.js` translates this via `ANTMINER_MOCK_TYPE`.

## Quickstart

Clone-and-run — no config copy needed (the example falls back to
`config/mdk.config.json.example`):

```bash
node examples/backend/miners/antminer/index.js     # from the repo root
# or: cd examples/backend/miners/antminer && npm start
```

To customise (ports, models, serials), copy the example and edit your own copy — it takes
precedence over the `.example`:

```bash
cd examples/backend/miners/antminer
cp config/mdk.config.json.example config/mdk.config.json
```

After ~40s (each Worker joins the DHT in turn) you'll see `Kernel sees 4 Worker(s)` and the registered
devices with their mock ports. `Ctrl+C` shuts everything down cleanly (mocks, Workers, gateway, Kernel).

## Verifying it works (MDK Protocol over HRPC)

The reliable, integrated way to confirm the site is live is `verify.js`. With the example running
in one terminal, run it in another:

```bash
node verify.js        # or: npm run verify
```

It reads the Kernel key file the example publishes (`$TMPDIR/mdk-site-antminer/kernel/.kernel-key`), connects over HRPC
speaking the MDK Protocol and, for each of the four Antminer
Workers, prints the discovered device plus its capabilities and **live mock telemetry**:

```
Kernel sees 4 Worker(s):

  AntminerManagerS19xp-rack-s19xp  state=READY health=HEALTHY devices=1
    └─ 3a3eb06e-...  capabilities: 9 telemetry, 11 commands
         status=mining hashrate_mhs.avg=292859395760 pools=3
  ... (S19XPH, S21, S21PRO) ...

OK — Antminer site is live and serving telemetry over the MDK Protocol.
```

## Hitting the HTTP API with curl

The config ships `"noAuth": true` to make `/auth/*` curl-able without a JWT
(**dev only; never enable beyond localhost**). What works today:

```bash
curl http://localhost:3000/auth/site          # ✅ {"site":"SITE_NAME"}
```

> **Heads-up — the device data routes are not wired up yet.** `/auth/list-things`, `/auth/miners`
> and `/auth/permissions` do **not** return data in this build:
>
> - The gateway's data proxy still calls legacy per-method Kernel RPCs (`listThings`, `listRacks`,
>   …), but the MDK Kernel exposes a single MDK-Protocol `mdk` method dispatched by action
>   (`worker.list`, `telemetry.pull`, …) — so those calls return `UNKNOWN_METHOD`.
> - In `noAuth` mode the gateway skips building `authLib`, so the permission-gated routes throw.
>
> Both are **gateway ↔ Kernel integration work tracked under the parent task "MDK integration of
> Workers"** — out of scope for this sample. Until that lands, use `verify.js` above to exercise
> the live devices over the MDK Protocol. This example will gain working `/auth/miners` curls for
> free once the parent integration is merged.

## Configuration reference

`config/mdk.config.json` (copied from the `.example`):

| Field | Description |
|---|---|
| `mode` | Must be `"single-process"`. |
| `env` | `"development"` or `"production"` (default `development`). |
| `noAuth` | `true` disables JWT auth on `/auth/*`. Dev only. |
| `services[]` | Ordered list — `kernel` **must come first**, then `gateway`, then Workers. |

Each Worker entry:

| Field | Description |
|---|---|
| `worker` | `"miner-antminer"` — maps to `backend/workers/miners/antminer` via `WORKER_PACKAGES`. |
| `type` | One of `S19XP`, `S19XPH`, `S21`, `S21PRO` — maps to a manager class via `WORKER_REGISTRY`. |
| `rack` | Rack id; also the per-Worker data dir under `data/`. |
| `mock` | Mock + registration parameters (below). |

The `mock` block:

| Field | Used for |
|---|---|
| `port` | Mock HTTP port; also the device's registered `port`. |
| `serialNum` | Mock serial **and** the registered `info.serialNum`. |
| `container`, `pos` | Registration `info` metadata. |
| `username`, `password` | Digest credentials, shared by mock and registration (default `root`/`root`). |

**Adding a model:** add a `WORKER_REGISTRY` entry (`miner-antminer:<TYPE>` → manager export), an
`ANTMINER_MOCK_TYPE` entry, and a Worker service block with a unique `port`, `serialNum` and `rack`.

## How mocks + registration work

For each `worker` service, `index.js`:

1. `resolveManagerClass(worker, type)` → loads the manager from `backend/workers/miners/antminer`.
2. `startWorker(ManagerClass, { kernel, rack, ... })` → boots the Worker and joins the Kernel's DHT topic.
3. `startMock(svc)` → binds the Antminer mock on `mock.port` (kept in `mockHandles` for cleanup).
4. `manager.registerThing({ info, opts })` → registers the mock as a device on that Worker.

One device per Worker keeps every mock on `127.0.0.1` without tripping the duplicate-IP guard in
`MinerManager` (validation is per-manager, so distinct Workers may reuse the loopback address).

## Directory layout

### Committed (source)

```
examples/backend/miners/antminer/
├── README.md
├── package.json
├── index.js                      # orchestration: Kernel + gateway + Workers + mocks + registration
├── verify.js                     # functional check over the MDK Protocol (HRPC)
├── config/
│   └── mdk.config.json.example
└── .gitignore
```

### Generated (ignored)

```
examples/backend/miners/antminer/
├── config/mdk.config.json        # your copy of the .example (optional — falls back to .example)
└── data/rack-<name>/             # per-Worker store

$TMPDIR/mdk-site-antminer/
├── kernel/                          # Kernel Corestore + .kernel-key
└── gateway/                     # gateway config/store
```

Kernel and gateway are pinned to **sibling** dirs under `$TMPDIR/mdk-site-antminer/` — Hypercore
storage can't tolerate one Corestore nested under another in the same process.

## Troubleshooting

| Issue | Fix |
|---|---|
| `Cannot find module 'debug'` (or similar) | Run `npm run setup:core` and `npm run setup:workers` from the repo root. |
| `Cannot find module './config/mdk.config.json'` | `cp config/mdk.config.json.example config/mdk.config.json` first. |
| `ERR_KERNEL_REQUIRED` | Keep the `kernel` service entry above `gateway`/Workers in the config. |
| `ERR_WORKER_UNKNOWN: no manager for X:Y` | `worker:type` not in `WORKER_REGISTRY`. Use a supported pair or add it. |
| `ERR_UNSUPPORTED` from the mock | `type` isn't one of `s19xp`/`s19xp_h`/`s21`/`s21pro`. Check `ANTMINER_MOCK_TYPE`. |
| `EADDRINUSE :::3000` or `:::1402x` | A previous run is still bound. `Ctrl+C` it, or kill the process holding the port. |
| `ERR_THING_SERIALNUM_EXISTS` | Two services share a `serialNum`. Make them unique. |
| `Corruption: ... MANIFEST-* may be corrupted` | Stale store from a `kill -9`. Delete `data/` and `$TMPDIR/mdk-site-antminer/` and retry. |

## Related

| Path | Purpose |
|---|---|
| [`backend/core/mdk`](../../../../backend/core/mdk/index.js) | `initialize()`, `getKernel()`, `startGateway()`, `startWorker()`. |
| [`backend/workers/miners/antminer`](../../../../backend/workers/miners/antminer/README.md) | Antminer managers, mock server, `mdk-contract.json`, `USAGE.md`. |
| [`examples/backend/site-single-process`](../../site-single-process/README.md) | Brand-agnostic single-process site this example builds on. |
