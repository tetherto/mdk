---
title: Run an Avalon Worker
description: Start an MDK Worker for a Canaan Avalon A1346 against a mock or a real device.
docs@tether_slug: guides/miners/run-avalon-worker
---

## Overview

This page details how to run the Canaan Avalon Worker. The package is a directory-loaded Worker Plugin
(`mdk-contract.json` plus handler files) that `mdk run` hosts from `mdk.yaml`, or that your own Node.js service
hosts on [`WorkerRuntimeV2`][worker-runtime-v2]. Select the development (mock) or real-device path.

## Prerequisites

Review [common deployment prerequisites][miner-guide-assumptions] before you start.

Deployment-specific requirements:

- An MDK project with `mdk.yaml` (`mdk create`), or a Node.js service or script in your deployment that hosts the Worker.
  `@tetherto/mdk-worker-avalon` is not published to npm, so the package resolves only through the workspace of an MDK
  repository clone after `npm install` at its root: keep the project or script inside that clone
- A supported Avalon device reachable from the machine or container running the Worker
- The miner API reachable over the native CGMiner TCP API, typically port `4028`
- A `password` for each device: reads need no credentials, and the Worker's own validation refuses to load a device without one
  (`ERR_DEVICE_CONFIG_INVALID`)

<Steps>

<Step>

### Development

<details>
<summary>Run against a mock</summary>

The Avalon Worker ships a mock A1346 that answers the CGMiner API with canned data. Declare the Worker in `mdk.yaml`
with `mock: true` and `mdk run` starts one mock per device, on the port each device names:

```yaml
spec:
  workers:
    - name: avalon
      package: '@tetherto/mdk-worker-avalon'
      config:
        mock: true
        devices:
          - id: AV-DEV-001
            opts: { address: 127.0.0.1, port: 14030, password: admin }
```

```bash
mdk run
```

Expected output includes a line for the Worker:

```text
✔ worker avalon ready 3538566ecb38…
```

To host the Worker yourself instead of with `mdk run`, run the mock in one terminal and a host script in a second,
both from the repository root:

1. Start the mock on the CGMiner port:

   ```bash
   npm run mock a1346 4028
   ```

2. Save this script as `avalon-dev.js` in the repository root. It is the boot call from Connect a miner, pointed at
   `127.0.0.1`:

   ```js
   'use strict'

   const os = require('os')
   const path = require('path')
   const { getKernel } = require('@tetherto/mdk-core')
   const { WorkerRuntimeV2 } = require('@tetherto/mdk-worker')

   const main = async () => {
     const kernel = await getKernel({ handleSignals: true })

     const runtime = new WorkerRuntimeV2(path.dirname(require.resolve('@tetherto/mdk-worker-avalon/package.json')), {
       workerId: 'avalon-dev',
       storeDir: path.join(os.tmpdir(), 'mdk-dev', 'avalon'),
       allowedKeys: [kernel.getClientPublicKey()],
       devices: [{ deviceId: 'AV-DEV-001', config: { address: '127.0.0.1', port: 4028, password: 'admin' } }]
     })
     await runtime.start()
     await kernel.registerWorker(runtime.getPublicKey())
     kernel._cleanup.push(() => runtime.stop()) // Ctrl+C stops the Worker before the Kernel

     console.log('Kernel HRPC key:', kernel.getPublicKey().toString('hex'))
     console.log('Ctrl+C to stop.')
   }

   main().catch((err) => { console.error(err); process.exit(1) })
   ```

3. Run the script in a second terminal:

   ```bash
   node avalon-dev.js
   ```

Expected output, with your own key:

```text
Kernel HRPC key: a4303ca6404442264fda55e37a35db3400eeab1a4b4b68f9e1413fff99f9521e
Ctrl+C to stop.
```

Ctrl+C stops the Worker, then the Kernel: the script opts into signal handling and chains the Worker's `stop`, so a
second run starts without a lock error. [Stop the services cleanly][teardown] covers the contract.

Either way, the Kernel then pulls live telemetry (hashrate, power, temperature) from the mock through the Worker. The
mock's options are in [USAGE.md][avalon-usage].

</details>

</Step>

<Step>

### Connect a miner

#### 2.1 Confirm the model

Avalon ships one model family today, `a1346` — confirm this against the [USAGE.md][avalon-usage] as new models are added.

#### 2.2 Declare your miner

Avalon devices use the native CGMiner TCP API on port 4028. Reads over the API need no credentials, but the Avalon Worker Plugin's
own validation refuses to load a device with no `password` (`ERR_DEVICE_CONFIG_INVALID`).

> [!WARNING]
> `setupPools` sends no device credentials, so the miner rejects the pool change, keeps its pools, and reboots. With a `pools`
> parameter the command returns `success: false`; without one it still returns `success: true`.

Point the `mdk.yaml` entry at the real miner and drop `mock`:

```yaml
spec:
  workers:
    - name: avalon
      package: '@tetherto/mdk-worker-avalon'
      config:
        devices:
          - id: AV-001
            opts: { address: 192.168.1.30, port: 4028, password: admin }
```

Without `mdk run`, add this to the Node.js service or script that hosts the Worker. The snippet seeds one Avalon
device; replace the example IP address and password with your miner's values:

```js
const path = require('path')
const { getKernel } = require('@tetherto/mdk-core')
const { WorkerRuntimeV2 } = require('@tetherto/mdk-worker')

const main = async () => {
  const kernel = await getKernel()

  const runtime = new WorkerRuntimeV2(path.dirname(require.resolve('@tetherto/mdk-worker-avalon/package.json')), {
    workerId: 'avalon-rack-1',
    storeDir: './store/avalon-rack-1',
    allowedKeys: [kernel.getClientPublicKey()],
    devices: [{ deviceId: 'AV-001', config: { address: '192.168.1.30', port: 4028, password: 'admin' } }]
  })
  await runtime.start()
  await kernel.registerWorker(runtime.getPublicKey())
}

main().catch((err) => { console.error(err); process.exit(1) })
```

`allowedKeys` lists the RPC callers the Worker accepts. The Worker refuses to start without it
(`ERR_WORKER_ALLOWED_KEYS_REQUIRED`), so pass the Kernel's client key.

> [!WARNING]
> Make sure each miner's IP is reachable from the machine or container running the Worker before registering. Commands act on physical hardware — prioritize thermal safety.

> [!IMPORTANT]
> The device list is fixed at construction — there is no `registerThing`/`updateThing`/`forgetThings` equivalent.
> Adding, updating, or removing a miner means editing the device list and restarting the Worker.

The full device option reference and the mock `createServer` options are in the Worker's [USAGE.md][avalon-usage]
and the shared [install pattern][install-pattern].

</Step>

</Steps>

## Troubleshooting

An unreachable miner doesn't fail at load time: the Worker reports the device online and the failure surfaces as
`ERR_MINER_UNREACHABLE` inside the telemetry channel or command response that touched the network. If the Worker
doesn't come up, or a mock port is already in use, follow [miner troubleshooting][miner-troubleshooting].

## Next steps

- Decide how to run the Worker service — [Deployment topologies][deployment-topologies]
- Review telemetry units, command shapes, and error codes — [`mdk-contract.json`][avalon-contract]

## Links

[teardown]: ../gateway/teardown.md
<!-- docs@tether.io: teardown → guides/gateway/teardown -->

[miner-guide-assumptions]: index.md#prerequisites
<!-- docs@tether.io: miner-guide-assumptions → guides/miners#prerequisites -->

[avalon-usage]: ../../../backend/workers/miners/avalon/USAGE.md
<!-- docs@tether.io: avalon-usage → https://github.com/tetherto/mdk/blob/main/backend/workers/miners/avalon/USAGE.md -->

[install-pattern]: ../../../backend/workers/docs/install-pattern.md
<!-- docs@tether.io: install-pattern → https://github.com/tetherto/mdk/blob/main/backend/workers/docs/install-pattern.md -->

[deployment-topologies]: ../../concepts/deployment-topologies.md
<!-- docs@tether.io: deployment-topologies → https://github.com/tetherto/mdk/blob/main/docs/concepts/deployment-topologies.md -->

[avalon-contract]: ../../../backend/workers/miners/avalon/mdk-contract.json
<!-- docs@tether.io: avalon-contract → https://github.com/tetherto/mdk/blob/main/backend/workers/miners/avalon/mdk-contract.json -->

[worker-runtime-v2]: ../../../backend/core/mdk-worker/lib/worker-runtime-v2.js
<!-- docs@tether.io: worker-runtime-v2 → https://github.com/tetherto/mdk/blob/main/backend/core/mdk-worker/lib/worker-runtime-v2.js -->

[miner-troubleshooting]: troubleshooting.md
<!-- docs@tether.io: miner-troubleshooting → guides/miners/troubleshooting -->
