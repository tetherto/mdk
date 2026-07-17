---
title: Gateway how-to guides
description: Task guides for running and extending the MDK Gateway.
docs@tether_slug: guides/gateway
---

## Overview

The Gateway wraps [`@tetherto/mdk-client`][mdk-client-readme] to deliver an authenticated HTTP, WebSocket, and MCP interface for your frontend and AI agents. These guides cover how to run it and extend it with the plugin system.

> [!NOTE]
> If Gateway, Kernel, or plugin are unfamiliar, read [terminology][terminology] first. For the full developer model — extension, data access,
> auth design — read the [Gateway concept page][gateway-concept].

## Choose a guide

| Goal | Guide |
| --- | --- |
| Start the Gateway for the first time | [Run the Gateway][run] |
| Use built-in plugins or build your own | [Gateway plugins][plugins] |
| Stop Kernel, Gateway, and Workers cleanly | [Tear down MDK services][teardown] |
| Operator in the loop: submit and approve write actions | [Submit and approve write actions][write-actions] |

## Next steps

- [Understand the Gateway as a development surface][gateway-concept]
- Read the [Gateway API reference][gateway-readme]
- Choose a [deployment shape][deployment-topologies]

## Links

[mdk-client-readme]: ../../../backend/core/client/README.md
<!-- docs@tether.io: mdk-client-readme → https://github.com/tetherto/mdk/blob/main/backend/core/client/README.md -->

[terminology]: ../../reference/glossary.md
<!-- docs@tether.io: terminology → reference/glossary -->

[gateway-concept]: ../../concepts/stack/gateway.md
<!-- docs@tether.io: gateway-concept → concepts/stack/gateway -->

[deployment-topologies]: ../../concepts/deployment-topologies.md
<!-- docs@tether.io: deployment-topologies → concepts/deployment-topologies -->

[run]: run.md
<!-- docs@tether.io: run → guides/gateway/run -->

[plugins]: plugins.md
<!-- docs@tether.io: plugins → guides/gateway/plugins -->

[teardown]: teardown.md
<!-- docs@tether.io: teardown → guides/gateway/teardown -->

[gateway-readme]: ../../../backend/core/gateway/README.md
<!-- docs@tether.io: gateway-readme → https://github.com/tetherto/mdk/blob/main/backend/core/gateway/README.md -->

[write-actions]: write-actions.md
<!-- docs@tether.io: write-actions → guides/gateway/write-actions -->