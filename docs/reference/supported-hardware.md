---
title: Supported hardware
description: The miners, containers, power meters, and sensors MDK supports, plus mining-pool integrations — derived from each Worker's contract.
docs@tether_slug: reference/supported-hardware
---

## Overview

MDK integrates field hardware through Workers. Each Worker declares what it supports in its `mdk-contract.json`, and that contract is the single source of truth for coverage. Use this page to discover what Workers are supported.

## What MDK supports

- **Miners**: For example, Bitmain Antminer, MicroBT Whatsminer
- **Containers**: For example, Bitmain Antspace, Bitdeer
- **Power meters**: For example, ABB, Satec
- **Sensors**: For example, Seneca
- **Mining pools**: Protocol integrations such as Ocean, F2Pool

For the exact model lists, Worker packages, and per-Worker docs, see the generated catalogue:

- [Full supported-hardware catalogue][catalogue-full] — generated from every `backend/workers/**/mdk-contract.json`

## Next steps

- New to the moving parts? Read [terminology][terminology] (Kernel, Worker, manager, thing, mock)
- Decide how to run the Worker service — [Deployment topologies][deployment-topologies]
- Run a miner Worker — [Run a miner Worker][run-miner-worker]

## Links

[catalogue-full]: ../../backend/workers/docs/supported-hardware.md
<!-- docs@tether.io: catalogue-full → https://github.com/tetherto/mdk/blob/main/backend/workers/docs/supported-hardware.md -->

[terminology]: ../reference/glossary.md
<!-- docs@tether.io: terminology → reference/glossary -->

[deployment-topologies]: ../concepts/deployment-topologies.md
<!-- docs@tether.io: deployment-topologies → concepts/deployment-topologies -->

[run-miner-worker]: ../guides/miners/index.md
<!-- docs@tether.io: run-miner-worker → guides/miners -->
