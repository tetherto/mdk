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

- A Node.js service or script in your deployment that runs the MDK Worker and registers devices, run from a clone of
  the MDK repository after `npm install` at its root. `@tetherto/mdk-worker-avalon` is not published to npm, so
  `require('@tetherto/mdk-worker-avalon')` resolves only through the repository's workspace
- A supported Avalon device reachable from the machine or container running the Worker
- The miner API reachable over the native CGMiner TCP API, typically port `4028`
- A `password` for each device: reads need no credentials, but write commands such as a pool change send it, and the Worker
  refuses to open a device without one, which stays offline with `ERR_DEVICE_CONFIG_INVALID`

<Steps>

<Step>

### Development

<details>
<summary>Run against a mock</summary>

The Avalon Worker ships a mock A1346 that answers the CGMiner API with canned data. Run the mock in one terminal and the
Worker in a second, both from the repository root.

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
   const { startAvalonWorker } = require('@tetherto/mdk-worker-avalon')

   const main = async () => {
     const kernel = await getKernel({ handleSignals: true })

     const worker = await startAvalonWorker({
       workerId: 'avalon-dev',
       model: 'a1346',
       storeDir: path.join(os.tmpdir(), 'mdk-dev', 'avalon'),
       allowedKeys: [kernel.getClientPublicKey()],
       seedDevices: [{
         info: { container: 'dev', serialNum: 'AV-DEV-001' },
         opts: { address: '127.0.0.1', port: 4028, password: 'admin' }
       }]
     })
     await kernel.registerWorker(worker.runtime.getPublicKey())
     kernel._cleanup.push(worker.stop) // Ctrl+C stops the Worker before the Kernel

     console.log('Kernel HRPC key:', kernel.getPublicKey().toString('hex'))
     console.log('Device:', worker.services.provisioning.listDeviceIds()[0])
     console.log('Ctrl+C to stop.')
   }

   main().catch((err) => { console.error(err); process.exit(1) })
   ```

3. Run the script in a second terminal:

   ```bash
   node avalon-dev.js
   ```

Expected output, with your own key and device ID:

```text
Kernel HRPC key: e9c1f37dc46f5a6a08fcd6d75a697477491e82b9282d9f2d72bee2ab584d0c70
Device: 17aad636-6ebb-4cb0-8865-c7a200625dfe
Ctrl+C to stop.
```

Ctrl+C stops the Worker, then the Kernel: the script opts into signal handling and chains the Worker's `stop`, so a
second run starts without a lock error. [Stop the services cleanly][teardown] covers the contract.

The Kernel then pulls live telemetry (hashrate, power, temperature) from the mock through the Worker. The mock's
options are in [USAGE.md][avalon-usage].

</details>

</Step>

<Step>

### Connect a miner

#### 2.1 Confirm the model

Avalon ships one model family today, `a1346` — confirm this against the [USAGE.md][avalon-usage] as new models are added.

#### 2.2 Register your miner

Avalon devices use the native CGMiner TCP API on port 4028. Reads need no credentials, but write commands such as a pool
change send the device password, and the Avalon Worker Plugin refuses to open a device registered with no `password`: it
stays offline with `ERR_DEVICE_CONFIG_INVALID`. Add this code to the Node.js service or script that runs the MDK Worker in your
deployment. The snippet shows the minimum boot call seeding one Avalon device; replace the example IP address and
password with your miner's values:

```js
const { getKernel } = require('@tetherto/mdk-core')
const { startAvalonWorker } = require('@tetherto/mdk-worker-avalon')

const main = async () => {
  const kernel = await getKernel()

  const worker = await startAvalonWorker({
    workerId: 'avalon-rack-1',
    model: 'a1346',
    storeDir: './store/avalon-rack-1',
    allowedKeys: [kernel.getClientPublicKey()],
    seedDevices: [{
      info: { container: 'site-1', serialNum: 'AV-001' },
      opts: { address: '192.168.1.30', port: 4028, password: 'admin' }
    }]
  })
  await kernel.registerWorker(worker.runtime.getPublicKey())
}

main().catch((err) => { console.error(err); process.exit(1) })
```

`allowedKeys` lists the RPC callers the Worker accepts. The Worker refuses to start without it
(`ERR_WORKER_ALLOWED_KEYS_REQUIRED`), so pass the Kernel's client key.

> [!WARNING]
> Make sure each miner's IP is reachable from the machine or container running the Worker before registering. Commands act on physical hardware — prioritize thermal safety.

`seedDevices` only seeds a fresh, empty `storeDir` — once persisted, the device set survives restarts on its own. To add a device to an
already-running fleet, push a `registerThing` write action through the Kernel instead. The Kernel routes it to the Worker named in
`params[0].workerId` and runs it once the action has the approvals that Worker requires. `kernel` is the handle the boot
script holds; from another process, pass the Kernel's public key instead:

```js
const { createMdkClient } = require('@tetherto/mdk-client')
const { name, privateKeyPem } = require('./.mdk/credentials/agents/provisioner.json')

const main = async () => {
  const client = createMdkClient({
    kernelKey: kernel.getPublicKey(),
    kernelCredential: { name, privateKey: privateKeyPem }
  })
  await client.connect()
  await client.pushAction({
    query: {},
    action: 'registerThing',
    voter: 'provisioner',
    authPerms: ['miner:w'],
    params: [{
      workerId: 'avalon-rack-1',
      id: 'AV-002',
      info: { container: 'site-1', serialNum: 'AV-002' },
      opts: { address: '192.168.1.31', port: 4028, password: 'admin' }
    }]
  })
}

main().catch((err) => { console.error(err); process.exit(1) })
```

`registerThing` is a write action, so the Kernel evaluates it against `spec.rbac` before any Worker sees it.
`mdk sa add provisioner` writes the credential this reads, and the account needs `actions: write` to push, plus
`devices: write`. [Provisioning a device][provisioning-rules] covers how to scope that grant and why a successful push
is not yet a live device.


> [!IMPORTANT]
> `registerThing` persists the device config immediately, but the running Worker does not pick it up until it is stopped and restarted (`await worker.stop()`, then call `startAvalonWorker` again with the same `storeDir` and no `seedDevices`) — there is no hot-add.

For the full `seedDevices`/`registerThing` option reference and the mock `createServer` options, see the Worker's [USAGE.md][avalon-usage] and the shared [install pattern][install-pattern].

</Step>

</Steps>

## Troubleshooting

A working development run of `avalon-dev.js` prints `Kernel HRPC key:` and `Device:`, then stays running until Ctrl+C.

If the script does not print both values, or if `npm run mock` reports port `4028` already in use, follow
[miner troubleshooting][miner-troubleshooting].

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

[avalon-contract]: ../../../backend/workers/miners/avalon/plugin/mdk-contract.json
<!-- docs@tether.io: avalon-contract → https://github.com/tetherto/mdk/blob/main/backend/workers/miners/avalon/plugin/mdk-contract.json -->

[miner-troubleshooting]: troubleshooting.md
<!-- docs@tether.io: miner-troubleshooting → guides/miners/troubleshooting -->

[provisioning-rules]: ../security/index.md#provisioning-a-device
<!-- docs@tether.io: provisioning-rules → guides/security#provisioning-a-device -->
