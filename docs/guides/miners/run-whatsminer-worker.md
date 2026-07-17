---
title: Run a Whatsminer Worker
description: Start an MDK Worker for a MicroBT Whatsminer (M30S+, M30S++, M53S, M56S, M63) against a mock or a real device.
docs@tether_slug: guides/miners/run-whatsminer-worker
---

## Overview

This page details how to run the MicroBT Whatsminer Worker. Select the development (mock) or real-device path.

## Prerequisites

Review the [common deployment prerequisites][miner-guide-assumptions] before you start.

Deployment-specific requirements:

- A Node.js service or script in your deployment that runs the MDK Worker and registers devices
- A supported Whatsminer device reachable from the machine or container running the Worker
- The miner API reachable over encrypted TCP, typically port `14028`
- The Whatsminer API password. The Worker negotiates a session token from it; there is no separate username

<Steps>

<Step>

### Development

<details>
<summary>Run against a mock</summary>

To support development, this repo ships a runnable example that boots a mock M56S Whatsminer, starts a Kernel, and starts the Worker (`startWhatsminerWorker`) against it:

```bash
node examples/backend/miners/mdk.client.miner.js
```

It prints the Kernel HRPC key and the registered device ID, then stays running until Ctrl+C. To try another model, run that model's mock directly (`npm run mock <type>` from `backend/workers/miners/whatsminer`, or see [USAGE.md][whatsminer-usage]) and adapt the `model` option in your own boot script.

</details>

</Step>

<Step>

### Connect a miner

#### 2.1 Pick your model

Use the Whatsminer Worker's [USAGE.md][whatsminer-usage] to confirm the `model` value and mock `type` for your device. This guide uses `m56s`; replace it with the value for your miner.

#### 2.2 Register your miner

Whatsminer devices use an encrypted TCP API on port 14028 with token-based authentication; the Worker negotiates a session token from the device password (there is no separate username). Add this code to the Node.js service or script that runs the MDK Worker in your deployment. The snippet shows the minimum boot call seeding one Whatsminer device; replace the example IP address and password with your miner's values:

```js
const { getKernel } = require('@tetherto/mdk')
const { startWhatsminerWorker } = require('@tetherto/mdk-worker-whatsminer')

const kernel = await getKernel()

const worker = await startWhatsminerWorker({
  workerId: 'whatsminer-rack-1',
  model: 'm56s',
  storeDir: './store/whatsminer-rack-1',
  seedDevices: [{
    info: { container: 'site-1', serialNum: 'WM-001' },
    opts: { address: '192.168.1.10', port: 14028, password: 'admin' }
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
await client.sendWorkerCommand('whatsminer-rack-1', null, 'registerThing', {
  id: 'WM-002',
  info: { container: 'site-1', serialNum: 'WM-002' },
  opts: { address: '192.168.1.11', port: 14028, password: 'admin' }
})
```

> [!IMPORTANT]
> `registerThing` persists the device config immediately, but the running Worker does not pick it up until it is stopped and restarted (`await worker.stop()`, then call `startWhatsminerWorker` again with the same `storeDir` and no `seedDevices`) — there is no hot-add.

Before running in a deployment, generate the Worker config (`common.json` for Worker identity, `base.thing.json` for device defaults and per-model alert thresholds):

```bash
cd backend/workers/miners/whatsminer
./setup-config.sh
```

For the full `seedDevices`/`registerThing` option reference, the mock `createServer` options, and the per-model alert blocks, see the Worker's [USAGE.md][whatsminer-usage] and the shared [install pattern][install-pattern].

</Step>

</Steps>

## Troubleshooting

The development example on this page uses `examples/backend/miners/mdk.client.miner.js`. A working run prints `Kernel HRPC key:` and `Device:`, then stays running until Ctrl+C.

If the example does not print both values, or if its mock port is already in use, follow [miner troubleshooting][miner-troubleshooting].

## Next steps

- Decide how to run the Worker service — [Deployment topologies][deployment-topologies]
- Review telemetry units, command shapes, and error codes — [`mdk-contract.json`][whatsminer-contract]

## Links

[terminology]: ../../reference/glossary.md
<!-- docs@tether.io: terminology → reference/glossary -->

[miner-guide-assumptions]: index.md#prerequisites
<!-- docs@tether.io: miner-guide-assumptions → guides/miners#prerequisites -->

[whatsminer-usage]: ../../../backend/workers/miners/whatsminer/USAGE.md
<!-- docs@tether.io: whatsminer-usage → https://github.com/tetherto/mdk/blob/main/backend/workers/miners/whatsminer/USAGE.md -->

[install-pattern]: ../../../backend/workers/docs/install-pattern.md
<!-- docs@tether.io: install-pattern → https://github.com/tetherto/mdk/blob/main/backend/workers/docs/install-pattern.md -->

[get-started]: ../../tutorials/get-started/index.md
<!-- docs@tether.io: get-started → tutorials/backend-stack -->

[deployment-topologies]: ../../concepts/deployment-topologies.md
<!-- docs@tether.io: deployment-topologies → concepts/deployment-topologies -->

[whatsminer-contract]: ../../../backend/workers/miners/whatsminer/plugin/mdk-contract.json
<!-- docs@tether.io: whatsminer-contract → https://github.com/tetherto/mdk/blob/main/backend/workers/miners/whatsminer/plugin/mdk-contract.json -->

[miner-troubleshooting]: troubleshooting.md
<!-- docs@tether.io: miner-troubleshooting → guides/miners/troubleshooting -->
