---
title: Supported hardware
description: The miners, containers, power meters, and sensors MDK supports, plus mining-pool integrations — derived from each worker's contract.
docs@tether_slug: reference/supported-hardware
---

## Overview

MDK integrates field hardware through workers. Each worker declares what it supports in its `mdk-contract.json`, and that contract is the single source of truth for coverage. Use this page to discover what workers are supported.

## What MDK supports

- **Miners**: For example, Bitmain Antminer, MicroBT Whatsminer
- **Containers**: For example, Bitmain Antspace, MicroBT
- **Power meters**: For example, ABB, Satec
- **Sensors**: For example, Seneca
- **Mining pools**: Protocol integrations such as Ocean, F2Pool

For the exact model lists, worker packages, and per-worker docs, see the generated catalogue:

- [Full supported-hardware catalogue][catalogue-full] — generated from every `backend/workers/**/mdk-contract.json`

## Next steps

- New to the moving parts? Read [terminology][terminology] (ORK, worker, manager, thing, mock)
- Decide how to run the worker service — [Deployment topologies][deployment-topologies]
- Run a miner worker — [Run a miner worker][run-miner-worker]

## Links

[catalogue-full]: ../../backend/workers/docs/supported-hardware.md
<!-- docs@tether.io: catalogue-full → https://github.com/tetherto/mdk/blob/main/backend/workers/docs/supported-hardware.md -->

[terminology]: ../concepts/terminology.md
<!-- docs@tether.io: terminology → concepts/terminology -->

[deployment-topologies]: ../concepts/deployment-topologies.md
<!-- docs@tether.io: deployment-topologies → concepts/deployment-topologies -->

[run-miner-worker]: ../how-to/miners/index.md
<!-- docs@tether.io: run-miner-worker → how-to/miners -->
