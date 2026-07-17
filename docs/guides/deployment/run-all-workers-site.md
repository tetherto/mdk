---
title: Run the supported Worker fleet with mock devices
description: Boot multiple backend Workers as supervised PM2 or Docker processes, each connected to mock hardware, for a complete end-to-end site
docs@tether_slug: guides/deployment/run-all-workers-site
notes: in mdk detailed operational changes are kept in package docs to prevent drift from the runnable source
---

This page directs you to the correct location for the prerequisites, run command, smoke test, and troubleshooting.

## Overview

Use this example when you want the to run a demo for multiple configured Workers across the device families - for miners, containers,
power meters, sensors, and pools - running as separate processes. Each talks to mock
hardware that speaks the real wire protocol. The site Gateway plugin surfaces all
device data through a single `/site` HTTP API.

This example runs a microservices topology. Use this when:

- You want to explore the supported Worker fleet and its telemetry in one running system
- You are testing PM2 or Docker orchestration before deploying to hardware
- You want real driver code running its full connect, collect, and command paths (only the endpoints are localhost mocks instead of hardware)
- You want the site Gateway plugin as a starting point for your own `/site` API

> [!NOTE]
> You have a choice of [deployment topologies][deployment-topologies] from microservices to single-process.

## Run the example

Follow the [site example][site-backend-example]:

- Start with the [prerequisites][site-backend-prerequisites]
- Choose your launch method:
    - Use [PM2][site-backend-pm2] for local process supervision on one host
    - Use [Docker][site-backend-docker] when you want containerized services or Compose-managed startup
- [Verify][site-backend-verify] the fleet is up with a single `curl`

## Next steps

- Understand the trade-offs between [deployment topologies][deployment-topologies]
- Run [a single-process site][single-process] for the simpler local topology
- Extend the Gateway HTTP API with [custom plugins][plugins]
- Browse the [functions][mdk-functions] that wire together the [Kernel][kernel-concept], [device Workers][workers-concept], and the [Gateway][gateway-concept] HTTP
- Build your own [Worker from scratch][build-a-worker]

## Links

[deployment-topologies]: ../../concepts/deployment-topologies.md
<!-- docs@tether.io: deployment-topologies → concepts/deployment-topologies -->

[single-process]: run-single-process-site.md
<!-- docs@tether.io: single-process → guides/deployment/run-single-process-site -->

[plugins]: ../gateway/plugins.md
<!-- docs@tether.io: plugins → guides/gateway/plugins -->

[site-backend-example]: ../../../examples/site-backend/README.md
<!-- docs@tether.io: site-backend-example → https://github.com/tetherto/mdk/tree/main/examples/site-backend -->

[site-backend-prerequisites]: ../../../examples/site-backend/README.md#prerequisites
<!-- docs@tether.io: site-backend-prerequisites → https://github.com/tetherto/mdk/tree/main/examples/site-backend#prerequisites -->

[site-backend-pm2]: ../../../examples/site-backend/README.md#run-with-pm2-one-host-multiple-processes
<!-- docs@tether.io: site-backend-pm2 → https://github.com/tetherto/mdk/tree/main/examples/site-backend#run-with-pm2-one-host-multiple-processes -->

[site-backend-docker]: ../../../examples/site-backend/README.md#run-with-docker-one-container-per-process
<!-- docs@tether.io: site-backend-docker → https://github.com/tetherto/mdk/tree/main/examples/site-backend#run-with-docker-one-container-per-process -->

[site-backend-verify]: ../../../examples/site-backend/README.md#verify
<!-- docs@tether.io: site-backend-verify → https://github.com/tetherto/mdk/tree/main/examples/site-backend#verify -->

[mdk-functions]: ../../../backend/core/mdk/README.md
<!-- docs@tether.io: mdk-functions → https://github.com/tetherto/mdk/blob/main/backend/core/mdk/README.md -->

[kernel-concept]: ../../concepts/stack/kernel.md
<!-- docs@tether.io: kernel-concept → concepts/stack/kernel -->

[workers-concept]: ../../concepts/stack/workers.md
<!-- docs@tether.io: workers-concept → concepts/stack/workers -->

[gateway-concept]: ../../concepts/stack/gateway.md
<!-- docs@tether.io: gateway-concept → concepts/stack/gateway -->

[build-a-worker]: ../workers/build-a-worker.md
