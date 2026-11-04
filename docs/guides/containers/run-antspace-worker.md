---
title: Run an Antspace Worker
description: Start an MDK Worker for a Bitmain Antspace container (HK3, immersion) against a mock or a real container
docs@tether_slug: guides/containers/run-antspace-worker
---

## Overview

This page details how to run the Bitmain Antspace container Worker. Select the development (mock) or real-container path.

## Prerequisites

- Review the [common deployment prerequisites][container-guide-assumptions] before you start

Deployment-specific requirements:

- A Node.js service or script in your deployment that runs the MDK Worker and registers containers, run from a clone of
  the MDK repository after `npm install` at its root. `@tetherto/mdk-worker-antspace` is not published to npm, so
  `require('@tetherto/mdk-worker-antspace')` resolves only through the repository's workspace
- A supported Antspace container reachable from the machine or container running the Worker over its REST HTTP API, typically port `8000`

<Steps>

<Step>

### Development

<details>
<summary>Run against a mock</summary>

The Antspace Worker ships a mock container that answers its HTTP API with canned data. Run the mock in one terminal and
the Worker in a second, both from the repository root.

1. Start a mock HK3 container:

   ```bash
   npm run mock hk3 18001
   ```

2. Save this script as `antspace-dev.js` in the repository root. It is the boot call from Connect a container, pointed
   at `127.0.0.1`:

   ```js
   'use strict'

   const os = require('os')
   const path = require('path')
   const { getKernel } = require('@tetherto/mdk-core')
   const { startAntspaceWorker } = require('@tetherto/mdk-worker-antspace')

   const main = async () => {
     const kernel = await getKernel({ handleSignals: true })

     const worker = await startAntspaceWorker({
       workerId: 'antspace-dev',
       model: 'hk3',
       storeDir: path.join(os.tmpdir(), 'mdk-dev', 'antspace'),
       allowedKeys: [kernel.getClientPublicKey()],
       seedDevices: [{
         info: { serialNum: 'HK3-DEV', container: 'dev' },
         opts: { address: '127.0.0.1', port: 18001 }
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
   node antspace-dev.js
   ```

Expected output, with your own key and device ID:

```text
Kernel HRPC key: de61f30cd7bd65923d9c8089e4fa684335a37371600e1610823a4fc20aba0247
Device: 183ded12-bf17-4b40-9970-5c535fd79916
Ctrl+C to stop.
```

Ctrl+C stops the Worker, then the Kernel: the script opts into signal handling and chains the Worker's `stop`, so a
second run starts without a lock error. [Stop the services cleanly][teardown] covers the contract.

The Kernel then pulls live telemetry (temperatures, cooling status, power) from the mock through the Worker. The mock's
model and port options are in [the Antspace README][antspace-readme].

</details>

</Step>

<Step>

### Connect a container

#### 2.1 Pick your model

Use [the Antspace README][antspace-readme] to confirm the `model` value for your container: `hk3` or `immersion`. This guide uses `hk3`, replace it with the value for your container.

#### 2.2 Register your container

Add this code to the Node.js service or script that runs the MDK Worker in your deployment. The snippet shows the minimum boot call seeding one Antspace container, replace the example address and credentials with your container's values:

```js
const { getKernel } = require('@tetherto/mdk-core')
const { startAntspaceWorker } = require('@tetherto/mdk-worker-antspace')

const kernel = await getKernel()

const worker = await startAntspaceWorker({
  workerId: 'antspace-rack-1',
  model: 'hk3',
  storeDir: './store/antspace-rack-1',
  allowedKeys: [kernel.getClientPublicKey()],
  seedDevices: [{
    info: { serialNum: 'HK3-A', container: 'container-A', location: 'site-a-01.container' },
    opts: { address: '192.168.1.100', port: 18001 }
  }]
})
await kernel.registerWorker(worker.runtime.getPublicKey())
```

`allowedKeys` lists the RPC callers the Worker accepts. The Worker refuses to start without it
(`ERR_WORKER_ALLOWED_KEYS_REQUIRED`), so pass the Kernel's client key.

> [!WARNING]
> Make sure each container's address is reachable from the machine or container running the Worker before registering. Commands affect live cooling for racks of miners, prioritize thermal safety.

`seedDevices` only seeds a fresh, empty `storeDir`, once persisted, the device set survives restarts on its own. To add a container to an
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
    authPerms: ['container:w'],
    params: [{
      workerId: 'antspace-rack-1',
      id: 'HK3-B',
      info: { serialNum: 'HK3-B', container: 'container-A' },
      opts: { address: '192.168.1.101', port: 18001 }
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
> `registerThing` persists the container config immediately, but the running Worker does not pick it up until it is stopped and restarted (`await worker.stop()`, then call `startAntspaceWorker` again with the same `storeDir` and no `seedDevices`), there is no hot-add.

For the full `seedDevices` and `registerThing` option reference, the telemetry and command tables, and the shared install pattern, see [the Antspace README][antspace-readme] and [install pattern][install-pattern].

</Step>

</Steps>

## Troubleshooting

A working development run of `antspace-dev.js` prints the Kernel HRPC key and the registered device ID, then stays
running until Ctrl+C.

If it does not print those values, or if `npm run mock` reports port `18001` already in use, the network and port checks in [miner troubleshooting][miner-troubleshooting] apply here too, the underlying HRPC and DHT requirements are the same across every Worker.

## Next steps

- Decide how to run the Worker service, [Deployment topologies][deployment-topologies]
- Review telemetry units, command shapes, and error codes, [the Antspace README][antspace-readme]

## Links

[teardown]: ../gateway/teardown.md
<!-- docs@tether.io: teardown → guides/gateway/teardown -->

[container-guide-assumptions]: index.md#prerequisites
<!-- docs@tether.io: container-guide-assumptions → guides/containers#prerequisites -->

[antspace-readme]: ../../../backend/workers/containers/antspace/README.md
<!-- docs@tether.io: antspace-readme → https://github.com/tetherto/mdk/blob/main/backend/workers/containers/antspace/README.md -->

[install-pattern]: ../../../backend/workers/docs/install-pattern.md
<!-- docs@tether.io: install-pattern → https://github.com/tetherto/mdk/blob/main/backend/workers/docs/install-pattern.md -->

[deployment-topologies]: ../../concepts/deployment-topologies.md
<!-- docs@tether.io: deployment-topologies → https://github.com/tetherto/mdk/blob/main/docs/concepts/deployment-topologies.md -->

[miner-troubleshooting]: ../miners/troubleshooting.md
<!-- docs@tether.io: miner-troubleshooting → guides/miners/troubleshooting -->

[provisioning-rules]: ../security/index.md#provisioning-a-device
<!-- docs@tether.io: provisioning-rules → guides/security#provisioning-a-device -->
