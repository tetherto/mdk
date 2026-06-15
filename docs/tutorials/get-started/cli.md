---
title: Control devices from the CLI
description: "[⏱️ <3 min] From git clone to a running ORK with an interactive CLI client, in under three minutes"
docs@tether_slug: tutorials/backend-stack/cli/
---

*Get started · 2 of 3 · Control devices from the CLI*

> [!NOTE]
> If ORK, worker, manager, or thing are unfamiliar, read [`terminology.md`][terminology] first.

## Overview

This is rung 2 of the [Get started][get-started] ladder: **interact**. It walks the shortest path from a fresh clone to a fully wired MDK stack you can drive interactively from a CLI. Everything runs in one Node process, no real hardware required.

What you'll have at the end:

- A mock Whatsminer M56S serving telemetry on `127.0.0.1:14028`
- An ORK with one worker registered and one device discovered
- An interactive `client.js` REPL talking to ORK over its IPC socket — pull metrics, list workers, send commands like `reboot` and `setpower`
- (Optional) An App Node HTTP API on `:3000` so non-Node consumers (browsers, AI agents over MCP) can hit the same stack over REST

> [!NOTE]
> Same shape as [rung 1][run-tutorial]: the stack still boots with `getOrk()`, `startWorker()`, and `registerThing()`. Only the worker class (`WM_M56S`) and the mock hardware (Whatsminer instead of Antminer) change. What's new here is a second process — `client.js` — that connects over IPC and drives the running stack.

The example lives in [`backend/core/examples/mdk-e2e/`][examples-e2e] and contains six runnable scripts. This tutorial uses three of them: `run.js` for a smoke test, `server.js` for the long-running stack, and `client.js` for interactive control.

## Prerequisites

- Node.js >=24 (LTS)
- npm >=11

> [!IMPORTANT]
> The stack starts an ORK whose control plane is peer-to-peer over a Hyperswarm DHT, so it needs outbound network access. Without it the stack stalls at startup while the ORK tries to reach DHT bootstrap nodes. See [how workers connect][workers-connect] for the ORK/DHT mechanics.

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

Before going interactive, prove the wiring works. `run.js` starts a mock Whatsminer + worker + ORK in one process, exercises a few queries, prints the
results, and exits cleanly:

```bash
node backend/core/examples/mdk-e2e/run.js
```

Expected output (the UUID and metric values vary):

```
Devices: [ '8f3e9a2b-7c1d-4e5a-9f8b-6c2d1e3f4a5b [miner-wm-m56s]' ]
Telemetry: ONLINE hashrate=170000 power=3500W
Commands: reboot, setPowerMode, setLED, setPowerPct, setupPools, saveComment
```

If you see those three lines, every layer is working: the mock is responding, the worker registered the device, ORK discovered the worker over the local
DHT topic, and IPC routing is delivering envelopes both ways. The script tears itself down and exits with code 0.

> [!IMPORTANT]
> If the smoke test fails with `EADDRINUSE` on port 14028, a previous run left a Node process alive. Kill stragglers with `pkill -f mdk-e2e` and retry.

</details>

</Step>

<Step>

### Run the interactive demo

#### 3.1 Start the stack

In your terminal:

```bash
node backend/core/examples/mdk-e2e/server.js
```

`server.js` starts the same mock + worker + ORK as `run.js`, but stays running and prints the IDs you'll need:

```
  ORK key:  7a4c8b...e3f0
  Device:   8f3e9a2b-7c1d-4e5a-9f8b-6c2d1e3f4a5b

  hp-rpc-cli -s 7a4c8b...e3f0 -m mdk -d '{...}'
  hp-rpc-cli -s 7a4c8b...e3f0 -m mdk -d '{...}'

  Ctrl+C to stop.
```

The `ORK key` is a 64-char hex public key. `Device` is a UUIDv4 generated at registration time. Both vary per run — note the device UUID for the next step.

The two `hp-rpc-cli` lines are paste-ready commands for inspecting ORK over HRPC from another machine. You don't need them for this tutorial — they're
there if you have [`hp-rpc-cli`](https://www.npmjs.com/package/hyperswarm-rpc-cli) installed and want to go off-script.

#### 3.2 Connect the interactive client

Open a second terminal in the same `mdk` directory:

```bash
node backend/core/examples/mdk-e2e/client.js
```

`client.js` connects to ORK's default IPC socket and gives you an MDK REPL:

```
  MDK Client — connected to IPC: /tmp/mdk/ork.sock
  Type "help" for commands, "quit" to exit.

mdk>
```

#### 3.3 Drive the stack

3.3.1 Discover the telemetry of your (mock) device by entering commands at the `mdk>` prompt, substituting `<deviceId>` with the UUID printed in Step 3.1:

```
mdk> metrics <deviceId>
```

Each command builds an MDK Protocol envelope, writes it to ORK's IPC socket, and prints the JSON response. 

3.3.2 Try changing the power mode and observing the effect:

```
mdk> setpower <deviceId> low
mdk> metrics <deviceId>
```

After `setpower ... low` the second `metrics` call should reflect the power mode change.

<!-- sync with backend/core/examples/mdk-e2e/client.js help block -->
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

### 4 (Optional) enable App Node for HTTP access

In **Terminal 1**, `Ctrl+C` the running stack, then restart with `--app-node`:

```bash
node backend/core/examples/mdk-e2e/server.js --app-node
```

You'll see an extra line in the startup banner:

```
  App-node: http://localhost:3000 (noAuth mode)
```

Confirm it's alive — App Node has no index page, so hit `/auth/site` directly:

```bash
curl http://localhost:3000/auth/site
```

You should see something like `{"site":"Site_Name"}`.

> [!NOTE]
> In `noAuth` mode most data endpoints (e.g. `/auth/list-things`, `/auth/miners`) are unavailable — they require the cache and auth config that the
> full App Node service sets up. `--app-node` in `server.js` is a development shortcut; for full REST access to device telemetry, run App Node as a
> full service. See [`backend/core/app-node/`][app-node-readme] for setup.

> [!WARNING]
> `--app-node` runs in `noAuth` mode for development convenience. Do not expose port 3000 outside localhost.

</Step>

</Steps>

## What just happened

Your stack wired up, in order:

1. **Mock device**:`server.js` calls `wmMock.createServer({ port: 14028, ... })` — an HTTP server speaking the Whatsminer protocol with canned telemetry.
2. **ORK**: `getOrk()` boots the kernel, generates a random DHT topic, and opens an IPC socket at the default path (`os.tmpdir()/mdk/ork.sock`).
3. **Worker**: `startWorker(WM_M56S, { ork })` instantiates the Whatsminer manager, mounts its protocol adapter, and registers with ORK directly — no
DHT round-trip because they share the process.
4. **Thing registration**: `manager.registerThing({ info, opts })` tells the worker about the device at `127.0.0.1:14028`. The worker stores the
registration and starts polling.
5. **Client**: `client.js` opens the IPC socket from a second process and sends MDK Protocol envelopes (`worker.list`, `telemetry.pull`, `command.request`, ...). 
ORK routes them to the worker, the worker hits the mock, and the response flows back over IPC.

> [!NOTE]
> No App Node here? Right. App Node is the translator that lets non-Node consumers — browser UIs, AI agents over MCP — speak MDK Protocol to ORK. 
> `client.js` already speaks MDK Protocol over IPC, so it talks to ORK directly. App Node becomes mandatory only when the consumer can't open a UNIX socket. 
> See [`architecture.md#app-node`][architecture-app-node].

## Cleanup

`Ctrl+C` in Terminal 1 stops the worker, ORK, and mock cleanly. `run.js` deletes its own state directory on exit. `server.js` leaves data under `os.tmpdir()/mdk/` — safe to ignore, or remove with:

```bash
rm -rf "$TMPDIR/mdk" /tmp/mdk
```

## Continue

Next: [3. Run the dashboard demo][dashboard-tutorial] — put a browser dashboard on a running stack with live charts.

## Go deeper

- Walk the simpler single-script Antminer path — [1. Run the stack][run-tutorial]
- Run a full site (5 workers, 26 devices) — [`backend/core/examples/mdk-site/site.js`][site-example]
- Understand the install pattern for any worker — [`backend/workers/docs/install-pattern.md`][worker-install]
- Read all runnable examples in one place — [`backend/core/examples/README.md`][examples-readme]

## Links

[terminology]: ../../concepts/terminology.md
<!-- docs@tether.io: terminology → concepts/terminology -->

[get-started]: index.md
<!-- docs@tether.io: get-started → tutorials/backend-stack -->

[run-tutorial]: run.md
<!-- docs@tether.io: run-tutorial → tutorials/backend-stack/run -->

[dashboard-tutorial]: dashboard.md
<!-- docs@tether.io: dashboard-tutorial → tutorials/full-stack/dashboard -->

[architecture-app-node]: ../../concepts/architecture.md#app-node
<!-- docs@tether.io: architecture-app-node → concepts/architecture#app-node -->

[workers-connect]: ../../concepts/worker-discovery.md
<!-- docs@tether.io: workers-connect → concepts/worker-discovery -->

[examples-e2e]: ../../../backend/core/examples/README.md#end-to-end-mdk-e2e
<!-- docs@tether.io: examples-e2e → https://github.com/tetherto/mdk/blob/main/backend/core/examples/README.md#end-to-end-mdk-e2e -->

[app-node-readme]: ../../../backend/core/app-node/README.md
<!-- docs@tether.io: app-node-readme → https://github.com/tetherto/mdk/blob/main/backend/core/app-node/README.md -->

[site-example]: ../../../backend/core/examples/mdk-site/site.js
<!-- docs@tether.io: site-example → https://github.com/tetherto/mdk/blob/main/backend/core/examples/mdk-site/site.js -->

[worker-install]: ../../../backend/workers/docs/install-pattern.md
<!-- docs@tether.io: worker-install → https://github.com/tetherto/mdk/blob/main/backend/workers/docs/install-pattern.md -->

[examples-readme]: ../../../backend/core/examples/README.md
<!-- docs@tether.io: examples-readme → https://github.com/tetherto/mdk/blob/main/backend/core/examples/README.md -->
