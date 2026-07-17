---
title: Run a miner Worker
description: Task guides for running MDK miner Workers — Antminer, Whatsminer, and Avalon. Each guide is independent; read only the one for your hardware.
docs@tether_slug: guides/miners
---

## Overview

MDK drives each miner brand through its own Worker. These guides are task-focused and **independent** — you only need the one for the hardware you operate.

> [!NOTE]
> If Kernel, Worker, manager, or thing are unfamiliar, read [terminology][terminology] first.

## Pick your hardware

The authoritative model list for every Worker is the generated [supported-hardware catalogue][catalogue-miners]. For example, you may:

- [Run an Antminer Worker][run-antminer]
- [Run a Whatsminer Worker][run-whatsminer]
- [Run an Avalon Worker][run-avalon]

## Prerequisites

Every guide assumes:

- Node.js >=24 (LTS)
- npm >=11
- Commands are run from the repo root
- Outbound network access for Kernel discovery

For the mock/development path:

- No physical miner is required
- The runnable example for your model starts the bundled mock device and registers it

> [!IMPORTANT]
> HRPC relies on HyperDHT for peer connectivity. Use the [network requirements and checks][troubleshooting]
> if an example stalls before printing the Kernel key.

For the deployment path:

- A Node.js service or script in your deployment that runs the MDK Worker and registers devices
- A supported miner reachable from the machine or container running the Worker
- Access to the miner's native API and credentials, if that API requires them
- The Worker's `USAGE.md` for the exact `registerThing` options

## Next steps

- Browse [supported hardware][supported-hardware]
- New to the moving parts? Read [terminology][terminology] (Kernel, Worker, manager, thing, mock)
- If an example does not start or a mock port is busy, use [troubleshooting][troubleshooting]
- Drive the registered device from the CLI or dashboard: [Get started][get-started]

## Links

[terminology]: ../../reference/glossary.md
<!-- docs@tether.io: terminology → reference/glossary -->

[catalogue-miners]: ../../../backend/workers/docs/supported-hardware.md#miners
<!-- docs@tether.io: catalogue-miners → reference/supported-hardware#miners -->

[workers-connect]: ../../concepts/stack/workers.md
<!-- docs@tether.io: workers-connect → concepts/stack/workers -->

[supported-hardware]: ../../reference/supported-hardware.md
<!-- docs@tether.io: supported-hardware → reference/supported-hardware -->

[run-antminer]: run-antminer-worker.md
<!-- docs@tether.io: run-antminer → guides/miners/run-antminer-worker -->

[run-whatsminer]: run-whatsminer-worker.md
<!-- docs@tether.io: run-whatsminer → guides/miners/run-whatsminer-worker -->

[run-avalon]: run-avalon-worker.md
<!-- docs@tether.io: run-avalon → guides/miners/run-avalon-worker -->

[troubleshooting]: troubleshooting.md
<!-- docs@tether.io: troubleshooting → guides/miners/troubleshooting -->

[get-started]: ../../tutorials/get-started/index.md
<!-- docs@tether.io: get-started → tutorials/backend-stack -->
