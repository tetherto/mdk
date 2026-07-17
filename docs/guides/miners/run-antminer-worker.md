---
title: Run an Antminer Worker
description: Start an MDK Worker for a Bitmain Antminer (S19 XP, S19 XP Hydro, S21, S21 Pro) against a mock or a real device
docs@tether_slug: guides/miners/run-antminer-worker
---

## Overview

This page details how to run the Bitmain Antminer Worker. Select the development (mock) or real-device path.

## Prerequisites

Review the [common deployment prerequisites][miner-guide-assumptions] before you start.

Deployment-specific requirements:

- A Node.js service or script in your deployment that runs the MDK Worker and registers devices
- A supported Antminer device reachable from the machine or container running the Worker
- The miner API reachable over HTTP, typically port `80`
- Digest-auth credentials for the miner. Antminer devices commonly default to username `root` and password `root`, but use your site's configured credentials

<Steps>

<Step>

### Development

<details>
<summary>Run against a mock</summary>

To support development, this repo ships a config-driven runnable example that boots a mock device per configured Worker, starts a Kernel and Gateway, and starts each Worker (`startAntminerWorker`) against its mock:

```bash
node examples/backend/miners/antminer/index.js
```

It falls back to the committed example config (`config/mdk.config.json.example`) when no local `config/mdk.config.json` is present, so it runs clone-and-run with zero setup. It prints the Kernel HRPC key and one line per registered device, then stays running until Ctrl+C. For details on the boot options and mock, see [USAGE.md][antminer-usage].

</details>

</Step>

<Step>

### Connect a miner

#### 2.1 Pick your model

Use the Antminer Worker's [USAGE.md][antminer-usage] to confirm the `model` value and mock `type` for your device. This guide uses `s21`; replace it with the value for your miner.

#### 2.2 Register your miner

Antminer devices use an HTTP API with digest authentication. Add this code to the Node.js service or script that runs the MDK Worker in your deployment. The snippet shows the minimum boot call seeding one Antminer device; replace the example IP address and credentials with your miner's values:

```js
const { getKernel } = require('@tetherto/mdk')
const { startAntminerWorker } = require('@tetherto/mdk-worker-antminer')

const kernel = await getKernel()

const worker = await startAntminerWorker({
  workerId: 'antminer-rack-1',
  model: 's21',
  storeDir: './store/antminer-rack-1',
  seedDevices: [{
    info: { container: 'site-1', serialNum: 'AM-001' },
    opts: { address: '192.168.1.20', port: 80, username: 'root', password: 'root' }
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
await client.sendWorkerCommand('antminer-rack-1', null, 'registerThing', {
  id: 'AM-002',
  info: { container: 'site-1', serialNum: 'AM-002' },
  opts: { address: '192.168.1.21', port: 80, username: 'root', password: 'root' }
})
```

> [!IMPORTANT]
> `registerThing` persists the device config immediately, but the running Worker does not pick it up until it is stopped and restarted (`await worker.stop()`, then call `startAntminerWorker` again with the same `storeDir` and no `seedDevices`) — there is no hot-add.

Before running in a deployment, generate the Worker config (`common.json` for Worker identity, `base.thing.json` for device defaults and per-model alert thresholds):

```bash
cd backend/workers/miners/antminer
./setup-config.sh
```

For the full `seedDevices`/`registerThing` option reference and the mock `createServer` options, see the Worker's [USAGE.md][antminer-usage] and the shared [install pattern][install-pattern].

</Step>

</Steps>

## Troubleshooting

The development example on this page is `examples/backend/miners/antminer/index.js`. A working run prints the Kernel HRPC key and one line per registered device, then stays running until Ctrl+C.

If it does not print those values, or if a mock port is already in use, follow [miner troubleshooting][miner-troubleshooting].

## Next steps

- Decide how to run the Worker service — [Deployment topologies][deployment-topologies]
- Review telemetry units, command shapes, and error codes — [`mdk-contract.json`][antminer-contract]

## Links

[terminology]: ../../reference/glossary.md
<!-- docs@tether.io: terminology → reference/glossary -->

[miner-guide-assumptions]: index.md#prerequisites
<!-- docs@tether.io: miner-guide-assumptions → guides/miners#prerequisites -->

[antminer-usage]: ../../../backend/workers/miners/antminer/USAGE.md
<!-- docs@tether.io: antminer-usage → https://github.com/tetherto/mdk/blob/main/backend/workers/miners/antminer/USAGE.md -->

[install-pattern]: ../../../backend/workers/docs/install-pattern.md
<!-- docs@tether.io: install-pattern → https://github.com/tetherto/mdk/blob/main/backend/workers/docs/install-pattern.md -->

[get-started]: ../../tutorials/get-started/index.md
<!-- docs@tether.io: get-started → tutorials/backend-stack -->

[deployment-topologies]: ../../concepts/deployment-topologies.md
<!-- docs@tether.io: deployment-topologies → concepts/deployment-topologies -->

[antminer-contract]: ../../../backend/workers/miners/antminer/plugin/mdk-contract.json
<!-- docs@tether.io: antminer-contract → https://github.com/tetherto/mdk/blob/main/backend/workers/miners/antminer/plugin/mdk-contract.json -->

[miner-troubleshooting]: troubleshooting.md
<!-- docs@tether.io: miner-troubleshooting → guides/miners/troubleshooting -->
