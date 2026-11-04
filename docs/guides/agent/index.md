---
title: Operator agent how-to guides
description: Task guides for running MDK's conversational operator agent, standalone or behind the Gateway.
docs@tether_slug: guides/agent
---

## Overview

`@tetherto/mdk-agent` is a conversational operator agent that answers plain-language questions about a mining fleet, calls
fleet tools over MCP, and gates writes behind human approval. [What the agent is and how it fits the stack][agent-concept]
covers the concepts; these guides cover running it.

The agent never rides on another stack's own Gateway. A model (`:11500`), an MCP tool server (`:3101` in the
[MVP site example][mvp-site-example]), and the agent's own Gateway (`:3847`) are three separate processes

> [!NOTE]
> The MVP site's own Gateway (`:3000`) has no `/agent` routes at all.

```text
  model  ──►  agent gateway  ──►  MCP tool server  ──►  kernel + workers
   :11500        :3847              :3101                  (the fleet)
                   ▲
                   └── UI shell :3030, proxying /agent
```

The agent connects to MCP once, when a session is created (the first `POST /agent/sessions`). If the tool server isn't up yet,
the connection fails: the app answers `503 ERR_AGENT_UNAVAILABLE` and tries again on the next request, so start the tool server
and retry. The standalone CLI exits instead, with `(is the MCP server running at <url>?)`. Only an agent with no `mcp.url` set
runs with no tools, answering from the model alone.

## Choose a guide

| Goal | Guide |
| --- | --- |
| Run the agent as a standalone CLI, for local development | [Run the agent as a standalone CLI][run-standalone] |
| Deploy the agent behind the Gateway as a chat API for an operator UI | [Deploy the agent behind the Gateway][gateway-deployment] |
| Give your own AI agent a service account and call app routes as MCP tools | [Connect an AI agent over MCP][connect-over-mcp] |

Exposing an app's own routes to the agent as tools is a detail of [building an app][apps], not its own
deployment path. See [Expose data to the agent][expose-data] there.

## Next steps

- If Gateway, Kernel, or plugin are unfamiliar, see the [terminology][terminology]
- [Understand the agent as a stack component][agent-concept]
- [Understand the Gateway as a development surface][gateway-concept]

## Links

[agent-concept]: ../../../backend/core/agent/README.md
<!-- docs@tether.io: agent-concept → https://github.com/tetherto/mdk/blob/main/backend/core/agent/README.md -->

[terminology]: ../../reference/glossary.md
<!-- docs@tether.io: terminology → reference/glossary -->

[run-standalone]: run-standalone.md
<!-- docs@tether.io: run-standalone → guides/agent/run-standalone -->

[gateway-deployment]: gateway-deployment.md
<!-- docs@tether.io: gateway-deployment → guides/agent/gateway-deployment -->

[expose-data]: expose-data.md
<!-- docs@tether.io: expose-data → guides/agent/expose-data -->

[connect-over-mcp]: connect-over-mcp.md
<!-- docs@tether.io: connect-over-mcp → guides/agent/connect-over-mcp -->

[apps]: ../gateway/apps.md
<!-- docs@tether.io: apps → guides/gateway/apps -->

[mvp-site-example]: ../../../examples/mvp-site/README.md
<!-- docs@tether.io: mvp-site-example → https://github.com/tetherto/mdk/blob/main/examples/mvp-site/README.md -->

[gateway-concept]: ../../../backend/core/gateway/README.md
<!-- docs@tether.io: gateway-concept → https://github.com/tetherto/mdk/blob/main/backend/core/gateway/README.md -->
