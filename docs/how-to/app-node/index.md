---
title: App Node how-to guides
description: Task guides for running and extending the MDK App Node.
docs@tether_slug: how-to/app-node
---

## Overview

The App Node wraps [`@tetherto/mdk-client`][mdk-client-readme] to deliver an authenticated HTTP, WebSocket, and MCP interface for your frontend and AI agents. These guides cover how to run it and extend it with the plugin system.

> [!NOTE]
> If App Node, ORK, or plugin are unfamiliar, read [terminology][terminology] first. For the full developer model — extension, data access,
> auth design — read the [App Node concept page][app-node-concept].

## Choose a guide

| Goal | Guide |
| --- | --- |
| Start the App Node for the first time | [Run the App Node][run] |
| Use built-in plugins or build your own | [App Node plugins][plugins] |
| Stop ORK, App Node, and Workers cleanly | [Tear down MDK services][teardown] |

## Next steps

- [Understand the App Node as a development surface][app-node-concept]
- Read the [App Node API reference][app-node-readme]
- Choose a [deployment shape][deployment-topologies]

## Links

[mdk-client-readme]: ../../../backend/core/client/README.md
<!-- docs@tether.io: mdk-client-readme → https://github.com/tetherto/mdk/blob/main/backend/core/client/README.md -->

[terminology]: ../../concepts/terminology.md
<!-- docs@tether.io: terminology → concepts/terminology -->

[app-node-concept]: ../../concepts/stack/app-node.md
<!-- docs@tether.io: app-node-concept → concepts/stack/app-node -->

[deployment-topologies]: ../../concepts/deployment-topologies.md
<!-- docs@tether.io: deployment-topologies → concepts/deployment-topologies -->

[run]: run.md
<!-- docs@tether.io: run → how-to/app-node/run -->

[plugins]: plugins.md
<!-- docs@tether.io: plugins → how-to/app-node/plugins -->

[teardown]: teardown.md
<!-- docs@tether.io: teardown → how-to/app-node/teardown -->

[app-node-readme]: ../../../backend/core/app-node/README.md
<!-- docs@tether.io: app-node-readme → https://github.com/tetherto/mdk/blob/main/backend/core/app-node/README.md -->
