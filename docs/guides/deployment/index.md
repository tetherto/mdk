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

- [Single-process][single-process] — run Kernel, Gateway, and Workers in one Node.js process
- [Local][all-workers] — run the supported Worker fleet as separate processes on one machine, each with registered devices
- [Microservices][microservices] — run Gateway and Workers as separate supervised services

## Next steps

- Understand the trade-offs before you choose your [deployment topology][deployment-topologies]
- Browse the [functions][mdk-functions] that wire together the [Kernel][kernel-concept], [device Workers][workers-concept], and the [Gateway][gateway-concept] HTTP

## Links

[terminology]: ../../reference/glossary.md
<!-- docs@tether.io: terminology → reference/glossary -->

[deployment-topologies]: ../../concepts/deployment-topologies.md
<!-- docs@tether.io: deployment-topologies → concepts/deployment-topologies -->

[single-process]: run-single-process-site.md
<!-- docs@tether.io: single-process → guides/deployment/run-single-process-site -->

[microservices]: run-microservices-site.md
<!-- docs@tether.io: microservices → guides/deployment/run-microservices-site -->

[all-workers]: run-all-workers-site.md
<!-- docs@tether.io: all-workers → guides/deployment/run-all-workers-site -->

[mdk-functions]: ../../../backend/core/mdk/README.md
<!-- docs@tether.io: mdk-functions → https://github.com/tetherto/mdk/blob/main/backend/core/mdk/README.md -->

[kernel-concept]: ../../concepts/stack/kernel.md
<!-- docs@tether.io: kernel-concept → concepts/stack/kernel -->

[workers-concept]: ../../concepts/stack/workers.md
<!-- docs@tether.io: workers-concept → concepts/stack/workers -->

[gateway-concept]: ../../concepts/stack/gateway.md
<!-- docs@tether.io: gateway-concept → concepts/stack/gateway -->
