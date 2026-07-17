# MDK Examples

All examples spin up their own mock hardware servers so nothing external needs to be running.
Run each from the repo root.

---

## End-to-end (`mdk-e2e/`)

### `run.js` — single-process automated test

Starts a WhatsMiner Worker and an Kernel in the same process, waits for discovery, then exercises telemetry and capability queries over HRPC (using the in-process `kernel.getPublicKey()`) before exiting cleanly.

```bash
node examples/backend/mdk-e2e/run.js
```

Good starting point to verify the full stack works — device list, live metrics and available commands are printed then the process exits.

---

### `server.js` — single-process interactive server

Same setup as `run.js` but stays running and prints the HRPC public key and device ID with ready-to-paste `hp-rpc-cli` commands for manual inspection.

```bash
node examples/backend/mdk-e2e/server.js
# Ctrl+C to stop
```

---

### DHT multi-process discovery — `dht-worker.js` + `dht-kernel.js` + `client.js`

Shows Kernel and Worker running as separate OS processes and finding each other over the DHT with no shared memory or direct wiring.

**Terminal 1 — start the Worker**
```bash
node examples/backend/mdk-e2e/dht-worker.js
```

The Worker announces itself on a freshly generated Hyperswarm topic and writes the topic hex to a file in `/tmp/mdk-dht-demo/topic`.

**Terminal 2 — start the Kernel**
```bash
node examples/backend/mdk-e2e/dht-kernel.js
```

Reads the topic file, joins the DHT as a client and waits. The Worker is typically discovered within 5–10 seconds. Once ready, the Kernel's HRPC public key is printed and published to the well-known key file (`$TMPDIR/mdk/.kernel-key`).

**Terminal 3 — interactive client**
```bash
node examples/backend/mdk-e2e/client.js          # reads the key file automatically
# or pass a key explicitly:
node examples/backend/mdk-e2e/client.js <kernel-hrpc-key-hex>
```

Type `help` for available commands. Examples:

```
mdk> workers
mdk> list
mdk> metrics <deviceId>
mdk> reboot <deviceId>
mdk> setpower <deviceId> normal
```

> The Worker must be started before the Kernel. DHT peer discovery only works reliably when the server (Worker) announces before the client (Kernel) joins the topic.

---

## Full site (`mdk-site/`)

### `site.js` — 5 Workers, 26 devices

Brings up a representative mining site topology: 20 miners across two containers, power meters and temperature sensors, all managed through a single Kernel.

```bash
node examples/backend/mdk-site/site.js
# Ctrl+C to stop
```

Waits until all 26 devices appear in the registry then prints the full Worker and topology summary. Takes around 45–60 seconds to reach fully ready.

```
Workers: 5 | Devices: 26
miner-wm-m56s-rack-1         READY    10 devices
miner-am-s19xp-rack-1        READY    10 devices
container-as-hk3-rack-1      READY     2 devices
powermeter-abb-b23-rack-1    READY     2 devices
sensor-temp-seneca-...-rack-1 READY    2 devices
```

---

## Antminer site (`miners/antminer/`)

### `index.js` — Kernel + gateway + 4 Antminer Workers

A config-driven, single-process **Antminer** site: one Kernel, one HTTP gateway, and four Antminer
Workers (S19XP, S19XP Hydro, S21, S21 Pro), each backed by a mock device and registered as a thing.
Runs clone-and-run (falls back to the bundled config). `verify.js` exercises the live devices over
the MDK Protocol; see [`miners/antminer/README.md`](miners/antminer/README.md) for the curl/HTTP status.

```bash
node examples/backend/miners/antminer/index.js     # Ctrl+C to stop
node examples/backend/miners/antminer/verify.js    # in a second terminal
```

---

## Bitdeer container (`containers/bitdeer/`)

### `index.js` — Kernel + Bitdeer D40 container Worker (MQTT)

A clone-and-run **Bitdeer D40** container example: Kernel + one Bitdeer Worker, with a mock MQTT client
publishing container telemetry to the Worker's embedded broker, registered as a thing. It prints a
ready-to-paste `hp-rpc-cli` command to pull live telemetry over HRPC. Self-contained — see
[`containers/bitdeer/README.md`](containers/bitdeer/README.md).

```bash
node examples/backend/containers/bitdeer/index.js     # Ctrl+C to stop; prints an hp-rpc-cli command
```

---

## Sensor (`sensors/seneca/`)

### `index.js` — Seneca temperature sensor example (project)

A clone-and-run **Seneca** sensor example: Kernel + one Seneca Worker backed by a mock Modbus sensor,
registered as a thing. It prints a ready-to-paste `hp-rpc-cli` command to pull live telemetry over
HRPC. Self-contained — see [`sensors/seneca/README.md`](sensors/seneca/README.md).

```bash
node examples/backend/sensors/seneca/index.js     # Ctrl+C to stop; prints an hp-rpc-cli command
```

---

## Power meter examples (`powermeters/{abb,satec,schneider}/`)

Clone-and-run power-meter examples — each brings up an Kernel + one Worker backed by a mock Modbus
meter, registered as a thing, and prints a ready-to-paste `hp-rpc-cli` command to pull live telemetry
over HRPC. Self-contained.

| Example | Worker | Mock port | README |
|---|---|---|---|
| `powermeters/abb/` | ABB B23 | 5060 | [README](powermeters/abb/README.md) |
| `powermeters/satec/` | Satec PM180 | 5061 | [README](powermeters/satec/README.md) |
| `powermeters/schneider/` | Schneider PM5340 | 5062 | [README](powermeters/schneider/README.md) |

```bash
node examples/backend/powermeters/abb/index.js         # Ctrl+C to stop; prints an hp-rpc-cli command
node examples/backend/powermeters/satec/index.js
node examples/backend/powermeters/schneider/index.js
```

---

## Single-Worker examples

Each of these starts one mock hardware server, registers one device, waits for the Kernel to discover it and prints the Worker list. They keep running until Ctrl+C.

| Example | Worker type | Mock port |
|---|---|---|
| `miners/mdk.client.miner.js` | Whatsminer M56S | 14028 |
| `containers/mdk.client.container.js` | Antspace HK3 | 8000 |
| `powermeters/mdk.client.powermeter.js` | ABB B23 power meter | 5020 |
| `sensors/mdk.client.sensor.js` | Seneca temperature sensor | 5030 |

```bash
node examples/backend/miners/mdk.client.miner.js
node examples/backend/containers/mdk.client.container.js
node examples/backend/powermeters/mdk.client.powermeter.js
node examples/backend/sensors/mdk.client.sensor.js
```

Run at most one at a time — they each bind a fixed port. If a previous run left a process alive, the next run will fail with `EADDRINUSE`.

---

## Miner pool (`minerpools/`)

### `ocean/` — Ocean minerpool example (project)

A clone-and-run **Ocean** minerpool example backed by a mock Ocean.xyz API: it drives the
`OCEAN_POOL` Worker directly (stats, per-worker hashrate, transactions, blocks) and stays running so
`verify.js` can re-query it. Minerpools aren't wired into the Kernel/MDK thing model yet, so this runs
**standalone** (no Kernel/gateway) — see [`minerpools/ocean/README.md`](minerpools/ocean/README.md).

```bash
node examples/backend/minerpools/ocean/index.js     # Ctrl+C to stop
node examples/backend/minerpools/ocean/verify.js    # in a second terminal
```

### `mdk.client.ocean.js` — Ocean pool standalone (single file)

The minimal version of the above: fetches Workers, stats, transactions and blocks from the mock API,
prints them, and exits.

```bash
node examples/backend/minerpools/mdk.client.ocean.js
```

### `f2pool/` — F2Pool minerpool example (project)

A clone-and-run **F2Pool** example backed by a mock F2Pool API: it drives the `F2_POOL` Worker
directly (stats, Workers, transactions), prints a snapshot, and exits. Standalone like Ocean —
see [`minerpools/f2pool/README.md`](minerpools/f2pool/README.md).

```bash
node examples/backend/minerpools/f2pool/index.js
```

---

## Kernel standalone (`kernel/`)

### `kernel-shell.js` — bare Kernel

Starts the Kernel using the low-level `createKernel()` directly, without `getKernel()`. Useful for seeing the raw configuration shape before any bootstrap helpers are applied.

```bash
node examples/backend/kernel/kernel-shell.js
```

---

## Notes

**Store isolation** — each example writes to its own directory under the system temp folder (`/tmp/mdk-example-*`). Running two instances of the same example simultaneously will cause a hypercore file-lock error.

**Cleanup** — all long-running examples install a `SIGINT` handler (Ctrl+C) that stops the adapter, manager and Kernel gracefully before exiting.

**DHT timing** — discovery over the public DHT takes a few seconds even on localhost because both sides need to bootstrap into the same DHT routing table. In single-process examples (`server.js`, single-Worker examples) the Worker bypasses DHT by registering directly with the Kernel via its RPC key, which is faster and more reliable for co-located deployments.
