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

2. Save this script as `antspace-dev.js` in the repository root. It starts the same Worker as Connect a container,
   pointed at `127.0.0.1` and without the provisioner account, policy and caller key that `registerThing` needs:

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

Add this code to the Node.js service or script that runs the MDK Worker in your deployment. Run `mdk sa add provisioner` in your project directory first: it writes the credential the boot script reads, so
the `registerThing` step below can push to this Kernel. The snippet shows the minimum boot call seeding one Antspace container, replace the example address and credentials with your container's values:

```js
const { getKernel } = require('@tetherto/mdk-core')
const { startAntspaceWorker } = require('@tetherto/mdk-worker-antspace')
const { callerKeyPair } = require('@tetherto/mdk-core/lib/local-discovery')
const provisioner = require('./.mdk/credentials/agents/provisioner.json')

const main = async () => {
  // The Kernel's complete policy and account list: merge these into the Kernel's existing ones
  const kernel = await getKernel({
    rbac: {
      enforcement: 'deny',
      roles: [{
        name: 'provisioning',
        rules: [{ resources: ['actions', 'devices'], verbs: ['read', 'write'] }]
      }],
      bindings: [{ role: 'provisioning', subjects: [{ kind: 'ServiceAccount', name: 'provisioner' }] }]
    },
    serviceAccounts: [{ name: provisioner.name, publicKey: provisioner.publicKey }]
  })
  kernel.allowKey(callerKeyPair('./.mdk/provisioner-caller').publicKey)

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
  console.log('Kernel HRPC key:', kernel.getPublicKey().toString('hex'))
}

main().catch((err) => { console.error(err); process.exit(1) })
```

> [!WARNING]
> `rbac` and `serviceAccounts` are the Kernel's complete policy and service-account list, applied at every start: the
> policy replaces the stored one, and any service account not listed is removed. Users stay but lose their bindings. On a
> Kernel that already has a policy, users or accounts, merge the `provisioning` role, binding and account into the ones
> it already has, or everyone else loses access. The [`getKernel` options][getkernel-options] define both.

`allowedKeys` lists the RPC callers the Worker accepts. The Worker refuses to start without it
(`ERR_WORKER_ALLOWED_KEYS_REQUIRED`), so pass the Kernel's client key.

> [!WARNING]
> Make sure each container's address is reachable from the machine or container running the Worker before registering. Commands affect live cooling for racks of miners, prioritize thermal safety.

`seedDevices` only seeds a fresh, empty `storeDir`, once persisted, the device set survives restarts on its own. To add a container to an
already-running fleet, push a `registerThing` write action through the Kernel instead. The Kernel routes it to the Worker named in
`params[0].workerId` and runs it once the action has the approvals that Worker requires. `registerThing` needs one
approval. `resetCoolingSystem` and `setLiquidSupplyTemperature` need two: a different signed-in identity, holding
`actions: vote` and `devices: write` on the affected devices, casts the second with `voteAction` (see
[Provisioning a device][provisioning-rules]). This runs in its own
process. Run both scripts from the same project directory and pass the Kernel's public key as hex, as printed by the boot
script. The boot script admits the provisioner's persistent dialing key. The action script uses that same key and signs in
with the provisioner's service-account credential.

```js
const { setTimeout: delay } = require('node:timers/promises')
const { createMdkClient } = require('@tetherto/mdk-client')
const { callerKeyPair } = require('@tetherto/mdk-core/lib/local-discovery')
const { name, privateKeyPem } = require('./.mdk/credentials/agents/provisioner.json')

const main = async () => {
  const kernelKeyPair = callerKeyPair('./.mdk/provisioner-caller')

  const client = createMdkClient({
    kernelKey: '<kernel-public-key-hex>',
    kernelKeyPair,
    kernelCredential: { name, privateKey: privateKeyPem }
  })
  try {
    await client.connect()
    const res = await client.pushAction({
      query: {},
      action: 'registerThing',
      voter: 'provisioner',
      params: [{
        workerId: 'antspace-rack-1',
        id: 'HK3-B',
        info: { serialNum: 'HK3-B', container: 'container-A' },
        opts: { address: '192.168.1.101', port: 18001 }
      }]
    })
    if (!res.id) throw new Error(res.error || res.errors?.join(', ') || 'The Kernel returned no action ID')
    console.log('Action:', res.id, res.data.status)
    if (res.data.status !== 'APPROVED') return

    const deadline = Date.now() + 120_000
    let commandId
    while (Date.now() < deadline) {
      if (!commandId) {
        const done = await client.getAction({ id: res.id, type: 'done' }, { timeout: 5000 })
        if (done.error && done.error !== 'ERR_ACTION_ID_NOT_FOUND') throw new Error(done.error)
        if (!done.error) {
          const call = done.targets?.['antspace-rack-1']?.calls?.[0]
          if (done.status !== 'COMPLETED' || !call?.commandId) {
            throw new Error(call?.error || `Action ${res.id} ended with ${done.status} without a command ID`)
          }
          commandId = call.commandId
        }
      }

      if (commandId) {
        const command = await client.getCommandStatus(commandId, { timeout: 5000 })
        if (command.status === 'SUCCESS') {
          console.log('Registration succeeded:', commandId)
          return
        }
        if (command.error || ['FAILED', 'TIMEOUT', 'REJECTED'].includes(command.status)) {
          throw new Error(command.error || `Command ${commandId} ended with ${command.status}`)
        }
      }
      await delay(1000)
    }
    throw new Error(`Timed out waiting for action ${res.id}${commandId ? ` (command ${commandId})` : ''}`)
  } finally {
    await client.close()
  }
}

main().catch((err) => { console.error(err); process.exit(1) })
```

The boot script grants the provisioner `actions: write` and `devices: write` to push the action, plus
`actions: read` and `devices: read` to check its outcome. [Provisioning a device][provisioning-rules] covers how to scope
those grants.

The Kernel checks approved actions every 30 seconds by default. The script waits for the action to finish dispatching,
then checks the Worker's command result. If the action is still voting, use the printed action ID to check it after the
required approvals. Restart the Worker after the command reaches `SUCCESS` and confirm the new device appears in
`worker.services.provisioning.listDeviceIds()`.

The Worker checks `opts.address` before it registers the device. It refuses a loopback, unspecified, link-local, multicast,
broadcast or cloud metadata address, a hostname resolving to one, or a name such as `localhost`, with
`ERR_THING_ADDRESS_FORBIDDEN`. Unless the Worker's `conf.allowDuplicateIPs` is `true`, it refuses an address another of its
devices holds with `ERR_THING_IP_ADDRESS_EXISTS`. The [device address policy][address-policy] covers replacing those
defaults with a CIDR allowlist in `conf.thing.allowedAddressCidrs`.


> [!IMPORTANT]
> A successful `registerThing` command persists the container config, but the running Worker does not pick it up until it is stopped and restarted (`await worker.stop()`, then call `startAntspaceWorker` again with the same `storeDir` and no `seedDevices`), there is no hot-add.

For the full `seedDevices` and `registerThing` option reference, the telemetry and command tables, and the shared install pattern, see [the Antspace README][antspace-readme] and [install pattern][install-pattern].

</Step>

</Steps>

## Troubleshooting

A working development run of `antspace-dev.js` prints the Kernel HRPC key and the registered device ID, then stays
running until Ctrl+C.

If it does not print those values, or if `npm run mock` reports port `18001` already in use, the network and port checks in [miner troubleshooting][miner-troubleshooting] apply here too, the underlying HRPC and DHT requirements are the same across every Worker.

If you replace a Worker after deleting its `storeDir`, the Kernel may still hold its old key or device bindings. An
authorized client can call `terminateWorker(oldWorkerId)` to release those bindings before registering the replacement.
See [Worker bindings][worker-bindings].

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

[worker-bindings]: ../../../backend/core/kernel/README.md#worker-bindings
<!-- docs@tether.io: worker-bindings → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md#worker-bindings -->

[provisioning-rules]: ../security/index.md#provisioning-a-device
<!-- docs@tether.io: provisioning-rules → guides/security#provisioning-a-device -->

[getkernel-options]: ../../../backend/core/mdk/README.md#getkernelopts--promisekernelmanager
<!-- docs@tether.io: getkernel-options → https://github.com/tetherto/mdk/blob/main/backend/core/mdk/README.md#getkernelopts--promisekernelmanager -->

[address-policy]: ../../../backend/core/mdk/README.md#device-data-and-caller-input
<!-- docs@tether.io: address-policy → https://github.com/tetherto/mdk/blob/main/backend/core/mdk/README.md#device-data-and-caller-input -->
