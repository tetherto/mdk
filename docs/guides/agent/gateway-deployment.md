---
title: Deploy the agent behind the Gateway
description: Mount the conversational operator agent behind the Gateway as a chat API, and drive a session through an approval-gated write
docs@tether_slug: guides/agent/gateway-deployment
---

## Overview

[`@tetherto/mdk-app-agent`][agent-plugin-readme] mounts [`@tetherto/mdk-agent`][agent-core-readme] behind the Gateway as a chat API.

Enable the app for session, message, and approval routes: every write the agent proposes pauses for an operator's
decision. The agent itself still reaches fleet data the way [any AI agent does][ai-agents-mcp], over an MCP server reachable at `agent.mcp.url`
— the standalone `@tetherto/mdk-mcp` process; this app gives a human operator a chat surface to talk to it through.

This is one of [two ways to run the agent][agent-guides-index]. If you've already run it [standalone][run-standalone],
it's the same agent with HTTP on it, not a second product: the same provider, the same MCP client, the same approval gate,
just reached over sessions instead of a REPL.

## Prerequisites

- The [Gateway is running][run-gateway]
- A model is [served on this machine, or reachable on another][serve-the-model], because the app dials the provider rather than starting one
- An [MCP tool server][mcp-server] is reachable, so the agent has fleet tools to call

> [!IMPORTANT]
> The Gateway never starts a model. `config.agent.provider` is a URL it dials, so a first session against a `baseURL` with nothing
> behind it fails with `ERR_AGENT_UNAVAILABLE`. [Serving a model locally with QVAC][serve-the-model] covers the install, the first-run
> download, and the flags a lazily loaded model needs.

<Steps>

<Step>

### Mount the app

Either:
- [Select it during onboarding](#11-a-select-it-during-onboarding), or
- [Already have an `mdk.yaml`? Add it by hand](#11-b-add-it-to-an-existing-mdkyaml)

#### 1.1 A. Select it during onboarding

Run [`mdk onboard`][mdk-onboard] and select [`mdk-app-agent`][agent-plugin-readme] from its app catalog.
`mdk onboard`'s wizard supports creating a compliant `mdk.yaml` from scratch, interactively.
It installs `@tetherto/mdk-app-agent` by package name and writes its `spec.apps` entry with `mount: /`.

> [!NOTE]
> Until `@tetherto/mdk-app-agent` is on npm, install it from [its repository][agent-plugin-readme] with
> `mdk add app github:tetherto/mdk-app-agent`, which writes the same `spec.apps` entry, `mount: /` included.

#### 1.1 B. Add it to an existing `mdk.yaml`

Already have one from a previous onboarding run? Add the app under `spec.apps` by hand, with `mount: /` and the model
provider, the MCP url, and the approval timeout under `agent`. The app resolves from
`node_modules/@tetherto/mdk-app-agent`. For example, a standalone gateway carrying just this app, reaching across
to the [MVP site example][mvp-site-example]'s MCP tool server:

```yaml
apiVersion: mdk/v1
kind: Stack
metadata:
  name: agent-gateway
spec:
  workers: []
  gateway:
    port: 3847
  apps:
    - name: agent
      package: "@tetherto/mdk-app-agent"
      mount: /
      config:
        agent:
          provider: { kind: qvac, model: qwen3-4b, baseURL: http://127.0.0.1:11500/v1 }
          mcp: { url: http://127.0.0.1:3101/mcp }
          approvalTimeoutMs: 120000
```

> [!IMPORTANT]
> Keep `mount: /`. The [agent UI][ui-agent-readme] calls `/agent/sessions…` at the Gateway root; without it the routes live
> under `/apps/agent/agent/sessions…` and the UI gets `404`.

#### 1.2 Run it

Once the `mdk.yaml` names the app, either way, run `mdk run`. It starts the app in its own runtime process and the Gateway
forwards the agent routes to it.

A stack built for just this app declares no Workers, so `mdk run` boots a Kernel it never actually uses
(it only proxies chat to the MVP site's separate MCP server) alongside the app and the Gateway.

> [!IMPORTANT]
> The agent routes are `auth: true`. Unless `gateway.config.authVerifier` names another verifier, `mdk run` uses the built-in
> `loopback` one: a caller on the same machine is the single `local` operator and gets the full chat and approval flow with no
> identity setup, while a remote caller gets `401`. Serving operators on other machines needs a real verifier
> ([Gateway security model](../../../backend/core/gateway/README.md#security-model)). A missing [`config.agent`][agent-plugin-config] block answers `503 ERR_AGENT_UNAVAILABLE` instead of
> failing to load.

</Step>

<Step>

### Create a session and send a message

Use the port your `mdk.yaml` gave the gateway: `3847` in the example above. Note that
the [MVP site][mvp-site-example]'s own gateway (`3000`) never carries the agent app; this is a separate gateway, reaching
across to the MVP site's MCP tool server on `3101`.

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
  config — [how to fix it][agent-plugin-troubleshooting] is in the app's troubleshooting entry
- **The agent routes answer `404`.** The app entry has no `mount: /`, so its routes are served under `/apps/<name>`. Add
  `mount: /` to its `spec.apps` entry
- Every other failure (`503`, `404`, `409`, `400`) maps to a specific cause and fix in
  [the app's error reference][agent-plugin-errors]
- **`npm ci` fails to resolve a stack that mounts only this app.** `@tetherto/mdk-app-agent` declares
  `@tetherto/mdk-agent` as a required dependency, not an optional peer, so the agent package must be installed
  alongside it for `npm ci` to resolve.

## Next steps

- [Read the agent app's route reference][agent-plugin-readme]: session, message, and approval routes, plus the manifest's `setup` fields
- [Understand the underlying agent][agent-core-readme]: the model and its fleet tools
- [Submit and approve write actions][write-actions] from a React app, for the UI-driven shape of this same approval gate

## Links

[run-gateway]: ../gateway/run.md
<!-- docs@tether.io: run-gateway → guides/gateway/run -->

[write-actions]: ../gateway/write-actions.md
<!-- docs@tether.io: write-actions → guides/gateway/write-actions -->

[ai-agents-mcp]: ../../../backend/core/mcp/README.md#ai-agents-and-the-mcp-server
<!-- docs@tether.io: ai-agents-mcp → https://github.com/tetherto/mdk/blob/main/backend/core/mcp/README.md#ai-agents-and-the-mcp-server -->

[agent-plugin-readme]: https://github.com/tetherto/mdk-app-agent
<!-- docs@tether.io: agent-plugin-readme → https://github.com/tetherto/mdk-app-agent -->

[mdk-onboard]: ../cli/install.md#command-groups
<!-- docs@tether.io: mdk-onboard → guides/cli/install#command-groups -->

[agent-plugin-config]: https://github.com/tetherto/mdk-app-agent#configuration
<!-- docs@tether.io: agent-plugin-config → https://github.com/tetherto/mdk-app-agent#configuration -->

[agent-plugin-troubleshooting]: https://github.com/tetherto/mdk-app-agent#troubleshooting
<!-- docs@tether.io: agent-plugin-troubleshooting → https://github.com/tetherto/mdk-app-agent#troubleshooting -->

[agent-plugin-errors]: https://github.com/tetherto/mdk-app-agent#errors
<!-- docs@tether.io: agent-plugin-errors → https://github.com/tetherto/mdk-app-agent#errors -->

[agent-core-readme]: ../../../backend/core/agent/README.md
<!-- docs@tether.io: agent-core-readme → https://github.com/tetherto/mdk/blob/main/backend/core/agent/README.md -->

[serve-the-model]: run-standalone.md#serve-the-model-with-qvac
<!-- docs@tether.io: serve-the-model → guides/agent/run-standalone#serve-the-model-with-qvac -->

[run-standalone]: run-standalone.md
<!-- docs@tether.io: run-standalone → guides/agent/run-standalone -->

[mvp-site-example]: ../../../examples/mvp-site/README.md
<!-- docs@tether.io: mvp-site-example → https://github.com/tetherto/mdk/blob/main/examples/mvp-site/README.md -->

[mcp-server]: ../../../backend/core/mcp/README.md
<!-- docs@tether.io: mcp-server → https://github.com/tetherto/mdk/blob/main/backend/core/mcp/README.md -->

[ui-agent-readme]: ../../../ui/packages/ui-agent/README.md
<!-- docs@tether.io: ui-agent-readme → https://github.com/tetherto/mdk/blob/main/ui/packages/ui-agent/README.md -->

[agent-guides-index]: index.md
<!-- docs@tether.io: agent-guides-index → guides/agent -->
