---
title: Run the stack
description: "[⏱️ <3 min] From git clone to a running Kernel with one mock Whatsminer registered, in under 3 minutes"
docs@tether_slug: tutorials/backend-stack/run/
---

*Get started · 1 of 3 · Run the stack*

> [!NOTE]
> If Kernel, Worker, manager, or thing are unfamiliar, read [`terminology.md`][terminology] first.

## Overview

This is rung 1 of the [Get started][get-started] ladder: **observe**. It walks the shortest path from a fresh clone to a running Kernel with one mock Whatsminer registered, no hardware required. Everything runs in one Node process.

What you'll have at the end:

- A mock Whatsminer M56S serving telemetry on `127.0.0.1:14028`
- An Kernel started and aware of one registered device
- Device list, telemetry, and available commands printed to the terminal

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
> Each script walks every `package.json` under its workspace and runs `npm ci`.

</Step>

<Step>

### Run the example

```bash
node examples/backend/mdk-e2e/run.js
```

Expected output:

```
Devices: [ 'WM-001 [miner-wm-m56s]' ]
Telemetry: mining hashrate=295764693.45 power=4000W
Commands: reboot, setPowerMode, setLED, setupPools, setPowerPct, setUpfreqSpeed, registerThing, updateThing, forgetThings, saveSettings, saveComment, editComment, deleteComment
```

If you see those three lines, the whole stack is up: mock device responding, Worker registered, Kernel started and aware of the device. The script queries the device and then exits cleanly.

> [!IMPORTANT]
> If the example fails with `EADDRINUSE`, a previous run left port 14028 bound. Kill stale Node processes with `pkill -f mdk-e2e` and retry.

</Step>

</Steps>

## What just happened

Here is what `run.js` does — the minimum runnable shape for an MDK stack:

```js
const { getKernel, waitForDiscovery } = require('../../../backend/core/mdk')
const { createMdkClient } = require('../../../backend/core/client')
const { startWhatsminerWorker } = require('../../../backend/workers/miners/whatsminer')
const wmMock = require('../../../backend/workers/miners/whatsminer/mock/server')

// Start a mock Whatsminer M56S on port 14028
wmMock.createServer({ port: 14028, host: '127.0.0.1', type: 'm56s', serial: 'WM-001', password: 'admin' })

// Start the Whatsminer Worker with one seeded device
const worker = await startWhatsminerWorker({
  workerId: 'whatsminer-m56s-e2e',
  model: 'm56s',
  storeDir: path.join(ROOT, 'worker-store'),
  kernelTopic: TOPIC,
  seedDevices: [{
    id: 'WM-001',
    info: { serialNum: 'WM-001' },
    opts: { address: '127.0.0.1', port: 14028, password: 'admin' }
  }]
})

// Start Kernel — discovers the Worker via DHT
const kernel = await getKernel({ root: ROOT, topic: TOPIC })
await waitForDiscovery(kernel)

// Connect an MDK client over HRPC
const client = createMdkClient({ hrpc: { key: kernel.getPublicKey() } })
await client.connect()

// Query the device and print results
const list = await client.pullTelemetry(deviceId, 'list')
const tel = await client.pullTelemetry(deviceId, 'metrics')
const caps = await client.getCapabilities(deviceId)
```

Six steps, in order:

1. **Starts a mock miner.** `wmMock.createServer({ port: 14028, type: 'm56s', serial: 'WM-001', password: 'admin' })` binds port 14028 with a Whatsminer-compatible API serving canned telemetry.
2. **Starts a Worker.** `startWhatsminerWorker({ ...seedDevices })` instantiates the Whatsminer manager and seeds it with one device registration at `127.0.0.1:14028`. The Worker stores the registration and begins polling the mock.
3. **Starts Kernel.** `getKernel({ topic })` brings up the kernel and joins the DHT topic. It discovers the Worker and pulls its identity and capabilities.
4. **Waits for discovery.** `waitForDiscovery(kernel)` blocks until the Worker appears in Kernel's registry.
5. **Connects a client.** `createMdkClient({ hrpc: { key: kernel.getPublicKey() } })` creates an MDK Protocol client that speaks to Kernel over HRPC.
6. **Queries and prints.** The script pulls device list, telemetry, and capabilities, prints them, cleans up, and exits.

> [!NOTE]
> No Gateway here? Right. Gateway is the translator that lets non-Node consumers — browser UIs, AI agents over MCP — speak MDK Protocol to Kernel. This script holds the Kernel handle in-process and speaks MDK Protocol to it directly. See [`architecture.md#gateway`][architecture-gateway] for when Gateway is mandatory.

## Cleanup

The script cleans up automatically on exit. Temporary data lives at `os.tmpdir()/e2e-run/` and is removed by the script. If needed, you can manually clean with:

```bash
rm -rf "$TMPDIR/e2e-run" /tmp/e2e-run
```

## Continue

Next: [2. Control devices from the CLI][cli-tutorial] — keep a stack running and drive it interactively (Whatsminer plus an MDK REPL).

## Next steps

- Try different miner hardware — the same MDK API works with [Antminers][antminer-usage], [Avalonminers][examples-readme], and more
- Run a full site (5 Workers, 26 devices) — [`examples/backend/mdk-site/site.js`][site-example]
- See Kernel and a Worker as separate OS processes — [`dht-worker.js`][dht-worker] + [`dht-kernel.js`][dht-kernel] + [`client.js`][dht-client]
- Understand the install pattern for any Worker — [`backend/workers/docs/install-pattern.md`][worker-install]
- Read all runnable examples in one place — [`examples/backend/README.md`][examples-readme]

## Links

[terminology]: ../../reference/glossary.md
<!-- docs@tether.io: terminology → reference/glossary -->

[get-started]: index.md
<!-- docs@tether.io: get-started → tutorials/backend-stack -->

[cli-tutorial]: cli.md
<!-- docs@tether.io: cli-tutorial → tutorials/backend-stack/cli -->

[architecture-gateway]: ../../concepts/architecture.md#gateway
<!-- docs@tether.io: architecture-gateway → concepts/architecture#gateway -->

[workers-connect]: ../../concepts/stack/workers.md
<!-- docs@tether.io: workers-connect → concepts/stack/workers -->

[network-troubleshooting]: ../../guides/miners/troubleshooting.md#example-does-not-print-a-kernel-key
<!-- docs@tether.io: network-troubleshooting → guides/miners/troubleshooting#example-does-not-print-a-kernel-key -->

[antminer-usage]: ../../../backend/workers/miners/antminer/USAGE.md
<!-- docs@tether.io: antminer-usage → https://github.com/tetherto/mdk/blob/main/backend/workers/miners/antminer/USAGE.md -->

[site-example]: ../../../examples/backend/mdk-site/site.js
<!-- docs@tether.io: site-example → https://github.com/tetherto/mdk/blob/main/examples/backend/mdk-site/site.js -->

[dht-worker]: ../../../examples/backend/mdk-e2e/dht-worker.js
<!-- docs@tether.io: dht-worker → https://github.com/tetherto/mdk/blob/main/examples/backend/mdk-e2e/dht-worker.js -->

[dht-kernel]: ../../../examples/backend/mdk-e2e/dht-kernel.js
<!-- docs@tether.io: dht-kernel → https://github.com/tetherto/mdk/blob/main/examples/backend/mdk-e2e/dht-kernel.js -->

[dht-client]: ../../../examples/backend/mdk-e2e/client.js
<!-- docs@tether.io: dht-client → https://github.com/tetherto/mdk/blob/main/examples/backend/mdk-e2e/client.js -->

[worker-install]: ../../../backend/workers/docs/install-pattern.md
<!-- docs@tether.io: worker-install → https://github.com/tetherto/mdk/blob/main/backend/workers/docs/install-pattern.md -->

[examples-readme]: ../../../examples/backend/README.md
<!-- docs@tether.io: examples-readme → https://github.com/tetherto/mdk/blob/main/examples/backend/README.md -->
