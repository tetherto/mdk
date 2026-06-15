---
title: Run a Whatsminer worker
description: Start an MDK worker for a MicroBT Whatsminer (M30S+, M30S++, M53S, M56S, M63) against a mock or a real device.
docs@tether_slug: how-to/miners/run-whatsminer-worker
---

## Overview

This page details how to run the MicroBT Whatsminer worker. Select the development (mock) or real-device path.

## Prerequisites

Review the [common deployment prerequisites][miner-guide-assumptions] before you start.

Deployment-specific requirements:

- A Node.js service or script in your deployment that runs the MDK worker and registers devices
- A supported Whatsminer device reachable from the machine or container running the worker
- The miner API reachable over encrypted TCP, typically port `14028`
- The Whatsminer API password. The worker negotiates a session token from it; there is no separate username

## Development

<details>
<summary>Run against a mock</summary>

To support development, each model ships a runnable example that starts an ORK, boots a mock device, and registers it. This guide uses the M56S example:

```bash
node backend/workers/miners/whatsminer/examples/run-m56s.js
```

It prints the ORK HRPC key and the registered device ID, then stays running until Ctrl+C. To run another model, use the matching example listed in [USAGE.md][whatsminer-runnable-examples].

</details>

## Connect a miner

### Pick your model

Use the Whatsminer worker's [USAGE.md][whatsminer-usage] to choose the manager class and mock example for your model. This guide uses `WM_M56S` and `run-m56s.js` as the example; replace them with the values for your miner.

### Register your miner

Whatsminer devices use an encrypted TCP API on port 14028 with token-based authentication; the worker negotiates a session token from the device password (there is no separate username). Add this code to the Node.js service or script that runs the MDK worker in your deployment. The snippet shows the minimum `registerThing` call for one Whatsminer device; replace the example IP address and password with your miner's values:

```js
const { getOrk, startWorker } = require('@tetherto/mdk')
const { WM_M56S } = require('@tetherto/miner-whatsminer')

const ork = await getOrk()
const { manager } = await startWorker(WM_M56S, { ork })

await manager.registerThing({
  info: { container: 'site-1', serialNum: 'WM-001' },
  opts: { address: '192.168.1.10', port: 14028, password: 'admin' }
})
```

> [!WARNING]
> Make sure each miner's IP is reachable from the machine or container running the worker before registering. Commands act on physical hardware — prioritize thermal safety.

Before running in a deployment, generate the worker config (`common.json` for worker identity, `base.thing.json` for device defaults and per-model alert thresholds):

```bash
cd backend/workers/miners/whatsminer
./setup-config.sh
```

For the full `registerThing` option reference, the mock `createServer` options, and the per-model alert blocks, see the worker's [USAGE.md][whatsminer-usage] and the shared [install pattern][install-pattern].

## Troubleshooting

The development example on this page uses `run-m56s.js`. A working run prints `ORK HRPC key:` and `Device:`, then stays running until Ctrl+C.

If the example does not print both values, or if its mock port is already in use, follow [miner troubleshooting][miner-troubleshooting].

## Next steps

- Decide how to run the worker service — [Deployment topologies][deployment-topologies]
- Review telemetry units, command shapes, and error codes — [`mdk-contract.json`][whatsminer-contract]

## Links

[terminology]: ../../concepts/terminology.md
<!-- docs@tether.io: terminology → concepts/terminology -->

[miner-guide-assumptions]: index.md#prerequisites
<!-- docs@tether.io: miner-guide-assumptions → how-to/miners#prerequisites -->

[whatsminer-usage]: ../../../backend/workers/miners/whatsminer/USAGE.md
<!-- docs@tether.io: whatsminer-usage → https://github.com/tetherto/mdk/blob/main/backend/workers/miners/whatsminer/USAGE.md -->

[whatsminer-runnable-examples]: ../../../backend/workers/miners/whatsminer/USAGE.md#runnable-examples
<!-- docs@tether.io: whatsminer-runnable-examples → https://github.com/tetherto/mdk/blob/main/backend/workers/miners/whatsminer/USAGE.md#runnable-examples -->

[install-pattern]: ../../../backend/workers/docs/install-pattern.md
<!-- docs@tether.io: install-pattern → https://github.com/tetherto/mdk/blob/main/backend/workers/docs/install-pattern.md -->

[get-started]: ../../tutorials/get-started/index.md
<!-- docs@tether.io: get-started → tutorials/backend-stack -->

[deployment-topologies]: ../../concepts/deployment-topologies.md
<!-- docs@tether.io: deployment-topologies → concepts/deployment-topologies -->

[whatsminer-contract]: ../../../backend/workers/miners/whatsminer/mdk-contract.json
<!-- docs@tether.io: whatsminer-contract → https://github.com/tetherto/mdk/blob/main/backend/workers/miners/whatsminer/mdk-contract.json -->

[miner-troubleshooting]: troubleshooting.md
<!-- docs@tether.io: miner-troubleshooting → how-to/miners/troubleshooting -->
