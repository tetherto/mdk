---
title: Run an MDK site
description: Choose and run an MDK site deployment topology, from one Node.js process to supervised services.
docs@tether_slug: how-to/deployment
---

## Overview

Use these guides to choose a site deployment shape.

> [!NOTE]
> If ORK, App Node, worker, manager, or thing are unfamiliar, read [terminology][terminology] first.
> If you are choosing between topologies, read [deployment topologies][deployment-topologies].

## Choose a guide

| Goal | Guide |
| --- | --- |
| Run ORK, App Node, and workers in one Node.js process | [Run a single-process site][single-process] |
| Run App Node and workers as supervised PM2 or Docker services | [Run a microservices site][microservices] |

## Next steps

- Understand the trade-offs before you choose — [Deployment topologies][deployment-topologies]
- Run the smallest site shape — [Run a single-process site][single-process]
- Run supervised services — [Run a microservices site][microservices]

## Links

[terminology]: ../../concepts/terminology.md
<!-- docs@tether.io: terminology → concepts/terminology -->

[deployment-topologies]: ../../concepts/deployment-topologies.md
<!-- docs@tether.io: deployment-topologies → concepts/deployment-topologies -->

[single-process]: run-single-process-site.md
<!-- docs@tether.io: single-process → how-to/deployment/run-single-process-site -->

[microservices]: run-microservices-site.md
<!-- docs@tether.io: microservices → how-to/deployment/run-microservices-site -->
