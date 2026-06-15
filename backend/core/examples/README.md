# MDK Examples

All examples spin up their own mock hardware servers so nothing external needs to be running.
Run each from the repo root.

---

## End-to-end (`mdk-e2e/`)

### `run.js` — single-process automated test

Starts a WhatsMiner worker and an ORK in the same process, waits for discovery, then exercises telemetry and capability queries over IPC before exiting cleanly.

```bash
node backend/core/examples/mdk-e2e/run.js
```

Good starting point to verify the full stack works — device list, live metrics and available commands are printed then the process exits.

---

### `server.js` — single-process interactive server

Same setup as `run.js` but stays running and prints the HRPC public key and device ID with ready-to-paste `hp-rpc-cli` commands for manual inspection.

```bash
node backend/core/examples/mdk-e2e/server.js
# Ctrl+C to stop
```

---

### DHT multi-process discovery — `dht-worker.js` + `dht-ork.js` + `client.js`

Shows ORK and worker running as separate OS processes and finding each other over the DHT with no shared memory or direct wiring.

**Terminal 1 — start the worker**
```bash
node backend/core/examples/mdk-e2e/dht-worker.js
```

The worker announces itself on a freshly generated Hyperswarm topic and writes the topic hex to a file in `/tmp/mdk-dht-demo/topic`.

**Terminal 2 — start the ORK**
```bash
node backend/core/examples/mdk-e2e/dht-ork.js
```

Reads the topic file, joins the DHT as a client and waits. The worker is typically discovered within 5–10 seconds. Once ready, an IPC socket is opened and the path is printed.

**Terminal 3 — interactive client**
```bash
node backend/core/examples/mdk-e2e/client.js /tmp/mdk-dht-demo/ork.sock
```

Type `help` for available commands. Examples:

```
mdk> workers
mdk> list
mdk> metrics <deviceId>
mdk> reboot <deviceId>
mdk> setpower <deviceId> normal
```

> The worker must be started before the ORK. DHT peer discovery only works reliably when the server (worker) announces before the client (ORK) joins the topic.

---

## Full site (`mdk-site/`)

### `site.js` — 5 workers, 26 devices

Brings up a representative mining site topology: 20 miners across two containers, power meters and temperature sensors, all managed through a single ORK.

```bash
node backend/core/examples/mdk-site/site.js
# Ctrl+C to stop
```

Waits until all 26 devices appear in the registry then prints the full worker and topology summary. Takes around 45–60 seconds to reach fully ready.

```
Workers: 5 | Devices: 26
miner-wm-m56s-rack-1         READY    10 devices
miner-am-s19xp-rack-1        READY    10 devices
container-as-hk3-rack-1      READY     2 devices
powermeter-abb-b23-rack-1    READY     2 devices
sensor-temp-seneca-...-rack-1 READY    2 devices
```

---

## Single-worker examples

Each of these starts one mock hardware server, registers one device, waits for the ORK to discover it and prints the worker list. They keep running until Ctrl+C.

| Example | Worker type | Mock port |
|---|---|---|
| `miners/mdk.client.miner.js` | Whatsminer M56S | 14028 |
| `containers/mdk.client.container.js` | Antspace HK3 | 8000 |
| `powermeters/mdk.client.powermeter.js` | ABB B23 power meter | 5020 |
| `sensors/mdk.client.sensor.js` | Seneca temperature sensor | 5030 |

```bash
node backend/core/examples/miners/mdk.client.miner.js
node backend/core/examples/containers/mdk.client.container.js
node backend/core/examples/powermeters/mdk.client.powermeter.js
node backend/core/examples/sensors/mdk.client.sensor.js
```

Run at most one at a time — they each bind a fixed port. If a previous run left a process alive, the next run will fail with `EADDRINUSE`.

---

## Miner pool (`minerpools/`)

### `mdk.client.ocean.js` — Ocean pool standalone

Exercises the Ocean pool worker directly without an ORK — fetches workers, stats, transactions and blocks from a mock API and prints the results.

```bash
node backend/core/examples/minerpools/mdk.client.ocean.js
```

---

## ORK standalone (`ork/`)

### `mdk.client.ork.js` — bare ORK

Starts the ORK using the low-level `OrkManager` class directly, without `getOrk()`. Useful for seeing the raw configuration shape before any bootstrap helpers are applied.

```bash
node backend/core/examples/ork/mdk.client.ork.js
```

---

## Notes

**Store isolation** — each example writes to its own directory under the system temp folder (`/tmp/mdk-example-*`). Running two instances of the same example simultaneously will cause a hypercore file-lock error.

**Cleanup** — all long-running examples install a `SIGINT` handler (Ctrl+C) that stops the adapter, manager and ORK gracefully before exiting.

**DHT timing** — discovery over the public DHT takes a few seconds even on localhost because both sides need to bootstrap into the same DHT routing table. In single-process examples (`server.js`, single-worker examples) the worker bypasses DHT by registering directly with the ORK via its RPC key, which is faster and more reliable for co-located deployments.
