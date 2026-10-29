---
title: Run a container Worker
description: Task guides for running MDK container Workers
docs@tether_slug: guides/containers
---

## Overview

MDK drives each container system through its own Worker. These guides are task-focused and independent, you only need the one for the hardware you
operate.

> [!NOTE]
> If Kernel, Worker, manager, or thing are unfamiliar, read [terminology][terminology] first.

## Pick your hardware

The authoritative model list for every Worker is the generated [Supported Workers catalogue][catalogue-containers]. Covered so far:

- [Run a Bitdeer Worker][run-bitdeer]
- [Run an Antspace Worker][run-antspace]

## Prerequisites

Every guide assumes:

- [Node.js][node] >=24 (LTS)
- npm 11 [(< 12)][npm-version]
- Dependencies installed (`npm run setup` from the repo root)
- Commands are run from the repo root
- Outbound UDP access to the HyperDHT bootstrap nodes, or a [private bootstrap][private-dht] on an air-gapped machine

For the mock or development path:

- No physical container is required
- The runnable example for your model starts the bundled mock and registers it

> [!IMPORTANT]
> HRPC relies on HyperDHT for peer connectivity. Use the [network requirements and checks][troubleshooting]
> if an example stalls before printing the Kernel key.

For the deployment path:

- A Node.js service or script in your deployment that runs the MDK Worker and registers devices
- A supported container system reachable from the machine or container running the Worker
- The Worker's README for the exact `registerThing` options

## Next steps

- Browse the [Supported Workers catalogue][supported-workers]
- New to the moving parts? Read [terminology][terminology] (Kernel, Worker, manager, thing, mock)
- If an example does not start or a mock port is busy, use [miner troubleshooting][troubleshooting], the same HRPC and DHT checks apply
- Drive the registered device from a dashboard: [run a mining site end to end][get-started]

## Links

[node]: https://nodejs.org/
<!-- docs@tether.io: external link — preserve URL -->

[npm-version]: ../../reference/environment.md#why-npm-stays-below-12
<!-- docs@tether.io: npm-version → reference/environment -->

[terminology]: ../../reference/glossary.md
<!-- docs@tether.io: terminology → reference/glossary -->

[catalogue-containers]: ../../../backend/workers/docs/supported-workers.md
<!-- docs@tether.io: catalogue-containers → reference/supported-workers -->

[supported-workers]: ../../reference/supported-workers.md
<!-- docs@tether.io: supported-workers → reference/supported-workers -->

[run-bitdeer]: run-bitdeer-worker.md
<!-- docs@tether.io: run-bitdeer → guides/containers/run-bitdeer-worker -->

[run-antspace]: run-antspace-worker.md
<!-- docs@tether.io: run-antspace → guides/containers/run-antspace-worker -->

[troubleshooting]: ../miners/troubleshooting.md
<!-- docs@tether.io: troubleshooting → guides/miners/troubleshooting -->

[get-started]: ../../tutorials/run-a-site.md
<!-- docs@tether.io: get-started → tutorials/run-a-site -->

[private-dht]: ../deployment/private-dht.md
<!-- docs@tether.io: private-dht → guides/deployment/private-dht -->
