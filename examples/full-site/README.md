# MDK Full-Site Example

Boots a complete mining site end-to-end through the **real** MDK stack and serves
it to the MDK UI — entirely over the HRPC RPC gateway, with **no IPC anywhere**.

```
ORK ──HRPC──> App Node (mdkClient + site plugin) ──> MDK UI
 │
 ├── miner-Worker      WM_M56S      → 100 Whatsminer mocks (encrypted TCP)
 ├── container-Worker  MBT_KEHUA    → 1 MicroBT mock        (Modbus TCP)
 ├── powermeter-Worker ABB_B23      → 1 ABB mock            (Modbus TCP)
 └── minerpool-Worker  OCEAN_POOL   → 1 Ocean mock          (REST)
```

The site is **100 miners in 1 container + 1 site powermeter + 1 mining pool**.

## What makes this example "real"

It does **not** use simulated managers. It boots the actual Worker classes from
`backend/workers`, each pointed at that Worker's own **mock device server**
(`<worker>/mock/server.js`). Those mocks speak the genuine wire protocols, so the
real device drivers run their true `connectThing` / `collectThingSnap` /
command paths — only the endpoints are localhost mocks instead of hardware.

- **Live telemetry** is pulled by the site plugin via `mdkClient` (`telemetry.pull`).
- **Historical telemetry** comes from each Worker's persisted tail-log
  (`thing-5m-<id>`) for power, and the pool's `stats-history` for hashrate.
- **A live action** (`setPowerMode`) round-trips UI → App Node → ORK → miner.
- **Everything persists.** On restart the ORK keeps its key, every Worker keeps
  its RPC seed, devices are reloaded from the store (seeded exactly once), and
  tail-log history is retained. The mock devices are recreated each boot — only
  their internal state is ephemeral.

## Layout

The example is split into two layers: **`backend/`** is what it teaches — how to
drive the kit (`@tetherto/mdk` + `@tetherto/mdk-client`) — and **`cli/`** is just
the helper that runs it (a process-manager REPL). The two entrypoints, `start.js`
and `cli.js`, sit at the root.

```
examples/full-site/
├── start.js                 # entrypoint: single-process boot (ORK + Workers + App Node + UI)
├── cli.js                   # entrypoint: interactive multi-process REPL (see "Interactive CLI")
├── preflight.js             # fail-fast dependency check both entrypoints run before booting
├── backend/                 # ← the MDK-driven backend: what the example TEACHES
│   ├── site.js               #   boot primitives — bootOrk/bootWorker, Worker specs, seeding
│   ├── inspect.js            #   read site state via the MDK client (getStatus / keys)
│   ├── provision.js          #   register a device Worker-direct (sendWorkerCommand)
│   └── proc/                 #   one boot entrypoint per component: ORK · Worker · App Node · mocks · ui
├── cli/                     # ← the helper that RUNS the example (no MDK logic)
│   ├── process-manager.js    #   spawn/track/kill children, per-process logs, tail/grep
│   ├── render.js             #   format status/keys tables for the terminal
│   └── commands/             #   one handler per CLI command
├── mocks.js                 # starts the mock device servers the real Workers talk to
├── plugins/site/            # App Node plugin: aggregates the site via mdkClient
│   ├── mdk-plugin.json       #   routes: /site/overview, /site/history, command
│   ├── lib/site.js           #   loadSite() — classify Workers by deviceFamily
│   └── controllers/          #   overview.js · history.js · command.js
├── ui/                      # React + Vite UI (composes MDK devkit components only)
├── tests/unit/              # site-plugin.test.js · workers.test.js · cli.test.js
└── tests/e2e/               # site-cli.test.js (scripted live run)
```

## Prerequisites

- Node.js >= 24
- A one-time `npm run setup` (see below). The example boots the **real**
  packages from `backend/core` and `backend/workers`, and its UI imports the
  devkit packages from the repo-root `ui/` workspace — each with its own
  `node_modules`
  > As the repo is federated with no root workspaces, a plain `npm install` is not supported
- For macOS: raise the file-descriptor limit
<details>
  <summary>Raise the file-descriptor limit</summary>
  <div>

  The full 100-miner run opens roughly 300+ file descriptors simultaneously (100
  mock TCP sockets, ORK/corestore, Worker connections). macOS GUI sessions apply a
  soft limit of 256 FDs regardless of what `ulimit -n` reports in the shell.

  Before running `node start.js`, raise the limit in the same terminal session:

  ```bash
  ulimit -n 4096
  ```

  If you see `EMFILE: too many open files` without having done this, run the
  [quick smoke test](#quick-smoke-test-recommended-first-run) first (`cli.js up
  --miners 3`), then raise the limit and retry the full run.

  </div>
  </details>

## Run

```bash
cd examples/full-site
npm run setup     # first time only — installs backend/core, backend/Workers,
                  # the ui/ workspace, this example + its UI, and builds the
                  # devkit packages the UI imports
```

If anything is missing, `start.js` and `cli.js` fail fast with a message saying
exactly what to run instead of a `MODULE_NOT_FOUND` stack trace.

### Quick smoke test (recommended first run)

Before running the full 100-miner site, confirm the stack boots on your machine
with a small miner count:

```bash
node cli.js
```

```
mdk> up --miners 3 --no-ui
```

Watch for `ORK ready`, `Workers registered`, and `App-node ready` messages. Once
all services are up, type `down` then `exit`. If this completes without errors,
proceed to the full run below. If you see `EMFILE: too many open files`, see the
macOS file-descriptor note in [Prerequisites](#prerequisites).

### Full run

```bash
node start.js
```

This brings up:

- **App Node API** — `http://localhost:3007`
- **UI** — `http://localhost:3040`

Open the UI in a browser. First boot seeds the 100 miners + container +
powermeter and registers them with the ORK; the pool warms up over ~15s (the
Ocean mock client is rate-limited). Re-running `node start.js` resumes the same
site from `.mdk-data/` — no re-seeding.

### Options

| Flag / env             | Default | Purpose                              |
| ---------------------- | ------- | ------------------------------------ |
| `--no-ui`              | —       | Skip the UI (backend only)           |
| `MDK_HTTP_PORT`        | `3007`  | App Node HTTP port                   |
| `MDK_UI_PORT`          | `3040`  | UI dev-server port                   |
| `DEBUG=mdk:example:*`  | —       | example boot/seed/resume logs        |

```bash
node start.js --no-ui                 # backend only
DEBUG=mdk:example:* node start.js     # verbose boot logs
```

## Interactive CLI / process manager (`node cli.js`)

`start.js` boots everything in **one** process. `cli.js` is a long-running REPL
that runs each component as its **own OS process**, with per-process logs, live
status over HRPC, and runtime device seeding. `start.js` is unchanged — both
share the MDK boot primitives in `backend/site.js`.

```bash
cd examples/full-site
node cli.js
```

```
mdk> up --miners 3 --no-ui
mdk> status
mdk> seed miner
mdk> ps
mdk> logs ork --grep key=
mdk> down
mdk> exit
```

### Commands

| Command | Description |
| --- | --- |
| `up [--miners N] [--no-ui]` | Bring up the whole site in order (mocks → ORK → Workers → App Node → ui). `--miners` default `100`; use a small value for a fast run. |
| `start mocks\|ork\|app-node\|ui` | Start one component. |
| `start Worker <miner\|container\|powermeter\|minerpool>` | Start one Worker process (it discovers the ORK out-of-process — see below). |
| `seed miner [--container <id>] [--pos <pdu_socket>] [--port <p>]` | Register a new miner on the running miner-Worker; appears in `/site/overview` after the ORK refresh (~5s). |
| `seed container` / `seed powermeter` | Register a new container / powermeter device. |
| `status` | Query the ORK over HRPC: ORK key, each Worker, device counts, READY/health. |
| `keys` | Print the ORK public key and each Worker's RPC public key. |
| `ps` | List tracked child processes (name, pid, status, uptime, log path). |
| `logs <proc> [-f] [--grep <pat>] [--n <lines>]` | Show / follow / search one process's log. |
| `stop <proc>` | Stop one component (SIGTERM → SIGKILL). |
| `down` | Stop everything in reverse order (no orphans, ports freed). |
| `help`, `exit` | Show help / stop everything and quit. |

Commands with unmet dependencies (e.g. `start Worker miner` before the ORK is
up) fail with a clear `ERR_*` message, not a crash.

Per-process logs are written to `.mdk-data/logs/<proc>.log`.

### How out-of-process Workers find the ORK

A separately-spawned Worker has no in-process `ork` handle (the one `start.js`
uses to register Workers directly), so it discovers the ORK one of two ways,
chosen with `up --discovery <mode>` (default `local`):

- **`dht`** — Hyperswarm topic discovery. Workers announce on a shared topic and
  the ORK connects to each by the key it learns. Works whether the processes are
  on one host or spread across machines. No DHT bootstrap, no IPC.
- **`local`** — a faster same-machine option: each Worker publishes its stable
  RPC public key to `.mdk-data/.Worker-keys/` and the ORK connects to each by key
  directly, skipping the topic announce/lookup.

Either way the ORK runs the normal identity → capability → Ready flow over HRPC.

## API endpoints (served by the site plugin)

| Method | Path                                  | Description                                          |
| ------ | ------------------------------------- | ---------------------------------------------------- |
| `GET`  | `/site/overview`                      | Live snapshot: container + linked miners, site power, pool |
| `GET`  | `/site/history?metric=power`          | Site power series (powermeter tail-log)              |
| `GET`  | `/site/history?metric=hashrate`       | Pool hashrate series (pool stats-history)            |
| `POST` | `/site/miners/{deviceId}/command`     | `{ "mode": "low" \| "normal" \| "high" }` → `setPowerMode` |

```bash
curl http://localhost:3007/site/overview
curl -X POST http://localhost:3007/site/miners/miner-0/command \
  -H 'content-type: application/json' -d '{"mode":"high"}'
```

The new power mode appears on the next telemetry poll, and only the addressed
miner changes.

## Tests

```bash
cd examples/full-site
npm test                                  # unit: site-plugin mapping, real-Worker contract, CLI
npx brittle tests/e2e/site-cli.test.js    # e2e: scripted live CLI run (boots real processes)
```

## Ports used by the mock devices

Localhost only; chosen to avoid the Workers' default ports.

| Device           | Port(s)        |
| ---------------- | -------------- |
| Whatsminer ×100  | `14100`–`14199` |
| MicroBT container| `5502`         |
| ABB powermeter   | `5503`         |
| Ocean pool       | `8010`         |

## Resetting state

```bash
rm -rf examples/full-site/.mdk-data
```

Deletes the persisted ORK key, Worker RPC seeds, device registry, and tail-log
history — the next `node start.js` starts a fresh site.

## Notes

- The mock telemetry is steady-state, so the history charts render mostly flat
  lines; the live tick and the `setPowerMode` round-trip show data changing in
  real time
- The Ocean mock's earnings endpoints return empty, so pool balance / 24h
  revenue read `0`; pool hashrate and Worker count are live
- For development or resource-constrained machines, `cli.js up --miners N`
  lets you run any miner count. The full 100-miner run requires `ulimit -n 4096`
  on macOS (see [Prerequisites](#prerequisites)).
