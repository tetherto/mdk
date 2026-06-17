---
title: Run a miner worker
description: Task guides for running MDK miner workers — Antminer, Whatsminer, and Avalon. Each guide is independent; read only the one for your hardware.
docs@tether_slug: how-to/miners
---

## Overview

MDK drives each miner brand through its own worker. These guides are task-focused and **independent** — you only need the one for the hardware you operate.

> [!NOTE]
> If ORK, worker, manager, or thing are unfamiliar, read [terminology][terminology] first.

## Pick your hardware

The authoritative model list for every worker is the generated [supported-hardware catalogue][catalogue-miners]. For example, you may:

- [Run an Antminer worker][run-antminer]
- [Run a Whatsminer worker][run-whatsminer]
- [Run an Avalon worker][run-avalon]

## Prerequisites

Every guide assumes:

- Node.js >=24 (LTS)
- npm >=11
- Commands are run from the repo root
- Outbound network access for ORK discovery

For the mock/development path:

- No physical miner is required
- The runnable example for your model starts the bundled mock device and registers it

> [!IMPORTANT]
> Each runnable example starts an ORK whose control plane is peer-to-peer over a Hyperswarm DHT. Without outbound network access, startup will stall while the ORK tries to reach DHT bootstrap nodes. See [how workers connect][workers-connect] for the ORK/DHT mechanics.

For the deployment path:

- A Node.js service or script in your deployment that runs the MDK worker and registers devices
- A supported miner reachable from the machine or container running the worker
- Access to the miner's native API and credentials, if that API requires them
- The worker's `USAGE.md` for the exact `registerThing` options

## Next steps

- Browse [supported hardware][supported-hardware]
- New to the moving parts? Read [terminology][terminology] (ORK, worker, manager, thing, mock)
- If an example does not start or a mock port is busy, use [troubleshooting][troubleshooting]
- Drive the registered device from the CLI or dashboard: [Get started][get-started]

## Links

[terminology]: ../../concepts/terminology.md
<!-- docs@tether.io: terminology → concepts/terminology -->

[catalogue-miners]: ../../../backend/workers/docs/supported-hardware.md#miners
<!-- docs@tether.io: catalogue-miners → reference/supported-hardware#miners -->

[workers-connect]: ../../concepts/worker-discovery.md
<!-- docs@tether.io: workers-connect → concepts/worker-discovery -->

[supported-hardware]: ../../reference/supported-hardware.md
<!-- docs@tether.io: supported-hardware → reference/supported-hardware -->

[run-antminer]: run-antminer-worker.md
<!-- docs@tether.io: run-antminer → how-to/miners/run-antminer-worker -->

[run-whatsminer]: run-whatsminer-worker.md
<!-- docs@tether.io: run-whatsminer → how-to/miners/run-whatsminer-worker -->

[run-avalon]: run-avalon-worker.md
<!-- docs@tether.io: run-avalon → how-to/miners/run-avalon-worker -->

[troubleshooting]: troubleshooting.md
<!-- docs@tether.io: troubleshooting → how-to/miners/troubleshooting -->

[get-started]: ../../tutorials/get-started/index.md
<!-- docs@tether.io: get-started → tutorials/backend-stack -->
