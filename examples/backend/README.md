# MDK Examples

All examples spin up their own mock hardware servers so nothing external needs to be running.
Run each from the repo root.

## Whole-site examples

These three build a complete site rather than exercising one piece. Each has its own README with
setup and configuration detail.

| Example | What it is | Start |
|---|---|---|
| [`full-site/`][full-site] | Kernel, 11 Workers across every supported device family, a Gateway site plugin, a React dashboard, and an MCP server. Boots in one process, or as supervised processes through an interactive REPL | `cd examples/full-site && npm run setup && node start.js --miners 3` |
| [`mvp-site/`][mvp-site] | A single-container site under PM2 supervision: Whatsminer, Ocean pool, and SATEC power meter Workers, with the Gateway serving the built UI | `cd examples/mvp-site && npm run setup && npm start` |
| [`mdk-ui-shell-template/`][ui-shell] | A bare application shell to copy as the starting point for your own app, with pages added from the command line via `mdk-ui add page` | Follow the [shell template README][ui-shell] |

The [run a mining site tutorial][run-a-site] walks `full-site` end to end.

[full-site]: ../full-site/README.md

[mvp-site]: ../mvp-site/README.md

[ui-shell]: ../mdk-ui-shell-template/README.md

[run-a-site]: ../../docs/tutorials/run-a-site.md

## Plugin-authoring end-to-end ([`mdk-plugin-e2e/`](./mdk-plugin-e2e/))

### [`run.js`](./mdk-plugin-e2e/run.js) — WorkerRuntime + worker plugin + gateway plugin

Single-process, automated example showing how to author a Worker as a plugin ([`mdk-plugin-e2e/worker-plugin/`](./mdk-plugin-e2e/worker-plugin/index.js)) hosted on `WorkerRuntime`, backed by mock devices ([`mdk-plugin-e2e/mock-device/`](./mdk-plugin-e2e/mock-device/)), with a Kernel gateway plugin ([`mdk-plugin-e2e/gateway-plugin/`](./mdk-plugin-e2e/gateway-plugin/)) that serves a fleet-summary endpoint over DHT/HRPC. Exercises telemetry and command flows end-to-end, then exits cleanly.

```bash
node examples/backend/mdk-plugin-e2e/run.js
```

## Demo worker ([`demo-worker-caller/`](./demo-worker-caller/index.js))

### [`index.js`](./demo-worker-caller/index.js) — hosting a bare Worker Plugin on `WorkerRuntime`

Shows the "caller" side of authoring a Worker: the `demo-worker` package ships only a Worker Plugin (`{ contract, dir, connect }`) and its own SQLite helper, never touching `WorkerRuntime` directly. This example constructs `WorkerRuntime`, owns its lifecycle, seeds two mock devices, and runs a telemetry sampler loop against the live runtime, printing live metrics on an interval.

```bash
node examples/backend/demo-worker-caller/index.js     # Ctrl+C to stop
```

## Antminer site ([`miners/antminer/`](./miners/antminer/README.md))

### [`index.js`](./miners/antminer/index.js) — Kernel + gateway + 4 Antminer Workers

A config-driven, single-process **Antminer** site: one Kernel, one HTTP gateway, and four Antminer
Workers (S19XP, S19XP Hydro, S21, S21 Pro), each backed by a mock device and registered as a thing.
Runs clone-and-run (falls back to the bundled config). [`verify.js`](./miners/antminer/verify.js) exercises the live devices over
the MDK Protocol; the [Antminer example README][antminer-readme] carries the curl/HTTP status.

```bash
node examples/backend/miners/antminer/index.js     # Ctrl+C to stop
node examples/backend/miners/antminer/verify.js    # in a second terminal
```

## Bitdeer container ([`containers/bitdeer/`](./containers/bitdeer/README.md))

### [`index.js`](./containers/bitdeer/index.js) — Kernel + Bitdeer D40 container Worker (MQTT)

A clone-and-run **Bitdeer D40** container example: Kernel + one Bitdeer Worker, with a mock MQTT client
publishing container telemetry to the Worker's embedded broker, registered as a thing. It prints a
ready-to-paste `hp-rpc-cli` command to pull live telemetry over HRPC. Self-contained — see
the [Bitdeer example README][bitdeer-readme].

```bash
node examples/backend/containers/bitdeer/index.js     # Ctrl+C to stop; prints an hp-rpc-cli command
```

## Sensor ([`sensors/seneca/`](./sensors/seneca/README.md))

### [`index.js`](./sensors/seneca/index.js) — Seneca temperature sensor example (project)

A clone-and-run **Seneca** sensor example: Kernel + one Seneca Worker backed by a mock Modbus sensor,
registered as a thing. It prints a ready-to-paste `hp-rpc-cli` command to pull live telemetry over
HRPC. Self-contained: the [Seneca example README][seneca-readme] has the detail.

```bash
node examples/backend/sensors/seneca/index.js     # Ctrl+C to stop; prints an hp-rpc-cli command
```

## Power meter examples

Clone-and-run power-meter examples — each brings up a Kernel + one Worker backed by a mock Modbus
meter, registered as a thing, and prints a ready-to-paste `hp-rpc-cli` command to pull live telemetry
over HRPC. Self-contained.

| Example | Worker | Mock port | README |
|---|---|---|---|
| [`powermeters/abb/`](./powermeters/abb/README.md) | ABB B23 | 5060 | [README][abb-readme] |
| [`powermeters/satec/`](./powermeters/satec/README.md) | Satec PM180 | 5061 | [README][satec-readme] |
| [`powermeters/schneider/`](./powermeters/schneider/README.md) | Schneider PM5340 | 5062 | [README][schneider-readme] |

```bash
node examples/backend/powermeters/abb/index.js         # Ctrl+C to stop; prints an hp-rpc-cli command
node examples/backend/powermeters/satec/index.js
node examples/backend/powermeters/schneider/index.js
```

## Single-Worker examples

Each of these starts one mock hardware server, registers one device, waits for the Kernel to discover it and prints the Worker list. They keep running until Ctrl+C.

| Example | Worker type | Mock port |
|---|---|---|
| [`containers/antspace/index.js`](./containers/antspace/index.js) | Antspace HK3 | 8000 |

```bash
node examples/backend/containers/antspace/index.js
```

Run at most one at a time — they each bind a fixed port. If a previous run left a process alive, the next run will fail with `EADDRINUSE`.

## Miner pool ([`minerpools/`](./minerpools/))

### [`ocean/`](./minerpools/ocean/README.md) — Ocean minerpool example (project)

A clone-and-run **Ocean** minerpool example backed by a mock Ocean.xyz API: it drives the
`OCEAN_POOL` Worker directly (stats, per-worker hashrate, transactions, blocks) and stays running so
[`verify.js`](./minerpools/ocean/verify.js) can re-query it. Minerpools aren't wired into the Kernel/MDK thing model yet, so this runs
**standalone** (no Kernel/gateway) — the [Ocean example README][ocean-readme] has the detail.

```bash
node examples/backend/minerpools/ocean/index.js     # Ctrl+C to stop
node examples/backend/minerpools/ocean/verify.js    # in a second terminal
```

### [`f2pool/`](./minerpools/f2pool/index.js) — F2Pool minerpool example (project)

A clone-and-run **F2Pool** example backed by a mock F2Pool API: it drives the `F2_POOL` Worker
directly (stats, Workers, transactions), prints a snapshot, and exits. Standalone like Ocean —
the [F2Pool Worker package][f2pool-readme] holds its managers, mock server, and [`mdk-contract.json`](../../backend/workers/minerpools/f2pool/plugin/mdk-contract.json).

```bash
node examples/backend/minerpools/f2pool/index.js
```

### [`emcd/`](./minerpools/emcd/README.md) — EMCD minerpool example (project)

Run the EMCD pool manager against a local API mock that checks HMAC signatures.
The example prints the account snapshot and then exits.

```bash
node examples/backend/minerpools/emcd/index.js
```

## Kernel standalone ([`kernel/`](./kernel/))

### [`kernel-shell.js`](./kernel/kernel-shell.js) — bare Kernel

Starts the Kernel using the low-level `createKernel()` directly, without `getKernel()`. Useful for seeing the raw configuration shape before any bootstrap helpers are applied.

```bash
node examples/backend/kernel/kernel-shell.js
```

### [`demo.js`](./kernel/demo.js) — full feature parity demo

Starts a Whatsminer M56S Worker and a Kernel in the same process, then exercises every MDK Protocol
operation (telemetry.pull query types, command.request write operations, state.pull, health.ping,
identity/capability discovery) before exiting cleanly.

```bash
node examples/backend/kernel/demo.js
```

### [`command-flow.js`](./kernel/command-flow.js) — command cheatsheet

Starts a real Whatsminer M56S Worker backed by the hardware simulator, waits for Kernel discovery,
then prints ready-to-run `hp-rpc-cli` commands for every operation in the whatsminer contract.

```bash
node examples/backend/kernel/command-flow.js     # Ctrl+C to stop
```

### [`telemetry-flow.js`](./kernel/telemetry-flow.js) — live telemetry cheatsheet

Same setup as [`command-flow.js`](./kernel/command-flow.js), but subscribes to the scheduler-driven telemetry pull loop (every 3 s)
and prints live metrics on each tick alongside the `hp-rpc-cli` cheatsheet.

```bash
node examples/backend/kernel/telemetry-flow.js     # Ctrl+C to stop
```

### [`auth-whitelist.js`](./kernel/auth-whitelist.js) — HRPC auth allowlist

Shows how to restrict Kernel access to specific clients via the HRPC firewall allowlist. Only clients
whose DHT public key is in the allowlist can connect; everyone else is refused at the network layer.

```bash
node examples/backend/kernel/auth-whitelist.js     # Ctrl+C to stop
```

## Notes

**Store isolation** — each example writes to its own directory under the system temp folder (`/tmp/mdk-example-*`). Running two instances of the same example simultaneously will cause a hypercore file-lock error.

**Cleanup** — all long-running examples install a `SIGINT` handler (Ctrl+C) that stops the adapter, manager and Kernel gracefully before exiting.

**DHT discovery** — Workers register with the Kernel over HRPC by announcing on a shared discovery topic; single-process examples co-locate both in one process, so discovery is near-instant. Expect a few seconds of delay only when Kernel and Worker are started as genuinely separate processes.

## Troubleshooting

### Port conflicts: `EADDRINUSE`

**Symptom**: An example fails to start with:

```text
Error: listen EADDRINUSE: address already in use :::8000
```

**Cause**: Another example or a previous run left a process holding the port. Single-Worker examples bind fixed ports (see the table in [Single-Worker examples](#single-worker-examples)); only one can run at a time.

**Check**: Find the process holding the port:

```bash
lsof -nP -iTCP:8000   # replace with the port from the error
```

**Fix**: Kill the stale process:

```bash
kill <pid>   # use the PID from lsof output
```

Or kill all Node.js processes running backend examples:

```bash
pkill -f "node examples/backend"
```

### Hypercore file-lock error

**Symptom**: An example fails with:

```text
Error: Lock file already held
```

**Cause**: Two instances of the same example are running simultaneously, or a previous run didn't clean up its store lock.

**Fix**: Stop all instances of that example, then remove its temp store:

```bash
rm -rf /tmp/mdk-example-*   # clears all example stores
```

Re-run the example. Each start recreates its own isolated store directory.

[antminer-readme]: miners/antminer/README.md

[bitdeer-readme]: containers/bitdeer/README.md

[seneca-readme]: sensors/seneca/README.md

[abb-readme]: powermeters/abb/README.md

[satec-readme]: powermeters/satec/README.md

[schneider-readme]: powermeters/schneider/README.md

[ocean-readme]: minerpools/ocean/README.md

[f2pool-readme]: ../../backend/workers/minerpools/f2pool/README.md
