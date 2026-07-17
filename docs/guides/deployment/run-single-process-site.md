---
title: Run a single-process site
description: Start Kernel, Gateway, and multiple miner Workers inside one Node.js process for local development or small deployments
docs@tether_slug: guides/deployment/run-single-process-site
notes: in mdk detailed operational changes are kept in package docs to prevent drift from the runnable source
---

This thin page directs you to the correct location for the prerequisites, config fields, run command, smoke test, and troubleshooting.

## Overview

Use the **single-process** site example when you want Kernel, the Gateway, and Worker to share one Node.js process.

> [!NOTE]
> This page is the task guide for the single-process topology.
> The [deployment topologies][deployment-topologies] concept explains when to choose single-process instead of microservices.

## Use this topology when

- You are developing locally, running demos, or writing self-contained tests
- You want a minimal-footprint deployment
- You do not need per-service restart isolation

## Run the example

Follow the [single-process site example][single-example]:

- Start with its [prerequisites][single-example-prerequisites]
- Use the example [quickstart][single-example-quickstart]

## Next steps

- Compare the supported shapes: [Deployment topologies][deployment-topologies]
- Run the supervised topology — [Run a microservices site][microservices]
- Register a single miner before building a site config — [Run a miner Worker][miner-guide]

## Links

[deployment-topologies]: ../../concepts/deployment-topologies.md
<!-- docs@tether.io: deployment-topologies → concepts/deployment-topologies -->

[microservices]: run-microservices-site.md
<!-- docs@tether.io: microservices → guides/deployment/run-microservices-site -->

[miner-guide]: ../miners/index.md
<!-- docs@tether.io: miner-how-to → guides/miners -->

[single-example]: ../../../examples/backend/site-single-process/README.md
<!-- docs@tether.io: single-example → https://github.com/tetherto/mdk/tree/main/examples/backend/site-single-process -->

[single-example-prerequisites]: ../../../examples/backend/site-single-process/README.md#prerequisites
<!-- docs@tether.io: single-example-prerequisites → https://github.com/tetherto/mdk/tree/main/examples/backend/site-single-process#prerequisites -->

[single-example-quickstart]: ../../../examples/backend/site-single-process/README.md#quickstart
<!-- docs@tether.io: single-example-quickstart → https://github.com/tetherto/mdk/tree/main/examples/backend/site-single-process#quickstart -->
