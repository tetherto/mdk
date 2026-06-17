---
title: Run the stack
description: "[⏱️ <3 min] From git clone to a running ORK with one mock Antminer registered, in under 3 minutes"
docs@tether_slug: tutorials/backend-stack/run/
---

*Get started · 1 of 3 · Run the stack*

> [!NOTE]
> If ORK, worker, manager, or thing are unfamiliar, read [`terminology.md`][terminology] first.

## Overview

This is rung 1 of the [Get started][get-started] ladder: **observe**. It walks the shortest path from a fresh clone to a running ORK with one mock Antminer registered, no hardware required. Everything runs in one Node process.

What you'll have at the end:

- A mock Antminer S19XP serving Bitmain CGI endpoints on `127.0.0.1:14021`
- An ORK started and aware of one registered device
- The ORK HRPC key and device ID printed to the terminal — ready for further inspection

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
> Each script walks every `package.json` under its workspace and runs `npm ci`.

</Step>

<Step>

### Run the example

```bash
node backend/workers/miners/antminer/examples/run-s19xp.js
```

Expected output (the hex key varies):

```
  ORK HRPC key: 7a4c8b...e3f0
  Device: t-miner-am-s19xp-127-0-0-1

  Ctrl+C to stop.
```

If you see those two lines, the whole stack is up: mock device responding, worker registered, ORK started and aware of the device.

> [!IMPORTANT]
> If the example fails with `EADDRINUSE`, a previous run left port 14021 bound. Kill stale Node processes with `pkill -f run-s19xp` and retry.

</Step>

</Steps>

## What just happened

Here is what [`run-s19xp.js`][run-s19xp-example] does, line by line — the minimum runnable shape for an MDK stack:

```js
const { getOrk, startWorker } = require('@tetherto/mdk')
const { AM_S19XP } = require('@tetherto/miner-antminer')
const amMock = require('@tetherto/miner-antminer/mock/server')

// Start a mock Antminer S19XP on port 14021 to emit telemetry
amMock.createServer({ port: 14021, host: '127.0.0.1', type: 's19xp', serial: 'AM-001', password: 'root' })

// Start ORK — the orchestration kernel that manages all workers
const ork = await getOrk()

// Start the Antminer worker — it joins the same DHT topic as ORK, allowing ORK to discover and pull the worker's identity and capabilities
const { manager } = await startWorker(AM_S19XP, { ork })

// Register the mock Antminer device with the worker so it starts polling
await manager.registerThing({
  info: { container: 'site-1', serialNum: 'AM-001' },   // logical identity
  opts: { address: '127.0.0.1', port: 14021, username: 'root', password: 'root' } // connection details
})
```

Five steps, in order:

1. **Starts a mock miner.** `amMock.createServer({ port: 14021, type: 's19xp', serial: 'AM-001', password: 'root' })` binds port 14021 with a Bitmain-compatible HTTP API serving canned telemetry. It exposes Bitmain CGI paths only — there is no root route (so `curl http://127.0.0.1:14021/` would return 404). To verify the mock directly, use a CGI path with Digest auth: `curl --digest -u root:root http://127.0.0.1:14021/cgi-bin/miner_type.cgi`
2. **Starts ORK.** `getOrk()` brings up the kernel and joins a freshly generated DHT topic.
3. **Starts a worker.** `startWorker(AM_S19XP, { ork })` instantiates the `AM_S19XP` manager class, mounts the protocol adapter, and joins the same DHT topic — ORK detects the new peer and pulls the worker's identity and capabilities.
4. **Registers a thing.** `manager.registerThing({ info, opts })` tells the worker about one device at `127.0.0.1:14021`. The worker stores the registration and begins polling the mock.
5. **Prints the IDs and waits.** The script logs ORK's public HRPC key and the device ID, then sits idle. Ctrl+C tears everything down.

> [!NOTE]
> No App Node here? Right. App Node is the translator that lets non-Node consumers — browser UIs, AI agents over MCP — speak MDK Protocol to ORK. This script already speaks MDK Protocol over IPC, so it talks to ORK directly. See [`architecture.md#app-node`][architecture-app-node] for when App Node is mandatory.

## Cleanup

`Ctrl+C` stops the mock, worker, and ORK cleanly. The script uses the default ORK root at `os.tmpdir()/mdk/` — safe to ignore, or remove with:

```bash
rm -rf "$TMPDIR/mdk" /tmp/mdk
```

## Continue

Next: [2. Control devices from the CLI][cli-tutorial] — keep a stack running and drive it interactively (Whatsminer plus an MDK REPL).

## Next steps

- For the four supported Antminer models (`AM_S19XP`, `AM_S19XPH`, `AM_S21`, `AM_S21PRO`) and how to swap them, see [`backend/workers/miners/antminer/USAGE.md`][antminer-usage]
- Run a full site (5 workers, 26 devices) — [`examples/backend/mdk-site/site.js`][site-example]
- See ORK and a worker as separate OS processes — [`dht-worker.js`][dht-worker] + [`dht-ork.js`][dht-ork] + [`client.js`][dht-client]
- Understand the install pattern for any worker — [`backend/workers/docs/install-pattern.md`][worker-install]
- Use ORK directly without `getOrk()` — [`backend/workers/docs/orchestrator.md`][worker-orchestrator]
- Read all runnable examples in one place — [`examples/backend/README.md`][examples-readme]

## Links

[terminology]: ../../concepts/terminology.md
<!-- docs@tether.io: terminology → concepts/terminology -->

[get-started]: index.md
<!-- docs@tether.io: get-started → tutorials/backend-stack -->

[cli-tutorial]: cli.md
<!-- docs@tether.io: cli-tutorial → tutorials/backend-stack/cli -->

[architecture-app-node]: ../../concepts/architecture.md#app-node
<!-- docs@tether.io: architecture-app-node → concepts/architecture#app-node -->

[workers-connect]: ../../concepts/worker-discovery.md
<!-- docs@tether.io: workers-connect → concepts/worker-discovery -->

[run-s19xp-example]: ../../../backend/workers/miners/antminer/examples/run-s19xp.js
<!-- docs@tether.io: run-s19xp-example → https://github.com/tetherto/mdk/blob/main/backend/workers/miners/antminer/examples/run-s19xp.js -->

[antminer-usage]: ../../../backend/workers/miners/antminer/USAGE.md
<!-- docs@tether.io: antminer-usage → https://github.com/tetherto/mdk/blob/main/backend/workers/miners/antminer/USAGE.md -->

[site-example]: ../../../examples/backend/mdk-site/site.js
<!-- docs@tether.io: site-example → https://github.com/tetherto/mdk/blob/main/examples/backend/mdk-site/site.js -->

[dht-worker]: ../../../examples/backend/mdk-e2e/dht-worker.js
<!-- docs@tether.io: dht-worker → https://github.com/tetherto/mdk/blob/main/examples/backend/mdk-e2e/dht-worker.js -->

[dht-ork]: ../../../examples/backend/mdk-e2e/dht-ork.js
<!-- docs@tether.io: dht-ork → https://github.com/tetherto/mdk/blob/main/examples/backend/mdk-e2e/dht-ork.js -->

[dht-client]: ../../../examples/backend/mdk-e2e/client.js
<!-- docs@tether.io: dht-client → https://github.com/tetherto/mdk/blob/main/examples/backend/mdk-e2e/client.js -->

[worker-install]: ../../../backend/workers/docs/install-pattern.md
<!-- docs@tether.io: worker-install → https://github.com/tetherto/mdk/blob/main/backend/workers/docs/install-pattern.md -->

[worker-orchestrator]: ../../../backend/workers/docs/orchestrator.md
<!-- docs@tether.io: worker-orchestrator → https://github.com/tetherto/mdk/blob/main/backend/workers/docs/orchestrator.md -->

[examples-readme]: ../../../examples/backend/README.md
<!-- docs@tether.io: examples-readme → https://github.com/tetherto/mdk/blob/main/examples/backend/README.md -->
