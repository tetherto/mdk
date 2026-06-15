---
title: Run an Avalon worker
description: Start an MDK worker for a Canaan Avalon A1346 against a mock or a real device.
docs@tether_slug: how-to/miners/run-avalon-worker
---

## Overview

This page details how to run the Canaan Avalon worker. Select the development (mock) or real-device path.

## Prerequisites

Review [common deployment prerequisites][miner-guide-assumptions] before you start.

Deployment-specific requirements:

- A Node.js service or script in your deployment that runs the MDK worker and registers devices
- A supported Avalon device reachable from the machine or container running the worker
- The miner API reachable over the native CGMiner TCP API, typically port `4028`
- No API username or password. The Avalon CGMiner API is unauthenticated

## Development

<details>
<summary>Run against a mock</summary>

To support development, the A1346 ships a runnable example that starts an ORK, boots a mock device, and registers it:

```bash
node backend/workers/miners/avalon/examples/run-a1346.js
```

It prints the ORK HRPC key and the registered device ID, then stays running until Ctrl+C. For the manager class and example file, see [USAGE.md][avalon-runnable-example].

</details>

## Connect a miner

### Pick your model

Use the Avalon worker's [USAGE.md][avalon-usage] to confirm the manager class and mock example for your model. This guide uses `AV_A1346` and `run-a1346.js` as the example.

### Register your miner

Avalon devices use the native CGMiner TCP API on port 4028, which is unauthenticated (no username or password). Add this code to the Node.js service or script that runs the MDK worker in your deployment. The snippet shows the minimum `registerThing` call for one Avalon device; replace the example IP address with your miner's value:

```js
const { getOrk, startWorker } = require('@tetherto/mdk')
const { AV_A1346 } = require('@tetherto/miner-avalon')

const ork = await getOrk()
const { manager } = await startWorker(AV_A1346, { ork })

await manager.registerThing({
  info: { container: 'site-1', serialNum: 'AV-001' },
  opts: { address: '192.168.1.30', port: 4028 }
})
```

> [!WARNING]
> Make sure each miner's IP is reachable from the machine or container running the worker before registering. Commands act on physical hardware — prioritize thermal safety.

Before running in a deployment, generate the worker config (`common.json` for worker identity, `base.thing.json` for device defaults and per-model alert thresholds):

```bash
cd backend/workers/miners/avalon
./setup-config.sh
```

For the full `registerThing` option reference, the mock `createServer` options, and the per-model alert blocks, see the worker's [USAGE.md][avalon-usage] and the shared [install pattern][install-pattern].

## Troubleshooting

The development example on this page uses `run-a1346.js`. A working run prints `ORK HRPC key:` and `Device:`, then stays running until Ctrl+C.

If the example does not print both values, or if its mock port is already in use, follow [miner troubleshooting][miner-troubleshooting].

## Next steps

- Decide how to run the worker service — [Deployment topologies][deployment-topologies]
- Review telemetry units, command shapes, and error codes — [`mdk-contract.json`][avalon-contract]

## Links

[terminology]: ../../concepts/terminology.md
<!-- docs@tether.io: terminology → concepts/terminology -->

[miner-guide-assumptions]: index.md#prerequisites
<!-- docs@tether.io: miner-guide-assumptions → how-to/miners#prerequisites -->

[avalon-usage]: ../../../backend/workers/miners/avalon/USAGE.md
<!-- docs@tether.io: avalon-usage → https://github.com/tetherto/mdk/blob/main/backend/workers/miners/avalon/USAGE.md -->

[avalon-runnable-example]: ../../../backend/workers/miners/avalon/USAGE.md#runnable-example
<!-- docs@tether.io: avalon-runnable-example → https://github.com/tetherto/mdk/blob/main/backend/workers/miners/avalon/USAGE.md#runnable-example -->

[install-pattern]: ../../../backend/workers/docs/install-pattern.md
<!-- docs@tether.io: install-pattern → https://github.com/tetherto/mdk/blob/main/backend/workers/docs/install-pattern.md -->

[get-started]: ../../tutorials/get-started/index.md
<!-- docs@tether.io: get-started → tutorials/backend-stack -->

[deployment-topologies]: ../../concepts/deployment-topologies.md
<!-- docs@tether.io: deployment-topologies → concepts/deployment-topologies -->

[avalon-contract]: ../../../backend/workers/miners/avalon/mdk-contract.json
<!-- docs@tether.io: avalon-contract → https://github.com/tetherto/mdk/blob/main/backend/workers/miners/avalon/mdk-contract.json -->

[miner-troubleshooting]: troubleshooting.md
<!-- docs@tether.io: miner-troubleshooting → how-to/miners/troubleshooting -->
