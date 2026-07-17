---
title: Run an Avalon Worker
description: Start an MDK Worker for a Canaan Avalon A1346 against a mock or a real device.
docs@tether_slug: guides/miners/run-avalon-worker
---

## Overview

This page details how to run the Canaan Avalon Worker. Select the development (mock) or real-device path.

## Prerequisites

Review [common deployment prerequisites][miner-guide-assumptions] before you start.

Deployment-specific requirements:

- A Node.js service or script in your deployment that runs the MDK Worker and registers devices
- A supported Avalon device reachable from the machine or container running the Worker
- The miner API reachable over the native CGMiner TCP API, typically port `4028`
- No API username or password. The Avalon CGMiner API is unauthenticated

<Steps>

<Step>

### Development

<details>
<summary>Run against a mock</summary>

To support development, this repo ships a runnable example that boots a mock A1346, starts a Kernel and Gateway, and starts the Worker (`startAvalonWorker`) against it:

```bash
node examples/backend/miners/avalon/index.js
```

It prints the Kernel HRPC key and the registered device ID, then stays running until Ctrl+C. For details on the boot options and mock, see [USAGE.md][avalon-usage].

</details>

</Step>

<Step>

### Connect a miner

#### 2.1 Confirm the model

Avalon ships one model family today, `a1346` — confirm this against the [USAGE.md][avalon-usage] as new models are added.

#### 2.2 Register your miner

Avalon devices use the native CGMiner TCP API on port 4028, which is unauthenticated (no username or password). Add this code to the Node.js service or script that runs the MDK Worker in your deployment. The snippet shows the minimum boot call seeding one Avalon device; replace the example IP address with your miner's value:

```js
const { getKernel } = require('@tetherto/mdk')
const { startAvalonWorker } = require('@tetherto/mdk-worker-avalon')

const kernel = await getKernel()

const worker = await startAvalonWorker({
  workerId: 'avalon-rack-1',
  model: 'a1346',
  storeDir: './store/avalon-rack-1',
  seedDevices: [{
    info: { container: 'site-1', serialNum: 'AV-001' },
    opts: { address: '192.168.1.30', port: 4028 }
  }]
})
await kernel.registerWorker(worker.runtime.getPublicKey())
```

> [!WARNING]
> Make sure each miner's IP is reachable from the machine or container running the Worker before registering. Commands act on physical hardware — prioritize thermal safety.

`seedDevices` only seeds a fresh, empty `storeDir` — once persisted, the device set survives restarts on its own. To add a device to an already-running fleet, send the `registerThing` command to the live Worker instead:

```js
const { createMdkClient } = require('@tetherto/mdk/backend/core/client')

const client = createMdkClient({ hrpc: { key: kernel.getPublicKey() } })
await client.connect()
await client.sendWorkerCommand('avalon-rack-1', null, 'registerThing', {
  id: 'AV-002',
  info: { container: 'site-1', serialNum: 'AV-002' },
  opts: { address: '192.168.1.31', port: 4028 }
})
```

> [!IMPORTANT]
> `registerThing` persists the device config immediately, but the running Worker does not pick it up until it is stopped and restarted (`await worker.stop()`, then call `startAvalonWorker` again with the same `storeDir` and no `seedDevices`) — there is no hot-add.

Before running in a deployment, generate the Worker config (`common.json` for Worker identity, `base.thing.json` for device defaults and per-model alert thresholds):

```bash
cd backend/workers/miners/avalon
./setup-config.sh
```

For the full `seedDevices`/`registerThing` option reference and the mock `createServer` options, see the Worker's [USAGE.md][avalon-usage] and the shared [install pattern][install-pattern].

</Step>

</Steps>

## Troubleshooting

The development example on this page is `examples/backend/miners/avalon/index.js`. A working run prints `Kernel HRPC key:` and `Device:`, then stays running until Ctrl+C.

If the example does not print both values, or if its mock port is already in use, follow [miner troubleshooting][miner-troubleshooting].

## Next steps

- Decide how to run the Worker service — [Deployment topologies][deployment-topologies]
- Review telemetry units, command shapes, and error codes — [`mdk-contract.json`][avalon-contract]

## Links

[terminology]: ../../reference/glossary.md
<!-- docs@tether.io: terminology → reference/glossary -->

[miner-guide-assumptions]: index.md#prerequisites
<!-- docs@tether.io: miner-guide-assumptions → guides/miners#prerequisites -->

[avalon-usage]: ../../../backend/workers/miners/avalon/USAGE.md
<!-- docs@tether.io: avalon-usage → https://github.com/tetherto/mdk/blob/main/backend/workers/miners/avalon/USAGE.md -->

[install-pattern]: ../../../backend/workers/docs/install-pattern.md
<!-- docs@tether.io: install-pattern → https://github.com/tetherto/mdk/blob/main/backend/workers/docs/install-pattern.md -->

[get-started]: ../../tutorials/get-started/index.md
<!-- docs@tether.io: get-started → tutorials/backend-stack -->

[deployment-topologies]: ../../concepts/deployment-topologies.md
<!-- docs@tether.io: deployment-topologies → concepts/deployment-topologies -->

[avalon-contract]: ../../../backend/workers/miners/avalon/plugin/mdk-contract.json
<!-- docs@tether.io: avalon-contract → https://github.com/tetherto/mdk/blob/main/backend/workers/miners/avalon/plugin/mdk-contract.json -->

[miner-troubleshooting]: troubleshooting.md
<!-- docs@tether.io: miner-troubleshooting → guides/miners/troubleshooting -->
