# MDK full-site example

Boots a complete mining site end-to-end through the MDK stack and serves
it to the MDK UI — entirely over the HRPC RPC listener.

```
Kernel ──HRPC──> Gateway (mdkClient + site plugin) ──> MDK UI
 │
 ├── whatsminer-worker  startWhatsminerWorker  → N Whatsminer mocks     (container-antspace / Antspace HK3)
 ├── antminer-worker    startAntminerWorker    → N Antminer mocks       (container-antspace / Antspace HK3)
 ├── avalon-worker      startAvalonWorker      → N Avalon mocks         (container-bitdeer / Bitdeer D40-A1346)
 ├── antspace-worker    startAntspaceWorker    → 1 Antspace mock        (HTTP)
 ├── bitdeer-worker     startBitdeerWorker     → 1 Bitdeer mock         (MQTT client → worker broker)
 ├── powermeter-worker  startAbbWorker         → 1 ABB mock             (Modbus TCP)
 ├── satec-powermeter-worker startSatecWorker      → 1 SATEC mock           (Modbus TCP)
 ├── schneider-powermeter-worker startSchneiderWorker → 1 Schneider mock (Modbus TCP)
 ├── seneca-sensor-worker startSenecaWorker       → 2 Seneca mocks         (Modbus TCP, 1 per container)
 ├── minerpool-worker   startOceanPoolWorker   → 1 Ocean mock           (REST)
 └── f2pool-worker      startF2poolWorker      → 1 F2Pool mock          (REST)
```

The site is **3N miners in 2 containers + 3 site powermeters (ABB + SATEC + Schneider) + 2 inlet temperature sensors (Seneca) + 2 mining pools 
(Ocean + F2Pool)** (default N=10 → 30 miners).

## What makes this example "real"

It does **not** use simulated managers. It boots the actual Worker Plugins from
`backend/workers`, each pointed at that Worker's own **mock device server**
(`<worker>/mock/server.js`). Those mocks speak the genuine wire protocols, so the
real device drivers run their true `connect()` and per-field telemetry/command
handler paths — only the endpoints are localhost mocks instead of hardware.

- **Live telemetry** is pulled by the site plugin via `mdkClient` (`telemetry.pull`)
- **Historical telemetry** comes from each Worker's persisted tail-log
  (`thing-5m-<id>`) for power and temperature, and the pools' `stats-history` for hashrate
- **A live action** (`setPowerMode`) round-trips UI → Gateway → Kernel → miner
- **Everything persists.** On restart the Kernel keeps its key, every Worker keeps
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
├── start.js                 # entrypoint: single-process boot (Kernel + Workers + Gateway + UI)
├── cli.js                   # entrypoint: interactive multi-process REPL (see "Interactive CLI")
├── preflight.js             # fail-fast dependency check both entrypoints run before booting
├── backend/                 # ← the MDK-driven backend: what the example TEACHES
│   ├── site.js               #   boot primitives — bootKernel/bootWorker, Worker specs, seeding
│   ├── inspect.js            #   read site state via the Client (getStatus / keys)
│   ├── provision.js          #   register a device Worker-direct (sendWorkerCommand)
│   └── proc/                 #   one boot entrypoint per component: Kernel · Worker · Gateway · mocks · ui · mcp-server
├── cli/                     # ← the helper that RUNS the example (no MDK logic)
│   ├── process-manager.js    #   spawn/track/kill children, per-process logs, tail/grep
│   ├── render.js             #   format status/keys tables for the terminal
│   └── commands/             #   one handler per CLI command
├── mocks.js                 # starts the mock device servers the real Workers talk to
├── plugins/site/            # Gateway plugin: aggregates the site via mdkClient
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

## Run

```bash
cd examples/full-site
npm run setup     # first time only — installs backend/core, backend/workers,
                  # the ui/ workspace, this example + its UI, and builds the
                  # devkit packages the UI imports
```

If anything is missing, `start.js` and `cli.js` fail fast with a message saying
exactly what to run instead of a `MODULE_NOT_FOUND` stack trace.

### Quick smoke test (recommended first run)

Before running the full site, confirm the stack boots on your machine
with a small miner count:

```bash
node cli.js
```

```
mdk> up --miners 3 --no-ui
```

Watch for `Kernel ready`, `Workers registered`, and `Gateway ready` messages. Once
all services are up, type `down` then `exit`. If this completes without errors,
proceed to the full run below. If you see `EMFILE: too many open files`, raise the
file-descriptor limit — see [Next steps](#next-steps).

### Full run

```bash
node start.js
```

This brings up:

- **Gateway API** — `http://localhost:3007`
- **UI** — `http://localhost:3040`

Open the UI in a browser. First boot seeds 3N miners, 2 containers, 3 site
powermeters, 2 inlet temperature sensors, and 2 mining pools, then registers
them with the Kernel. The pools warm up after about 15 seconds because the Ocean
mock client is rate-limited. Re-running `node start.js` resumes the same
site from `.mdk-data/` — no re-seeding. **Upgrading from an older single-container
site requires `rm -rf .mdk-data` once** (new Worker IDs and container names).

### Options

| Flag / env             | Default | Purpose                              |
| ---------------------- | ------- | ------------------------------------ |
| `--miners N`           | `10`    | Miners **per family** (Whatsminer + Antminer + Avalon → 3N total) |
| `--no-ui`              | —       | Skip the UI (backend only)           |
| `MDK_HTTP_PORT`        | `3007`  | Gateway HTTP port                   |
| `MDK_UI_PORT`          | `3040`  | UI dev-server port                   |
| `DEBUG=mdk:example:*`  | —       | example boot/seed/resume logs        |

```bash
node start.js --miners 3 --no-ui      # smoke test: small fleet, no UI
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
mdk> seed whatsminer
mdk> ps
mdk> logs kernel --grep key=
mdk> down
mdk> exit
```

### Commands

| Command | Description |
| --- | --- |
| `up [--miners N] [--no-ui]` | Bring up the whole site (mocks → Kernel → 11 Workers → Gateway → UI). `--miners` is per family (default 10 → 30 total). |
| `start mocks\|kernel\|gateway\|ui\|mcp-server` | Start one component. See also [MCP server][mcp-server-docs]. |
| `start worker <whatsminer\|antminer\|avalon\|antspace\|bitdeer\|abb\|satec\|schneider\|seneca\|minerpool\|f2pool>` | Start one Worker process (discovers the Kernel out-of-process — see below). |
| `seed whatsminer\|antminer\|avalon [--container <id>] [--pos <pdu_socket>] [--port <p>]` | Register a new miner on the matching Worker. |
| `seed antspace\|bitdeer\|abb\|satec\|schneider\|seneca [--container <id>] [--port <p>]` | Register a new container, powermeter, or temperature sensor. |
| `status` | Query the Kernel over HRPC: Kernel key, each Worker, device counts, READY/health. |
| `keys` | Print the Kernel public key and each Worker's RPC public key. |
| `ps` | List tracked child processes (name, pid, status, uptime, log path). |
| `logs <proc> [-f] [--grep <pat>] [--n <lines>]` | Show / follow / search one process's log. |
| `stop <proc>` | Stop one component (SIGTERM → SIGKILL). |
| `down` | Stop everything in reverse order (no orphans, ports freed). |
| `help`, `exit` | Show help / stop everything and quit. |

Commands with unmet dependencies (e.g. `start worker whatsminer` before the Kernel is
up) fail with a clear `ERR_*` message, not a crash.

Per-process logs are written to `.mdk-data/logs/<proc>.log`.

### How out-of-process Workers find the Kernel

A separately-spawned Worker has no in-process `kernel` handle (the one `start.js`
uses to register Workers directly), so it discovers the Kernel one of two ways,
chosen with `up --discovery <mode>` (default `local`):

- **`dht`** — Hyperswarm topic discovery. Workers announce on a shared topic and
  the Kernel connects to each by the key it learns. Works whether the processes are
  on one host or spread across machines. No custom DHT bootstrap needed.
- **`local`** — a faster same-machine option: each Worker publishes its stable
  RPC public key to `.mdk-data/.Worker-keys/` and the Kernel connects to each by key
  directly, skipping the topic announce/lookup.

Either way the Kernel runs the normal identity → capability → Ready flow over HRPC.

## Plugin

The site plugin at `plugins/site/` is a worked example of the Gateway plugin format: a three-route `mdk-plugin.json` with controllers for live data, 
historical series, and a command endpoint. See the [plugin authoring guide][plugin-authoring-guide] for the full manifest and 
controller contract.

## API endpoints (served by the site plugin)

| Method | Path                                  | Description                                          |
| ------ | ------------------------------------- | ---------------------------------------------------- |
| `GET`  | `/site/overview`                      | Live snapshot: containers + linked miners, site power, sensors, pools |
| `GET`  | `/site/history?metric=power`          | Site power series (powermeter tail-log)              |
| `GET`  | `/site/history?metric=temperature`    | Inlet temperature series (Seneca sensor tail-log)    |
| `GET`  | `/site/history?metric=hashrate`       | Pool hashrate series (pool stats-history)            |
| `POST` | `/site/miners/{deviceId}/command`     | `{ "mode": "low" \| "normal" \| "high" }` → `setPowerMode` |

```bash
curl http://localhost:3007/site/overview
curl -X POST http://localhost:3007/site/miners/whatsminer-0/command \
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

| Device | Port(s) |
| ------ | ------- |
| Whatsminer ×N | `14100`–`14199` |
| Antminer ×N | `14200`–`14299` |
| Avalon ×N | `14300`–`14399` |
| Antspace HK3 | `5504` |
| Bitdeer D40-A1346 (MQTT) | `10883` (broker in Worker; mock is MQTT client) |
| ABB powermeter | `5503` |
| SATEC powermeter | `5505` |
| Schneider powermeter | `5506` |
| Seneca sensor ×2 | `5510`–`5511` |
| Ocean pool | `8010` |
| F2Pool | `8011` |

## Resetting state

```bash
rm -rf examples/full-site/.mdk-data
```

Deletes the persisted Kernel key, Worker RPC seeds, device registry, and tail-log
history — the next `node start.js` starts a fresh site.

## Notes

- The mock telemetry is steady-state, so the history charts render mostly flat
  lines; the live tick and the `setPowerMode` round-trip show data changing in
  real time
- The Ocean mock's earnings endpoints return empty, so pool balance / 24h
  revenue read `0`; pool hashrate and Worker count are live
- The Bitdeer container mock starts **after** the bitdeer Worker (MQTT broker must
  be up first). In `start.js` this is handled automatically via `afterBoot`.

## Next steps

- **Scale the fleet.** The default run is 10 miners per family (30 total), sized to
  start fast and stay within the standard file-descriptor limit. To run a larger
  site, pass `--miners N` for `N` miners per family (`3N` total) — e.g.
  `node start.js --miners 100` boots a 300-miner site. Large fleets are supported;
  on macOS raise the file-descriptor limit first (see below).

<details>
  <summary>Running large fleets on macOS: raise the file-descriptor limit</summary>
  <div>

  Large fleets open many sockets at once: `--miners 100` (300 miners) uses roughly
  900+ file descriptors simultaneously (300 mock TCP/HTTP sockets, Kernel/corestore,
  Worker connections), and macOS GUI sessions apply a soft limit of 256 FDs
  regardless of what `ulimit -n` reports in the shell.

  Before running a large fleet, raise the limit in the same terminal session:

  ```bash
  ulimit -n 4096
  ```

  If you see `EMFILE: too many open files`, raise the limit as above and retry. The
  default run (30 miners) stays within the standard limit and needs no change.

  </div>
</details>

## MCP server

The example ships an optional MCP server component that connects directly to the Kernel
over HRPC and exposes the site's device registry, telemetry, and command dispatch as MCP
tools for AI agents. See [`docs/mcp-server.md`][mcp-server-docs] for setup, tools, and
usage with Claude Desktop or the MCP SDK.

## Links

[mcp-server-docs]: docs/mcp-server.md
[plugin-authoring-guide]: ../../docs/guides/gateway/plugins.md
