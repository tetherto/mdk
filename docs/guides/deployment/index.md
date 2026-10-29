---
title: Run an MDK site
description: Choose and run an MDK site deployment topology, from one Node.js process to supervised services.
docs@tether_slug: guides/deployment
---

## Overview

Use these guides to choose a site deployment shape.

> [!NOTE]
> If Kernel, Gateway, Worker, manager, or thing are unfamiliar, read [terminology][terminology] first.
> If you are choosing between topologies, read [deployment topologies][deployment-topologies].

## Choose a guide

- Run a multi-Worker site as separate, PM2-supervised processes, from one machine up to a cross-host deployment, using [supervised services][all-workers]
- Configure MDK on managed infrastructure with the [hosted-site reference configuration][hosted-site]: networks, allowlists, a
  monitoring-only and a delegated-writes profile, and MCP off or on loopback
- Keep every process off the public HyperDHT with the [local and air-gapped profile][private-dht]: private bootstrap nodes and an
  explicit bind interface, on one machine, an isolated LAN or Docker

## Next steps

- Understand the trade-offs before you choose your [deployment topology][deployment-topologies]
- Measure real CPU, RAM, disk, and latency for your own hardware and device count with [the benchmark harness][benchmark-your-site]
- Check [published benchmark results, measured limits, and recommended operating envelopes][benchmark-results] before sizing a site
- Browse the [functions][mdk-functions] that wire together the [Kernel][kernel-concept], [device Workers][workers-concept], and the [Gateway][gateway-concept] HTTP
- Follow the [site security blueprint][security-blueprint]: identity, allowlists, and network options for a real site

## Links

[terminology]: ../../reference/glossary.md
<!-- docs@tether.io: terminology → reference/glossary -->

[deployment-topologies]: ../../concepts/deployment-topologies.md
<!-- docs@tether.io: deployment-topologies → https://github.com/tetherto/mdk/blob/main/backend/core/docs/README.md#connection-and-deployment-model -->

[all-workers]: run-all-workers-site.md
<!-- docs@tether.io: all-workers → guides/deployment/run-all-workers-site -->

[hosted-site]: hosted-site.md
<!-- docs@tether.io: hosted-site → guides/deployment/hosted-site -->

[private-dht]: private-dht.md
<!-- docs@tether.io: private-dht → guides/deployment/private-dht -->

[benchmark-your-site]: benchmark-your-site.md
<!-- docs@tether.io: benchmark-your-site → guides/deployment/benchmark-your-site -->

[benchmark-results]: benchmark-results.md
<!-- docs@tether.io: benchmark-results → guides/deployment/benchmark-results -->

[mdk-functions]: ../../../backend/core/mdk/README.md
<!-- docs@tether.io: mdk-functions → https://github.com/tetherto/mdk/blob/main/backend/core/mdk/README.md -->

[kernel-concept]: ../../../backend/core/kernel/README.md
<!-- docs@tether.io: kernel-concept → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md -->

[workers-concept]: ../../../backend/workers/README.md
<!-- docs@tether.io: workers-concept → https://github.com/tetherto/mdk/blob/main/backend/workers/README.md -->

[gateway-concept]: ../../../backend/core/gateway/README.md
<!-- docs@tether.io: gateway-concept → https://github.com/tetherto/mdk/blob/main/backend/core/gateway/README.md -->

[security-blueprint]: ../security/index.md
<!-- docs@tether.io: security-blueprint → guides/security -->
