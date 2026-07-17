---
title: Control devices from the CLI
description: "[⏱️ <3 min] From git clone to a running Kernel with an interactive command-line tool, in under three minutes"
docs@tether_slug: tutorials/backend-stack/cli/
---

*Get started · 2 of 3 · Control devices from the CLI*

> [!NOTE]
> If Kernel, Worker, manager, or thing are unfamiliar, read [`terminology.md`][terminology] first.

## Overview

This is rung 2 of the [Get started][get-started] ladder: **interact**. It walks the shortest path from a fresh clone to a fully wired MDK stack 
you can drive interactively from a CLI. Everything runs in one Node process, no real hardware required.

What you'll have at the end:

- A mock Whatsminer M56S serving telemetry on `127.0.0.1:14028`
- An Kernel with one Worker registered and one device discovered
- An interactive `client.js` REPL talking to Kernel over HRPC — pull metrics, list Workers, send commands like `reboot` and `setpower`
- (Optional) A Gateway HTTP API on `:3000` so non-Node consumers (browsers, AI agents over MCP) can hit the same stack over REST

> [!NOTE]
> Same shape as [rung 1][run-tutorial]: the stack still boots with `getKernel()`, `startWhatsminerWorker()`, and `kernel.registerWorker()`. 
> What's new here is a second process — `client.js` — that connects over HRPC (using the key Kernel publishes to its key file) and drives the running stack.

The example lives in [`examples/backend/mdk-e2e/`][examples-e2e] and contains six runnable scripts. This tutorial uses 
three of them: `run.js` for a smoke test, `server.js` for the long-running stack, and `client.js` for interactive control.

## Prerequisites

- Node.js >=24 (LTS)
- npm >=11

> [!IMPORTANT]
> HRPC relies on HyperDHT for peer connectivity, including when Kernel and the Worker share a process.
> Review the [network requirements and checks][network-troubleshooting] if startup stalls.

<Steps>

<Step>

### Clone and install

#### 1.1 Clone the repo

```bash
git clone git@github.com:tetherto/mdk.git
cd mdk
```

#### 1.2 Install dependencies

The monorepo has two workspaces with their own dependency trees. Install both:

```bash
backend/core/install-packages.sh ci
backend/workers/install-packages.sh ci
```

> [!NOTE]
> Each script walks every `package.json` under its workspace and runs `npm ci`. The `examples/mdk-e2e/` package is included automatically — no extra
> install step needed. 

</Step>

<Step>

<details>
<summary>(1.3 Optional) Smoke test the stack</summary>

Before going interactive, prove the wiring works. `run.js` starts a mock Whatsminer + Worker + Kernel in one process, exercises a few queries, prints the
results, and exits cleanly:

```bash
node examples/backend/mdk-e2e/run.js
```

Expected output (the UUID and metric values vary):

```
Devices: [ '8f3e9a2b-7c1d-4e5a-9f8b-6c2d1e3f4a5b [miner-wm-m56s]' ]
Telemetry: ONLINE hashrate=170000 power=3500W
Commands: reboot, setPowerMode, setLED, setPowerPct, setupPools, saveComment
```

If you see those three lines, every layer is working: the mock is responding, the Worker registered the device with Kernel directly in-process (no DHT lookup), and envelope routing is delivering messages both ways. The script tears itself down and exits with code 0.

> [!IMPORTANT]
> If the smoke test fails with `EADDRINUSE` on port 14028, a previous run left a Node process alive. Kill stragglers with `pkill -f mdk-e2e` and retry.

</details>

</Step>

<Step>

### Run the interactive demo

#### 3.1 Start the stack

In your terminal:

```bash
node examples/backend/mdk-e2e/server.js
```

`server.js` starts the same mock + Worker + Kernel as `run.js`, but stays running and prints the IDs you'll need:

```
  Kernel key:  7a4c8b...e3f0
  Device:   8f3e9a2b-7c1d-4e5a-9f8b-6c2d1e3f4a5b

  hp-rpc-cli -s 7a4c8b...e3f0 -m mdk -d '{...}'
  hp-rpc-cli -s 7a4c8b...e3f0 -m mdk -d '{...}'

  Ctrl+C to stop.
```

The `Kernel key` is a 64-char hex public key. `Device` is a UUIDv4 generated at registration time. Both vary per run — note the device UUID for the next step.

The two `hp-rpc-cli` lines are paste-ready commands for inspecting Kernel over HRPC from another machine. You don't need them for this tutorial — they're
there if you have [`hp-rpc-cli`](https://github.com/holepunchto/hp-rpc-cli) installed and want to go off-script.

#### 3.2 Connect the interactive client

Open a second terminal in the same `mdk` directory:

```bash
node examples/backend/mdk-e2e/client.js
```

`client.js` reads the Kernel key from the key file Kernel published at startup (`os.tmpdir()/mdk/.kernel-key` — or pass a key as
the first argument), connects over HRPC, and gives you an MDK REPL:

```
  Client — connected to Kernel over HRPC: 7a4c8b…
  Type "help" for commands, "quit" to exit.

mdk>
```

#### 3.3 Drive the stack

3.3.1 Discover the telemetry of your (mock) device by entering commands at the `mdk>` prompt, substituting `<deviceId>` with the UUID printed in Step 3.1:

```
mdk> metrics <deviceId>
```

Each command builds an MDK Protocol envelope, sends it to Kernel over HRPC, and prints the JSON response. 

3.3.2 Try changing the power mode and observing the effect:

```
mdk> setpower <deviceId> low
mdk> metrics <deviceId>
```

After `setpower ... low` the second `metrics` call should reflect the power mode change.

<!-- sync with examples/backend/mdk-e2e/client.js help block -->
<details>
<summary>Full command reference</summary>

**Reads**

```
workers                      — list workers
list [deviceId]              — list devices
count [deviceId]             — device count
metrics <deviceId>           — live telemetry from hardware
logs <deviceId>              — recent logs
settings [deviceId]          — worker settings
stats [deviceId]             — fleet stats
config <deviceId>            — device config (pools, etc.)
capabilities <deviceId>      — mdk-contract capabilities
state [deviceId]             — worker state snapshot
```

**Commands**

```
reboot <deviceId>            — reboot miner
setpower <deviceId> <mode>   — set power mode (normal/low/high)
setled <deviceId> [on|off]   — toggle LED
```

```
quit / exit                  — exit client
```

</details>

#### 3.4 Tear down

When you're done, exit the client and stop the stack:

```
mdk> quit
```

Then `Ctrl+C` in Terminal 1.

</Step>

<Step>

### 4 (Optional) enable Gateway for HTTP access

In **Terminal 1**, `Ctrl+C` the running stack, then restart with `--gateway`:

```bash
node examples/backend/mdk-e2e/server.js --gateway
```

You'll see an extra line in the startup banner:

```
  Gateway: http://localhost:3000 (noAuth mode)
```

Confirm it's alive — Gateway has no index page, so hit `/auth/site` directly:

```bash
curl http://localhost:3000/auth/site
```

You should see something like `{"site":"Site_Name"}`.

> [!IMPORTANT]
> In `noAuth` mode, routes that call `services.authLib` (`/auth/miners`, `/auth/permissions`) crash with
> `Cannot read properties of undefined` because `authLib` is never instantiated. Routes that call `services.dataProxy`
> (`/auth/list-things`) fail with `UNKNOWN_METHOD` because the underlying RPC method requires the full DCS cluster
> registration that the production Gateway service provides. Use `/site-monitor/workers` and `/site-monitor/hashrate`
> for local inspection — those routes call `services.mdkClient` directly over HRPC and work without auth.

> [!WARNING]
> `--gateway` runs in `noAuth` mode for development convenience. Do not expose port 3000 outside localhost.

</Step>

</Steps>

## What just happened

Your stack wired up, in order:

1. **Mock device**:`server.js` calls `wmMock.createServer({ port: 14028, ... })` — an HTTP server speaking the Whatsminer protocol with canned telemetry.
2. **Kernel**: `getKernel()` boots the kernel, generates a random DHT topic, and publishes its HRPC public key to the well-known key file (`os.tmpdir()/mdk/.kernel-key`).
3. **Worker**: `startWhatsminerWorker({ ..., seedDevices })` constructs a `WorkerRuntime` seeded with one device at `127.0.0.1:14028` and starts it.
4. **Registration**: `kernel.registerWorker(worker.runtime.getPublicKey())` registers the Worker with Kernel directly — no DHT round-trip because
they share the process.
5. **Client**: `client.js` reads the key file from a second process, connects over HRPC, and sends MDK Protocol envelopes (`worker.list`, `telemetry.pull`, `command.request`, ...). 
Kernel routes them to the Worker, the Worker hits the mock, and the response flows back over HRPC.

> [!NOTE]
> No Gateway here? Right. Gateway is the translator that lets non-Node consumers — browser UIs, AI agents over MCP — speak MDK Protocol to Kernel. 
> `client.js` already speaks MDK Protocol over HRPC, so it talks to Kernel directly. Gateway becomes mandatory only when the consumer can't speak HRPC. 
> See [`architecture.md#gateway`][architecture-gateway].

## Cleanup

`Ctrl+C` in Terminal 1 stops the Worker, Kernel, and mock cleanly. `run.js` deletes its own state directory on exit. `server.js` leaves data 
under `os.tmpdir()/mdk/` — safe to ignore, or remove with:

```bash
rm -rf "$TMPDIR/mdk" /tmp/mdk
```

## Continue

Next: [3. Run the dashboard demo][dashboard-tutorial]: put a browser dashboard on a running stack with live charts.

## Go deeper

- Walk the simpler single-script path: [1. Run the stack][run-tutorial]
- Run a [full site (multiple Workers and devices):][site-example]
- Understand the [install pattern for any Worker][worker-install]
- Read all [runnable examples in one place][examples-readme]

## Links

[terminology]: ../../reference/glossary.md
<!-- docs@tether.io: terminology → reference/glossary -->

[get-started]: index.md
<!-- docs@tether.io: get-started → tutorials/backend-stack -->

[run-tutorial]: run.md
<!-- docs@tether.io: run-tutorial → tutorials/backend-stack/run -->

[dashboard-tutorial]: dashboard.md
<!-- docs@tether.io: dashboard-tutorial → tutorials/full-stack/dashboard -->

[architecture-gateway]: ../../concepts/architecture.md#gateway
<!-- docs@tether.io: architecture-gateway → concepts/architecture#gateway -->

[workers-connect]: ../../concepts/stack/workers.md
<!-- docs@tether.io: workers-connect → concepts/stack/workers -->

[network-troubleshooting]: ../../guides/miners/troubleshooting.md#example-does-not-print-a-kernel-key
<!-- docs@tether.io: network-troubleshooting → guides/miners/troubleshooting#example-does-not-print-a-kernel-key -->

[examples-e2e]: ../../../examples/backend/README.md#end-to-end-mdk-e2e
<!-- docs@tether.io: examples-e2e → https://github.com/tetherto/mdk/blob/main/examples/backend/README.md#end-to-end-mdk-e2e -->

[gateway-readme]: ../../../backend/core/gateway/README.md
<!-- docs@tether.io: gateway-readme → https://github.com/tetherto/mdk/blob/main/backend/core/gateway/README.md -->

[site-example]: ../../../examples/backend/mdk-site/site.js
<!-- docs@tether.io: site-example → https://github.com/tetherto/mdk/blob/main/examples/backend/mdk-site/site.js -->

[worker-install]: ../../../backend/workers/docs/install-pattern.md
<!-- docs@tether.io: worker-install → https://github.com/tetherto/mdk/blob/main/backend/workers/docs/install-pattern.md -->

[examples-readme]: ../../../examples/backend/README.md
<!-- docs@tether.io: examples-readme → https://github.com/tetherto/mdk/blob/main/examples/backend/README.md -->
