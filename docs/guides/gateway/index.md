---
title: Gateway how-to guides
description: Task guides for running and extending the MDK Gateway.
docs@tether_slug: guides/gateway
---

## Overview

The Gateway is an HTTP router for apps: it reads each app's route table, forwards every request to that app's own runtime
process over HRPC, and runs no app code itself. Each app builds its own [`@tetherto/mdk-client`][mdk-client-readme] inside its
runtime. These guides cover how to run the Gateway and how to build, publish and install the apps it serves.

> [!NOTE]
> An AI agent reaches MDK over MCP, not the Gateway's HTTP surface directly. MCP is served by a standalone
> [`@tetherto/mdk-mcp`][mcp-readme] process that derives tools from an app's routes; the Gateway hosts no MCP itself.

> [!NOTE]
> If Gateway, Kernel, or app are unfamiliar, [terminology][terminology] defines them. The
> [Gateway concept page][gateway-concept] covers the full developer model (extension, data access, auth design).

## Choose a guide

| Goal | Guide |
| --- | --- |
| Start the Gateway for the first time | [Run the Gateway][run] |
| Declare the apps MDK ships, or build and publish your own | [Gateway apps][apps] |
| Stop Kernel, Gateway, and Workers cleanly | [Tear down MDK services][teardown] |
| Operator in the loop: submit and approve write actions | [Submit and approve write actions][write-actions] |
| Secure the site you are assembling | [Site security blueprint][security-blueprint] |

## Next steps

- [Understand the Gateway as a development surface][gateway-concept]
- Read the [Gateway API reference][gateway-readme]
- Choose a [deployment shape][deployment-topologies]
- [Give an operator a chat interface to the fleet][agent-guides] by deploying the operator agent behind the Gateway
- Follow the [site security blueprint][security-blueprint]: identity in controllers, Kernel allowlist, and UI session options

## Links

[mdk-client-readme]: ../../../backend/core/client/README.md
<!-- docs@tether.io: mdk-client-readme → https://github.com/tetherto/mdk/blob/main/backend/core/client/README.md -->

[terminology]: ../../reference/glossary.md
<!-- docs@tether.io: terminology → reference/glossary -->

[gateway-concept]: ../../../backend/core/gateway/README.md
<!-- docs@tether.io: gateway-concept → https://github.com/tetherto/mdk/blob/main/backend/core/gateway/README.md -->

[deployment-topologies]: ../../concepts/deployment-topologies.md
<!-- docs@tether.io: deployment-topologies → https://github.com/tetherto/mdk/blob/main/docs/concepts/deployment-topologies.md -->

[run]: run.md
<!-- docs@tether.io: run → guides/gateway/run -->

[apps]: apps.md
<!-- docs@tether.io: apps → guides/gateway/apps -->

[teardown]: teardown.md
<!-- docs@tether.io: teardown → guides/gateway/teardown -->

[gateway-readme]: ../../../backend/core/gateway/README.md
<!-- docs@tether.io: gateway-readme → https://github.com/tetherto/mdk/blob/main/backend/core/gateway/README.md -->

[write-actions]: write-actions.md
<!-- docs@tether.io: write-actions → guides/gateway/write-actions -->

[mcp-readme]: ../../../backend/core/mcp/README.md
<!-- docs@tether.io: mcp-readme → https://github.com/tetherto/mdk/blob/main/backend/core/mcp/README.md -->

[agent-guides]: ../agent/index.md
<!-- docs@tether.io: agent-guides → guides/agent -->

[security-blueprint]: ../security/index.md
<!-- docs@tether.io: security-blueprint → guides/security -->
