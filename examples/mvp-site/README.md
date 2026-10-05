# MDK MVP site example

A minimal, single-container mining site demo: Kernel, Gateway, Whatsminer
worker, Ocean pool worker, SATEC powermeter worker, and the MDK React UI.

## What you get

- **Kernel + Gateway** — the orchestration layer and its HTTP API, on `:3000`
- **Whatsminer worker** — mock miners, seeded from `config/devices.json`
- **Ocean pool worker** — mock pool stats on a fast demo-paced tick
- **SATEC powermeter worker** — mock power readings, scaled to the seeded miner count
- **MDK React UI** — Dashboard, Containers, Monitoring, Pools, and Control pages, served
  from the Gateway
- **One MCP surface, two tool sources** — a standalone MCP process (`--role mcp`) serves both a hand-authored tool set
  ([`backend/mcp-plugins/site`](./backend/mcp-plugins/site/)), with agent-contract metadata and curated granularity, and the
  site Gateway plugin's own HTTP routes, read off the same plugin dir the Gateway loads and converted into tools. The Gateway
  itself hosts no MCP server. Listed in [`.mcp.json.example`](./.mcp.json.example).
- **Independent processes** — every component above runs as its own PM2-supervised OS process

## Prerequisites

- Node.js >= 24
```bash
npm install -g pm2   # run once
```

## Setup

```bash
cd examples/mvp-site
npm run setup   
npm run setup:config
# installs backend/core, backend/workers, this example + its UI
```

## Start the site

```bash
npm start
```

[`start.js`](./start.js) generates a local `deploy/ecosystem.config.js` (not committed) from
[`config/site.deploy.json`](./config/site.deploy.json.example), starts the PM2 apps, then exits — PM2 itself keeps
the processes running in the background.

```bash
pm2 list      # mocks, mocks-ocean, mocks-satec, kernel, worker, worker-ocean, worker-satec, gateway, mcp
pm2 logs
```

Once `pm2 list` shows all apps `online`, open `http://localhost:3000/`.

## Stop the site

```bash
npm run stop:pm2
```

## UI pages

Dashboard, Containers (list + per-container detail), Monitoring (powermeter +
sensor charts), Pools, and Control — all served from `ui/dist` via the Gateway
at port `3000`. The Pools page shows the Ocean pool stats; the Monitoring page
charts the SATEC meter's power series.

## UI dev mode (hot reload)

```bash
npm run dev:ui
```

Starts the Vite dev server (default `http://localhost:3040`, override with
`MDK_UI_PORT`) proxying `/site/*` to the Gateway. Requires `npm start` to be
running separately so there's a Gateway to proxy to.

Rebuild the static bundle the Gateway serves with:

```bash
npm run build:ui
```

## Configure devices

### Seed devices

`config/devices.json` is gitignored (local/per-dev config). It is an object
keyed by device type — `miners` feed the Whatsminer worker, `powermeters` the
SATEC worker. Copy [`config/devices.json.example`](./config/devices.json.example) and adjust:

```json
{
  "miners": [
    {"info": { "serialNum": "WM-001", "container": "rack-1" }, "opts": { "address": "127.0.0.1", "port": null, "password": "admin" }},
    {"info": { "serialNum": "WM-002", "container": "rack-1" }, "opts": { "address": "127.0.0.1", "port": null, "password": "admin" }}
  ],
  "powermeters": [
    {"info": { "serialNum": "SATEC-001", "pos": "site" }, "opts": { "address": "127.0.0.1", "port": null, "unitId": 1 }}
  ]
}
```

Leave `opts.port` as `null` — each device is assigned its own mock port
automatically (miners from `mocks.portBase`, `14031` by default; powermeters
from `satec.mocks.portBase`, `15020` by default, in `config/site.deploy.json`).

To register **real devices**, set each entry's `opts.address`/`opts.port` to
the device's LAN address — Whatsminer API port (usually `4028`) for miners,
Modbus TCP address/port/`unitId` for SATEC PM180 meters. Keep `info.pos`
`"site"` on powermeters you want aggregated into the site power figures.

### Pool config (Ocean)

The Ocean pool is not a LAN device — its config lives in
`config/site.deploy.json` under `ocean`:

- `ocean.pool.apiUrl` — the pool REST API. Defaults to the local mock
  (`http://127.0.0.1:8010`). To go live, point it at the real Ocean API and
  remove the `mocks-ocean` role from `pm2.roles`.
- `ocean.pool.accounts` — the pool account usernames to track. Replace
  `sample-ocean-account` with your accounts to go live.
- `ocean.worker.tickMs` — demo pacer interval; stats refresh this often.

### SATEC config

`config/site.deploy.json` under `satec`:

- `satec.worker.thing` — snap collection/persist cadence (demo-fast, 5s).
- `satec.mocks.portBase` — Modbus mock ports. By default the reported power
  scales with the number of miners seeded in `config/devices.json` (split
  evenly across however many `powermeters` entries you configure); set
  `satec.mocks.powerW` to override with a fixed figure instead. Going live,
  remove the `mocks-satec` role from `pm2.roles` and point the `powermeters`
  entries in `config/devices.json` at the real meters.

## Reset state

Seed devices are only registered **once**, when a worker's store is
empty. If you change [`config/devices.json`](./config/devices.json.example) (miners or powermeters) after the
first run, clear state before restarting:

```bash
npm run stop:pm2
rm -rf .site-data
```

## Troubleshooting

### Kernel fails to start: `Invalid device file, was moved unsafely`

**Symptom**: PM2 shows `kernel` status as `errored` with:

```text
Error: Invalid device file, was moved unsafely
```

**Cause**: The `.site-data` directory contains RocksDB files with embedded path metadata from a previous location. This happens when the repo is
moved, copied, cloned to a new location, or when switching between multiple clones of the same repo.

**Fix**: Remove the persisted state directory:

```bash
npm run stop:pm2
rm -rf .site-data
```

The Kernel recreates `.site-data` with correct path metadata on next boot. All devices and history are re-seeded.

### Port conflicts

**Symptom**: A component fails to start with `EADDRINUSE`.

**Check**: Verify no other process is holding the required ports:

```bash
lsof -nP -iTCP:3000   # Gateway
lsof -nP -iTCP:8010   # Ocean mock
lsof -nP -iTCP:15020  # SATEC mock
```

Miner mock ports start at `14031`. If another example (e.g., [`examples/full-site`](../full-site/README.md)) or a previous run left processes
running, stop them first or edit [`config/site.deploy.json`](./config/site.deploy.json.example) to use different ports.

**Fix**: Stop stale PM2 processes:

```bash
npm run stop:pm2
```

### Stale PM2 processes after system crash

**Symptom**: `npm start` fails because components are already running, or ports are held.

**Check**: List PM2-managed processes:

```bash
pm2 list
```

**Fix**: Stop all PM2 apps:

```bash
npm run stop:pm2
```

If PM2 itself is unresponsive, kill all PM2 processes:

```bash
pm2 kill
```
