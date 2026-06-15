---
title: Run an Antminer worker
description: Start an MDK worker for a Bitmain Antminer (S19 XP, S19 XP Hydro, S21, S21 Pro) against a mock or a real device
docs@tether_slug: how-to/miners/run-antminer-worker
---

## Overview

This page details how to run the Bitmain Antminer worker. Select the development (mock) or real-device path.

## Prerequisites

Review the [common deployment prerequisites][miner-guide-assumptions] before you start.

Deployment-specific requirements:

- A Node.js service or script in your deployment that runs the MDK worker and registers devices
- A supported Antminer device reachable from the machine or container running the worker
- The miner API reachable over HTTP, typically port `80`
- Digest-auth credentials for the miner. Antminer devices commonly default to username `root` and password `root`, but use your site's configured credentials

## Development

<details>
<summary>Run against a mock</summary>

To support development, each model ships a runnable example that starts an ORK, boots a mock device, and registers it. This guide uses the S21 example:

```bash
node backend/workers/miners/antminer/examples/run-s21.js
```

It prints the ORK HRPC key and the registered device ID, then stays running until Ctrl+C. To run another model, use the matching example listed in [USAGE.md][antminer-runnable-examples].

</details>

## Connect a miner

### Pick your model

Use the Antminer worker's [USAGE.md][antminer-usage] to choose the manager class and mock example for your model. This guide uses `AM_S21` and `run-s21.js` as the example; replace them with the values for your miner.

### Register your miner

Antminer devices use an HTTP API with digest authentication. Add this code to the Node.js service or script that runs the MDK worker in your deployment. The snippet shows the minimum `registerThing` call for one Antminer device; replace the example IP address and credentials with your miner's values:

```js
const { getOrk, startWorker } = require('@tetherto/mdk')
const { AM_S21 } = require('@tetherto/miner-antminer')

const ork = await getOrk()
const { manager } = await startWorker(AM_S21, { ork })

await manager.registerThing({
  info: { container: 'site-1', serialNum: 'AM-001' },
  opts: { address: '192.168.1.20', port: 80, username: 'root', password: 'root' }
})
```

> [!WARNING]
> Make sure each miner's IP is reachable from the machine or container running the worker before registering. Commands act on physical hardware — prioritize thermal safety.

Before running in a deployment, generate the worker config (`common.json` for worker identity, `base.thing.json` for device defaults and per-model alert thresholds):

```bash
cd backend/workers/miners/antminer
./setup-config.sh
```

For the full `registerThing` option reference, the mock `createServer` options, and the per-model alert blocks, see the worker's [USAGE.md][antminer-usage] and the shared [install pattern][install-pattern].

## Troubleshooting

The development example on this page uses `run-s21.js`. A working run prints `ORK HRPC key:` and `Device:`, then stays running until Ctrl+C.

If the example does not print both values, or if its mock port is already in use, follow [miner troubleshooting][miner-troubleshooting].

## Next steps

- Decide how to run the worker service — [Deployment topologies][deployment-topologies]
- Review telemetry units, command shapes, and error codes — [`mdk-contract.json`][antminer-contract]

## Links

[terminology]: ../../concepts/terminology.md
<!-- docs@tether.io: terminology → concepts/terminology -->

[miner-guide-assumptions]: index.md#prerequisites
<!-- docs@tether.io: miner-guide-assumptions → how-to/miners#prerequisites -->

[antminer-usage]: ../../../backend/workers/miners/antminer/USAGE.md
<!-- docs@tether.io: antminer-usage → https://github.com/tetherto/mdk/blob/main/backend/workers/miners/antminer/USAGE.md -->

[antminer-runnable-examples]: ../../../backend/workers/miners/antminer/USAGE.md#runnable-examples
<!-- docs@tether.io: antminer-runnable-examples → https://github.com/tetherto/mdk/blob/main/backend/workers/miners/antminer/USAGE.md#runnable-examples -->

[install-pattern]: ../../../backend/workers/docs/install-pattern.md
<!-- docs@tether.io: install-pattern → https://github.com/tetherto/mdk/blob/main/backend/workers/docs/install-pattern.md -->

[get-started]: ../../tutorials/get-started/index.md
<!-- docs@tether.io: get-started → tutorials/backend-stack -->

[deployment-topologies]: ../../concepts/deployment-topologies.md
<!-- docs@tether.io: deployment-topologies → concepts/deployment-topologies -->

[antminer-contract]: ../../../backend/workers/miners/antminer/mdk-contract.json
<!-- docs@tether.io: antminer-contract → https://github.com/tetherto/mdk/blob/main/backend/workers/miners/antminer/mdk-contract.json -->

[miner-troubleshooting]: troubleshooting.md
<!-- docs@tether.io: miner-troubleshooting → how-to/miners/troubleshooting -->
