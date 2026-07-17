# Mining operations site backend example

This example demonstrates multiple configured Workers with mock devices as a microservices site.

Launch the example to boot a live site with each configured Worker as an isolated
process. Registered devices connect to mock hardware, coordinated by a Kernel and
exposed through the Gateway HTTP API. Choose PM2 (one host) or Docker (one
container per process).

```
mocks ────────────────► Each configured Worker's mock server (real wire protocols)
  ▲
  │ address:port
kernel ──discovery──► Whatsminer · Antminer · Avalon        (miners)
  │                   Antspace · Bitdeer                    (containers)
  │                   ABB · SATEC · Schneider               (power meters)
  │                   Seneca                                (sensors)
  │                   minerpool (Ocean) · F2Pool            (pools)
  ▼
gateway ──/site/overview──► HTTP clients (curl / UI)
```

Each Worker is the **real** manager class from `backend/workers/*`, pointed at that
Worker's own `mock/server.js`. The mocks speak the genuine protocols, so the real
drivers run their true connect / collect / command paths — only the endpoints are
localhost mocks instead of hardware. A Worker is tied to a mock purely by the
`address`/`port` it is registered with.

## What runs

| Process | Count | Role |
|---------|-------|------|
| `mocks` | 1 | Every mock device server (except Bitdeer's MQTT mock, co-located with its Worker) |
| `kernel` | 1 | Discovers Workers, aggregates telemetry, dispatches commands |
| Workers | 11 | One per device family (see the diagram) |
| `gateway` | 1 | HTTP API (`/site/overview`, `/site/history`, `/site/miners/:id/command`) on port `3007` |

Miners are seeded `--miners N` devices **per family** (default 100); the rest seed a
fixed small set. Pool Workers poll a mock REST API (no registered "devices").

## Layout

```
examples/site-backend/
├── mocks.js                # Port plan + startMocks()
├── backend/
│   ├── site.js             # WORKER_SPECS, device seeding, bootKernel/bootWorker
│   ├── argv.js             # argv helpers
│   └── proc/               # One entrypoint per process (prints MDK_READY when up)
│       ├── mocks.js · kernel.js · worker.js · gateway.js
├── plugins/site/           # Gateway plugin serving /site/* (aggregates via the Client)
└── deploy/
    ├── ecosystem.config.js # PM2 — apps computed from WORKER_SPECS
    ├── Dockerfile          # Self-contained image (one role per container)
    └── docker-compose.yml  # One container per process (host networking)
```

`backend/site.js`, `mocks.js`, `backend/proc/*`, and `plugins/site/*` mirror the
[full-site example](../full-site/README.md); this example adds the PM2/Docker
orchestration under `deploy/`.

## Prerequisites

- Node.js >= 24
- Install the backend + this example (from this folder):
  ```bash
  npm run setup      # installs backend/core, backend/workers, and this example
  ```
- Runtime:
  - **PM2** for the host runtime: `npm install -g pm2`, or
  - **Docker + Docker Compose** for the container runtime (see the Docker note below)
- On macOS, raise the file-descriptor limit before a large run: `ulimit -n 4096`

> [!TIP]
> Use `MDK_MINERS=3` for a fast smoke run (9 miners total) before the default 100.

## Run with PM2 (one host, multiple processes)

```bash
cd examples/site-backend
ulimit -n 4096

MDK_MINERS=3 npm run start:pm2

pm2 list           # mocks, kernel, 11 Workers, gateway
pm2 logs
```

Verify (below), then:

```bash
npm run stop:pm2
```

Ordering is automatic — no `depends_on`. PM2 `autorestart` plus file-mediated
discovery is self-healing: the gateway exits (and PM2 restarts it) until the Kernel
has published its key, and Workers publish their RPC keys to a shared dir the Kernel
watches.

## Run with Docker (one container per process)

The compose file uses **host networking** so every container shares one loopback —
the Kernel↔Worker Hyperswarm HRPC (a P2P/DHT transport) then connects directly and
fast, the same way it does under PM2. Across an isolated Docker bridge, holepunching
between containers is slow and unreliable and Worker discovery stalls. Host
networking needs **Linux**, or **Docker Desktop with host networking enabled**
(Settings → Resources → Network).

```bash
cd examples/site-backend

MDK_MINERS=3 npm run start:docker      # builds the image, then `up -d`

docker compose -f deploy/docker-compose.yml ps      # 14 services Up
docker compose -f deploy/docker-compose.yml logs -f gateway
```

The gateway serves on the host's `:3007` directly (no port mapping — host
networking). Verify (below), then:

```bash
npm run stop:docker    # docker compose down -v
```

A shared `mdk-data` volume mounted at `/data` in every container holds the Kernel
key, the local-discovery keys dir, and each service's store (only the network
namespace is shared — filesystems stay isolated).

## Verify

With the fleet up (`:3007`):

```bash
curl -s http://localhost:3007/site/overview | jq '{miners: (.miners|length), containers: (.containers|length), pools: (.pools|length), sensors: (.sensors|length)}'
```

Expected with `MDK_MINERS=3`: `miners: 9, containers: 2, pools: 2, sensors: 2`, each
miner reporting live telemetry (hashrate, power, temperature) sourced from the mocks.

## Options (env)

| Env | Default | Purpose |
|-----|---------|---------|
| `MDK_MINERS` | `100` | Miners **per family** (also sizes the mock fleet) |
| `MDK_DISCOVERY` | `local` | `local` (shared keys dir) or `dht` (Hyperswarm topic) |
| `MDK_HTTP_PORT` | `3007` | Gateway HTTP port |
| `MDK_HTTP_HOST` | `0.0.0.0` | Interface the gateway HTTP server binds |
| `DEBUG=mdk:example:*` | — | Example boot/seed logs |

## Run a single process directly

```bash
node backend/proc/mocks.js   --miners 3
node backend/proc/kernel.js  --discovery local
node backend/proc/worker.js  --worker whatsminer --miners 3 --discovery local
node backend/proc/gateway.js --port 3007
```

## Troubleshooting

| Symptom | Check |
|---------|-------|
| `EMFILE: too many open files` | `ulimit -n 4096` before starting |
| gateway keeps restarting | Expected until the Kernel is up; it converges. Check `pm2 logs kernel` / `docker compose logs kernel` |
| Docker Workers not `READY` | Ensure **host networking** is enabled (Docker Desktop → Settings → Resources → Network) |
| Docker `:3007` unreachable | Host networking publishes no ports — the gateway is on the host's `:3007` directly; check it isn't already in use |

## Next steps

- Run the [supported Worker fleet end to end](../full-site/README.md) with its mock
  device servers, Gateway HTTP API, and React dashboard in one command