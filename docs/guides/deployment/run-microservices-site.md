---
title: Run a microservices site
description: Start an MDK site as supervised Gateway and Worker services with PM2 or Docker.
docs@tether_slug: guides/deployment/run-microservices-site
notes: in mdk detailed operational changes are kept in package docs to prevent drift from the runnable source
---

This thin page directs you to the correct location for the prerequisites, config fields, run command, smoke test, and troubleshooting.

## Overview

Use the **microservices** site example when you want the Gateway and Workers to run as separate OS processes or containers.

> [!NOTE]
> This page is the task guide for the microservices topology.
> The [deployment topologies][deployment-topologies] concept explains when to choose microservices instead of single-process.

## Use this topology when

- You need supervisor-managed restarts and logs
- You want to restart or scale one service without restarting the others
- You want a production-like layout for Gateway and Workers

## Run the example

> [!NOTE]
> The `examples/backend/site/` example starts only the Gateway and Worker processes — Kernel must run
> separately. For a self-contained example that starts every service including Kernel, use
> [`examples/site-backend/`][site-backend-example] instead.

Follow the [microservices site example][microservices-example]:

- Start with the [prerequisites][microservices-example-prerequisites]
- Use the [PM2 steps][microservices-example-pm2] for local process supervision on one host
- Use the [Docker steps][microservices-example-docker] when you want containerized services or Compose-managed startup

## Next steps

- Compare the supported shapes: [Deployment topologies][deployment-topologies]
- Run the simpler local topology — [Run a single-process site][single-process]
- Register a single miner before building a site config — [Run a miner Worker][miner-how-to]

## Links

[deployment-topologies]: ../../concepts/deployment-topologies.md
<!-- docs@tether.io: deployment-topologies → concepts/deployment-topologies -->

[single-process]: run-single-process-site.md
<!-- docs@tether.io: single-process → guides/deployment/run-single-process-site -->

[miner-how-to]: ../miners/index.md
<!-- docs@tether.io: miner-how-to → guides/miners -->

[microservices-example]: ../../../examples/backend/site/README.md
<!-- docs@tether.io: microservices-example → https://github.com/tetherto/mdk/tree/main/examples/backend/site -->

[microservices-example-prerequisites]: ../../../examples/backend/site/README.md#prerequisites
<!-- docs@tether.io: microservices-example-prerequisites → https://github.com/tetherto/mdk/tree/main/examples/backend/site#prerequisites -->

[microservices-example-pm2]: ../../../examples/backend/site/README.md#pm2
<!-- docs@tether.io: microservices-example-pm2 → https://github.com/tetherto/mdk/tree/main/examples/backend/site#pm2 -->

[microservices-example-docker]: ../../../examples/backend/site/README.md#docker
<!-- docs@tether.io: microservices-example-docker → https://github.com/tetherto/mdk/tree/main/examples/backend/site#docker -->

[site-backend-example]: ../../../examples/site-backend/README.md
<!-- docs@tether.io: site-backend-example → https://github.com/tetherto/mdk/tree/main/examples/site-backend -->
