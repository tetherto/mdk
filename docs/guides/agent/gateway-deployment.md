---
title: Deploy the agent behind the Gateway
description: Mount the conversational operator agent behind the Gateway as a chat API, and drive a session through an approval-gated write
docs@tether_slug: guides/agent/gateway-deployment
---

## Overview

[`@tetherto/mdk-plugin-agent`][agent-plugin-readme] mounts [`@tetherto/mdk-agent`][agent-core-readme] behind the Gateway as a chat API.

Enable the plugin for session, message, and approval routes: every write the agent proposes pauses for an operator's
decision. The agent itself still reaches fleet data the way [any AI agent does][ai-agents-mcp], over an MCP server reachable at `agent.mcp.url`
— the standalone `@tetherto/mdk-mcp` process; this plugin gives a human operator a chat surface to talk to it through.

This is one of [two ways to run the agent][agent-guides-index]. If you've already run it [standalone][run-standalone],
it's the same agent with HTTP on it, not a second product: the same provider, the same MCP client, the same approval gate,
just reached over sessions instead of a REPL.

## Prerequisites

- The [Gateway is running][run-gateway]
- A model is [served on this machine, or reachable on another][serve-the-model], because the plugin dials the provider rather than starting one
- An [MCP tool server][mcp-server] is reachable, so the agent has fleet tools to call

> [!IMPORTANT]
> The Gateway never starts a model. `config.agent.provider` is a URL it dials, so a first session against a `baseURL` with nothing
> behind it fails with `ERR_AGENT_UNAVAILABLE`. [Serving a model locally with QVAC][serve-the-model] covers the install, the first-run
> download, and the flags a lazily loaded model needs.

<Steps>

<Step>

### Mount the plugin

Either:
- [Select it during onboarding](#11-a-select-it-during-onboarding), or
- [Already have an `mdk.yaml`? Add it by hand](#11-b-add-it-to-an-existing-mdkyaml)

#### 1.1 A. Select it during onboarding

Run [`mdk onboard`][mdk-onboard] and select [`mdk-plugin-agent`][agent-plugin-readme] from its Gateway plugin catalog.
`mdk onboard`'s wizard supports creating a compliant `mdk.yaml` from scratch, interactively.
Its entry carries a real `repoPath` ([`backend/plugins/agent`][agent-plugin-readme]), not a stub, so selecting it installs
a working plugin rather than a placeholder.

#### 1.1 B. Add it to an existing `mdk.yaml`

Already have one from a previous onboarding run? Add the plugin under `spec.gateway.plugins` by hand, with the model
provider, the MCP url, and the approval timeout under `agent`. Once published, that directory is
`node_modules/@tetherto/mdk-plugin-agent`; in this monorepo checkout it is
[`backend/plugins/agent`][agent-plugin-readme]. For example, a standalone gateway carrying just this plugin, reaching across
to the [full-site example][full-site-example]'s MCP tool server:

```yaml
apiVersion: mdk/v1
kind: Stack
metadata:
  name: agent-gateway
spec:
  workers: []
  gateway:
    port: 3847
    plugins:
      - package: "@tetherto/mdk-plugin-agent"
        config:
          agent:
            provider: { kind: qvac, model: qwen3-4b, baseURL: http://127.0.0.1:11500/v1 }
            mcp: { url: http://127.0.0.1:3008/mcp }
            approvalTimeoutMs: 120000
```

#### 1.2 Run it

Once the `mdk.yaml` names the plugin, either way, run `mdk run all`.

A stack built for just this plugin declares no Workers, so `all` boots a Kernel it never actually uses
(it only proxies chat to full-site's separate MCP server) alongside the Gateway.

> [!IMPORTANT]
> No auth plugin means every request binds to a single `local` operator, so a perimeter-trusted deployment gets the full chat and
> approval flow with no identity setup at all. A missing [`config.agent`][agent-plugin-config] block answers `503 ERR_AGENT_UNAVAILABLE` instead of
> failing to load.

</Step>

<Step>

### Create a session and send a message

Use the port your `mdk.yaml` gave the gateway: `3847` in the example above. Note that
[full-site][full-site-example]'s own gateway (`3007`) never carries the agent plugin; this is a separate gateway, reaching
across to full-site's MCP tool server on `3008`.

```bash
curl -X POST http://localhost:<port>/agent/sessions
# {"sessionId":"..."}

curl -N -X POST http://localhost:<port>/agent/sessions/<id>/messages \
  -H 'Content-Type: application/json' \
  -d '{"text":"how many miners are on the site?"}'
```

The response streams as `text/event-stream`. A read-only question ends in `tool_call`, `tool_result`, `token`, and `done`
events, each stamped with the turn's `turnId` and a monotonic `seq`.

</Step>

<Step>

### Approve a write

A write action pauses the turn instead of running it:

```text
event: pending_approval
data: {"type":"pending_approval","name":"act_device","args":{"ref":"whatsminer-0","action":"reboot"},"approvalId":"..."}
```

Decide it from the paused stream's `approvalId`:

```bash
curl -X POST http://localhost:<port>/agent/sessions/<id>/approvals/<approvalId> \
  -H 'Content-Type: application/json' \
  -d '{"approved":true}'
```

Approving resumes the same stream: the tool runs for real, and the turn continues to its `token` and `done` events. Rejecting,
or letting the approval window expire, resolves to false, and the write never runs.

</Step>

</Steps>

## Troubleshooting

- **Sessions and messages work, but the agent never calls a tool.** `agent.mcp` (or its `url`) is missing from the
  config — [how to fix it][agent-plugin-troubleshooting] is in the plugin's troubleshooting entry
- Every other failure (`503`, `404`, `409`, `400`) maps to a specific cause and fix in
  [the plugin's error reference][agent-plugin-errors]
- **`npm ci` fails to resolve a stack that mounts only this plugin.** `@tetherto/mdk-plugin-agent` declares
  `@tetherto/mdk-agent` as a required dependency, not an optional peer, so the agent package must be installed
  alongside it for `npm ci` to resolve.

## Next steps

- [Read the agent plugin's route reference][agent-plugin-readme]: session, message, and approval routes, plus the manifest's `setup` fields
- [Understand the underlying agent][agent-core-readme]: the model, its fleet tools, and the eval battery that scores it
- [Submit and approve write actions][write-actions] from a React app, for the UI-driven shape of this same approval gate

## Links

[run-gateway]: ../gateway/run.md
<!-- docs@tether.io: run-gateway → guides/gateway/run -->

[write-actions]: ../gateway/write-actions.md
<!-- docs@tether.io: write-actions → guides/gateway/write-actions -->

[ai-agents-mcp]: ../../../backend/core/mcp/README.md#ai-agents-and-the-mcp-server
<!-- docs@tether.io: ai-agents-mcp → https://github.com/tetherto/mdk/blob/main/backend/core/mcp/README.md#ai-agents-and-the-mcp-server -->

[agent-plugin-readme]: ../../../backend/plugins/agent/README.md
<!-- docs@tether.io: agent-plugin-readme → https://github.com/tetherto/mdk/blob/main/backend/plugins/agent/README.md -->

[mdk-onboard]: ../cli/install.md#command-groups
<!-- docs@tether.io: mdk-onboard → guides/cli/install#command-groups -->

[agent-plugin-config]: ../../../backend/plugins/agent/README.md#configuration
<!-- docs@tether.io: agent-plugin-config → https://github.com/tetherto/mdk/blob/main/backend/plugins/agent/README.md#configuration -->

[agent-plugin-troubleshooting]: ../../../backend/plugins/agent/README.md#troubleshooting
<!-- docs@tether.io: agent-plugin-troubleshooting → https://github.com/tetherto/mdk/blob/main/backend/plugins/agent/README.md#troubleshooting -->

[agent-plugin-errors]: ../../../backend/plugins/agent/README.md#errors
<!-- docs@tether.io: agent-plugin-errors → https://github.com/tetherto/mdk/blob/main/backend/plugins/agent/README.md#errors -->

[agent-core-readme]: ../../../backend/core/agent/README.md
<!-- docs@tether.io: agent-core-readme → https://github.com/tetherto/mdk/blob/main/backend/core/agent/README.md -->

[serve-the-model]: run-standalone.md#serve-the-model-with-qvac
<!-- docs@tether.io: serve-the-model → guides/agent/run-standalone#serve-the-model-with-qvac -->

[run-standalone]: run-standalone.md
<!-- docs@tether.io: run-standalone → guides/agent/run-standalone -->

[full-site-example]: ../../../examples/full-site/README.md
<!-- docs@tether.io: full-site-example → https://github.com/tetherto/mdk/blob/main/examples/full-site/README.md -->

[mcp-server]: ../../../examples/full-site/docs/mcp-server.md
<!-- docs@tether.io: mcp-server → https://github.com/tetherto/mdk/blob/main/examples/full-site/docs/mcp-server.md -->

[agent-guides-index]: index.md
<!-- docs@tether.io: agent-guides-index → guides/agent -->
