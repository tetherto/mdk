---
title: Run a Bitdeer Worker
description: Start an MDK Worker for a Bitdeer D40 immersion container (A1346, M30, M56, S19XP) against a mock or a real container
docs@tether_slug: guides/containers/run-bitdeer-worker
---

## Overview

This page details how to run the Bitdeer D40 container Worker. Select the development (mock) or real-container path.

The Bitdeer D40 speaks MQTT, and the Worker embeds the broker (one per Worker process) that a container publishes into, rather than the Worker connecting out to the container. Device specs are keyed by `containerId`, not by an address and port.

## Prerequisites

- Review the [common deployment prerequisites][container-guide-assumptions] before you start

Deployment-specific requirements:

- A Node.js service or script in your deployment that runs the MDK Worker and registers containers, run from a clone of
  the MDK repository after `npm install` at its root. `@tetherto/mdk-worker-bitdeer` is not published to npm, so
  `require('@tetherto/mdk-worker-bitdeer')` resolves only through the repository's workspace
- A supported D40 container configured to publish into the Worker's embedded MQTT broker, reachable on that broker's port (default `10883`)
- An MQTT username and password for each container that supports MQTT login, for the [broker login](#22-register-your-container)

<Steps>

<Step>

### Development

<details>
<summary>Run against a mock</summary>

The Bitdeer Worker ships a mock D40 container that publishes canned telemetry as an MQTT client. The Worker hosts the
broker, so start the Worker first and the mock second, both from the repository root.

1. Save this script as `bitdeer-dev.js` in the repository root. It is the boot call from Connect a container, with the
   container ID the mock publishes under:

   ```js
   'use strict'

   const os = require('os')
   const path = require('path')
   const { getKernel } = require('@tetherto/mdk-core')
   const { startBitdeerWorker } = require('@tetherto/mdk-worker-bitdeer')

   const main = async () => {
     const kernel = await getKernel({ handleSignals: true })

     const worker = await startBitdeerWorker({
       workerId: 'bitdeer-dev',
       model: 'm56',
       storeDir: path.join(os.tmpdir(), 'mdk-dev', 'bitdeer'),
       mqttPort: 10883,
       allowedKeys: [kernel.getClientPublicKey()],
       seedDevices: [{
         info: { serialNum: 'D40-DEV', container: 'dev' },
         opts: { containerId: 'D40-DEV' }
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

2. Run the script:

   ```bash
   node bitdeer-dev.js
   ```

3. Once it prints `Device:`, start a mock D40 M56 in a second terminal, pointed at the Worker's broker port and using the
   same container ID:

   ```bash
   npm run mock d40_m56 -- --port 10883 --id D40-DEV
   ```

Expected output from `bitdeer-dev.js`, with your own key and device ID:

```text
Kernel HRPC key: a94550e7f07fc2a1ebe38aa1cd482664c164d1d751f6470966611cdc40c65906
Device: 815d7e65-39a4-4d13-938c-ebafb3b730e5
Ctrl+C to stop.
```

Ctrl+C stops the Worker, then the Kernel: the script opts into signal handling and chains the Worker's `stop`, so a
second run starts without a lock error. [Stop the services cleanly][teardown] covers the contract.

Once the mock connects, the Kernel pulls live telemetry (container power, temperature, per-phase data) through the
Worker. The mock's model and container ID options are in [the Bitdeer README][bitdeer-readme].

</details>

</Step>

<Step>

### Connect a container

#### 2.1 Pick your model

Use [the Bitdeer README][bitdeer-readme] to confirm the `model` value for your D40 variant: `a1346`, `m30`, `m56`, or `s19xp`. This guide uses `m56`, replace it with the value for your container.

#### 2.2 Register your container

Add this code to the Node.js service or script that runs the MDK Worker in your deployment. The snippet shows the minimum boot call seeding one D40 container, replace the example container ID with your container's value:

```js
const { getKernel } = require('@tetherto/mdk-core')
const { startBitdeerWorker } = require('@tetherto/mdk-worker-bitdeer')

const kernel = await getKernel()

const worker = await startBitdeerWorker({
  workerId: 'bitdeer-rack-1',
  model: 'm56',
  storeDir: './store/bitdeer-rack-1',
  mqttPort: 10883,
  mqttHost: '10.0.20.5', // the Worker's address on the container network
  mqttCredentials: {
    'D40-M56-001': { username: 'd40-m56-001', password: process.env.D40_M56_001_MQTT_PASSWORD }
  },
  allowedKeys: [kernel.getClientPublicKey()],
  seedDevices: [{
    info: { serialNum: 'D40-M56-001', container: 'container-A' },
    opts: { containerId: 'D40-M56-001' }
  }]
})
await kernel.registerWorker(worker.runtime.getPublicKey())
```

`allowedKeys` lists the RPC callers the Worker accepts. The Worker refuses to start without it
(`ERR_WORKER_ALLOWED_KEYS_REQUIRED`), so pass the Kernel's client key.

The broker is a network service the containers connect to, so secure it like one:

- `mqttCredentials` gives each container its own MQTT login; a client's login decides which container it speaks for. Configure
  the same username and password on the container
- `mqttHost` binds the broker to one interface. The default, `0.0.0.0`, listens on every interface
- `mqttTls` serves MQTTS (`tls.createServer` options) where the containers support it

> [!WARNING]
> Without `mqttCredentials`, the broker accepts anonymous clients on every interface. Any host that reaches the broker port
> can connect as a registered container that has not connected yet and send that container's telemetry. The broker refuses
> publishes to command topics and confines each client to one container; the [Bitdeer README][bitdeer-readme-protocol] lists
> what a client may and may not do. The Worker prints a warning at start when it serves a non-loopback `mqttHost` without
> `mqttCredentials`. Keep the broker port off every network but the container network.

> [!WARNING]
> Make sure the container is configured to publish into this Worker's broker port before registering. Commands act on
> physical cooling and power hardware, prioritize thermal safety.

`seedDevices` only seeds a fresh, empty `storeDir`, once persisted, the device set survives restarts on its own.
To add a container to an already-running fleet, push a `registerThing` write action through the Kernel instead. The Kernel routes it to the Worker
named in `params[0].workerId` and runs it once the action has the approvals that Worker requires. `kernel` is the handle
the boot script holds; from another process, pass the Kernel's public key instead:

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
      workerId: 'bitdeer-rack-1',
      id: 'D40-M56-002',
      info: { serialNum: 'D40-M56-002', container: 'container-A' },
      opts: { containerId: 'D40-M56-002' }
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
> `registerThing` persists the container config immediately, but the running Worker does not pick it up until it is stopped
> and restarted (`await worker.stop()`, then call `startBitdeerWorker` again with the same `storeDir` and no `seedDevices`),
> there is no hot-add.

For the full `seedDevices` and `registerThing` option reference, the telemetry and command tables, and the shared install pattern, see [the Bitdeer README][bitdeer-readme] and [install pattern][install-pattern].

</Step>

</Steps>

## Troubleshooting

A working development run of `bitdeer-dev.js` prints the Kernel HRPC key and the registered device ID, then stays
running until Ctrl+C. Start the mock only after that: it is an MQTT client and needs the Worker's broker up on `10883`.

If the script does not print those values, or if broker port `10883` is already in use, the network and port checks in [miner troubleshooting][miner-troubleshooting] apply here too, the underlying HRPC and DHT requirements are the same across every Worker.

## Next steps

- Decide  your [deployment topology][deployment-topologies] to run the Worker service
- [Review telemetry units, command shapes, and error codes][bitdeer-readme]

## Links

[teardown]: ../gateway/teardown.md
<!-- docs@tether.io: teardown → guides/gateway/teardown -->

[container-guide-assumptions]: index.md#prerequisites
<!-- docs@tether.io: container-guide-assumptions → guides/containers#prerequisites -->

[bitdeer-readme-protocol]: ../../../backend/workers/containers/bitdeer/README.md#protocol
<!-- docs@tether.io: bitdeer-readme-protocol → https://github.com/tetherto/mdk/blob/main/backend/workers/containers/bitdeer/README.md#protocol -->

[bitdeer-readme]: ../../../backend/workers/containers/bitdeer/README.md
<!-- docs@tether.io: bitdeer-readme → https://github.com/tetherto/mdk/blob/main/backend/workers/containers/bitdeer/README.md -->

[install-pattern]: ../../../backend/workers/docs/install-pattern.md
<!-- docs@tether.io: install-pattern → https://github.com/tetherto/mdk/blob/main/backend/workers/docs/install-pattern.md -->

[deployment-topologies]: ../../concepts/deployment-topologies.md
<!-- docs@tether.io: deployment-topologies → https://github.com/tetherto/mdk/blob/main/docs/concepts/deployment-topologies.md -->

[miner-troubleshooting]: ../miners/troubleshooting.md
<!-- docs@tether.io: miner-troubleshooting → guides/miners/troubleshooting -->

[provisioning-rules]: ../security/index.md#provisioning-a-device
<!-- docs@tether.io: provisioning-rules → guides/security#provisioning-a-device -->
