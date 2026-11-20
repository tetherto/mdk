---
title: Deploy the agent behind the Gateway
description: Mount the conversational operator agent behind the Gateway as a chat API, and drive a session through an approval-gated write
docs@tether_slug: guides/agent/gateway-deployment
---

## Overview

[`@tetherto/mdk-app-agent`][agent-plugin-readme] mounts [`@tetherto/mdk-agent`][agent-core-readme] behind the Gateway as a chat API.

Enable the app for session, message, and approval routes: every write the agent proposes pauses for an operator's
decision. The agent itself still reaches fleet data the way [any AI agent does][ai-agents-mcp], over an MCP server reachable at
`agent.mcp.url`: the standalone `@tetherto/mdk-mcp` process. Against a stack's `mdk run mcp`, the agent signs in as its own service
account. This app gives a human operator a chat surface to talk to it through.

This is one of [two ways to run the agent][agent-guides-index]. If you've already run it [standalone][run-standalone],
it's the same agent with HTTP on it, not a second product: the same provider, the same MCP client, the same approval gate,
just reached over sessions instead of a REPL.

## Prerequisites

- The [Gateway is running][run-gateway]
- A model is [served on this machine, or reachable on another][serve-the-model], because the app dials the provider rather than starting one
- An [MCP tool server][mcp-server] is reachable, so the agent has fleet tools to call: `mdk run mcp` in this stack, or another stack's

> [!IMPORTANT]
> The Gateway never starts a model. `config.agent.provider` is a URL it dials, so against a `baseURL` with nothing behind it
> `POST /agent/sessions` still succeeds, and the first message's stream ends with an SSE `event: error` saying
> "the assistant could not reach its model". [Serving a model locally with QVAC][serve-the-model] covers the install, the first-run
> download, and the flags a lazily loaded model needs.

<Steps>

<Step>

### Mount the app

Either:
- [Select it during onboarding](#a-select-it-during-onboarding), or
- [Already have an `mdk.yaml`? Add it by hand](#b-add-it-to-an-existing-mdkyaml)

#### A Select it during onboarding

Run [`mdk onboard`][mdk-onboard] and select [`mdk-app-agent`][agent-plugin-readme] from its app catalog.
`mdk onboard`'s wizard supports creating a compliant `mdk.yaml` from scratch, interactively.
It installs `@tetherto/mdk-app-agent` from [its public repository][agent-plugin-readme] and writes its `spec.apps` entry with `mount: /`.

> [!NOTE]
> The app is not on npm, so onboarding installs `github:tetherto/mdk-app-agent`. The dependency onboarding records in
> `package.json` carries no version or ref, so the commit is pinned by your lockfile rather than by the manifest.
> `mdk add app github:tetherto/mdk-app-agent` writes the resolved commit into `package.json` as well. Commit the
> lockfile: without one, a later install resolves whatever that repository's default branch points at. Installing from
> GitHub needs CLI 0.13.1 or later. The 0.13.0 CLI installs the app by package name, which fails because it is not on
> npm: on 0.13.0, leave the app out of the wizard and run `mdk add app github:tetherto/mdk-app-agent` after onboarding,
> which writes the same `spec.apps` entry, `mount: /` included.

#### B Add it to an existing `mdk.yaml`

Already have one from a previous onboarding run? Add the app under `spec.apps` by hand, with `mount: /` and the model
provider, the MCP url, and the approval timeout under `agent`. The app resolves from
`node_modules/@tetherto/mdk-app-agent`, and it is not on npm, so install it from its repository first, from the project
directory:

```bash
npm install github:tetherto/mdk-app-agent
```

Commit the lockfile, for the reason in the note under option A. Then add this item to the `spec.apps` list of your
[`mdk.yaml`][mdk-yaml], creating `apps:` under the existing `spec` if it has none. This one reaches across to the
[MVP site example][mvp-site-example]'s MCP tool server:

```yaml
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

Once the `mdk.yaml` names the app, either way, write the access policy before the first run:

```bash
mdk rbac init
```

`mdk run` refuses a stack whose `spec.rbac` binds nobody, because the Kernel would boot with nobody able to administer it.
`mdk rbac init` writes the starter policy: an `admin` role, the CLI bound to it, and the Gateway and MCP server bound to
read policy. [Step 4 of the security blueprint][security-policy] covers what it writes and how to change it.

Then run `mdk run`. It starts the app in its own runtime process and the Gateway forwards the agent routes to it.

A stack built for just this app declares no Workers, so `mdk run` boots a Kernel it never actually uses
(it only proxies chat to the MVP site's separate MCP server) alongside the app and the Gateway.

> [!IMPORTANT]
> The agent routes are `auth: true`, so each one is checked against `spec.rbac` and needs an access token. A call without one
> answers [`401 ERR_AUTH_UNAUTHORIZED`][app-route-errors]. [Create the first operator][first-operator] with `mdk user add <name> --admin` while
> the stack is running, then sign in at `POST /auth/login` and send the `accessToken` it returns as
> `Authorization: Bearer <token>` ([Gateway security model][gateway-security]).
> A missing [`config.agent`][agent-plugin-config] block
> answers `503 ERR_AGENT_UNAVAILABLE` instead of failing to load.

</Step>

<Step>

### Give the agent a service account

`mdk run mcp` checks every agent against `spec.rbac`, so the agent signs in to it as its own service account. Without
one, creating a session answers `503 ERR_AGENT_UNAVAILABLE: the MCP server at <url> answered 401`. The
[MVP site example][mvp-site-example]'s MCP tool server on `3101` checks no token: against it, skip this step.

#### 2.1 Create the account

With the stack running, from the project directory:

```bash
mdk sa add operator-agent
```

This writes the agent's credential to `.mdk/credentials/agents/operator-agent.json`, readable by you only, and registers
its public key with the running Kernel.

#### 2.2 Grant it the tools it may call

Bind the account to a role in `mdk.yaml`, beside the roles and bindings `mdk rbac init` wrote. An MCP tool generated from
an app route needs the route's resource, `<app>/<path>`, and verb, so this role lets the agent call every read route of
an `ops` app:

```yaml
spec:
  rbac:
    roles:
      - name: ops-viewer
        rules:
          - resources: [ops/*]
            verbs: [get, list]
    bindings:
      - role: ops-viewer
        subjects:
          - kind: ServiceAccount
            name: operator-agent
```

Apply the policy:

```bash
mdk rbac apply
```

[Connect an AI agent over MCP][connect-over-mcp] covers how a route maps to a resource and a verb.

#### 2.3 Point the agent at the account

Add the credential under `agent.mcp`, with the stack's Gateway, where the account signs in. The app runs from the
project directory, so the path is relative to it:

```yaml
      config:
        agent:
          provider: { kind: qvac, model: qwen3-4b, baseURL: http://127.0.0.1:11500/v1 }
          mcp:
            url: http://127.0.0.1:3947/mcp
            credential:
              file: .mdk/credentials/agents/operator-agent.json
              gatewayUrl: http://127.0.0.1:3847
          strictToolGating: false
          capability: mid
          approvalTimeoutMs: 120000
```

The agent sends an access token on every MCP request and renews it before it expires. Tools generated from app routes
carry no agent contract, so `strictToolGating: false` with `capability: mid` (or `large`) is what admits them.

> [!NOTE]
> For a quick test, `agent.mcp.token` takes a fixed token from `mdk sa token operator-agent` in place of `credential`. It
> lasts 10 minutes, after which every tool call fails until the app restarts with a new one.

#### 2.4 Restart and start the MCP server

Restart `mdk run` so the app reads its new config, then start the MCP server in a second terminal:

```bash
mdk run mcp    # http://localhost:3947/mcp
```

`mdk run` never starts it. It listens on `spec.mcp.port`, by default the Gateway's port plus 100.

</Step>

<Step>

### Create a session and send a message

Use the port your `mdk.yaml` gave the gateway: `3847` in the example above. Note that
the [MVP site][mvp-site-example]'s own gateway (`3000`) never carries the agent app; this is a separate gateway, reaching
across to the MVP site's MCP tool server on `3101`.

Sign in first. The access token comes back in the response body; every call below carries it.

```bash
TOKEN=$(curl -s -X POST http://localhost:<port>/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"<name>","password":"<password>"}' | jq -r .accessToken)

curl -X POST http://localhost:<port>/agent/sessions \
  -H "Authorization: Bearer $TOKEN"
# {"sessionId":"..."}

curl -N -X POST http://localhost:<port>/agent/sessions/<id>/messages \
  -H "Authorization: Bearer $TOKEN" \
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
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"approved":true}'
```

Approving resumes the same stream: the tool runs for real, and the turn continues to its `token` and `done` events. Rejecting
resolves to false, and the write never runs. Letting the approval window (`approvalTimeoutMs`) expire blocks the write the same
way. With `@tetherto/mdk-agent` 0.13.1 and an `mdk-app-agent` build that depends on it, the `tool_result` then reads
`(no operator decision — approval expired, not executed)`, and the agent says no approval arrived in time. Earlier builds,
including the 0.13.0 agent, report an expired approval as an operator rejection. Disconnecting while an approval is pending
ends the turn: the write never runs, and the stream sends no `tool_result`.

</Step>

</Steps>

## Troubleshooting

- **Creating a session answers `503 ERR_AGENT_UNAVAILABLE: the MCP server at <url> answered 401: set mcp.credential to the
  agent's service account`.** The MCP server checks agents against `spec.rbac` and the agent sent no token. Give the agent
  [a service account](#give-the-agent-a-service-account) under `agent.mcp.credential`
- **Creating a session answers `503 ERR_AGENT_UNAVAILABLE: ERR_IDENTITY_ASSERTION_INVALID: unknown service account`.** The
  Kernel at `agent.mcp.credential.gatewayUrl` has no such account. Run `mdk sa add <name>` against this stack, and check
  `gatewayUrl` is this stack's Gateway
- **Creating a session answers `503 ERR_AGENT_UNAVAILABLE: … answered 401: its token was refused`.** The token was issued by
  another stack, or `agent.mcp.token` has expired. Point `gatewayUrl` at the Gateway of the stack `mdk run mcp` belongs to,
  or replace the fixed token with `credential`
- **Sessions work and `agent.mcp.credential` is set, but the agent never calls a tool.** `mdk run mcp` lists only the
  tools the account's roles allow, and no rule grants it a route. Bind it to a role in `spec.rbac`, run `mdk rbac apply`,
  then restart `mdk run`: the agent reads its tool list once, when the first session creates it
- **Sessions and messages work, but the agent never calls a tool.** `agent.mcp` (or its `url`) is missing from the
  config — [how to fix it][agent-plugin-troubleshooting] is in the app's troubleshooting entry
- **The agent never calls the tools your app's routes produce.** Under the default `strictToolGating`, the agent admits
  only tools that carry an agent contract, and tools generated from app routes carry none, so it skips them. `mdk-app-agent`
  builds after 0.13.0 log `agent skipped N MCP tool(s)` with each tool and reason when the agent is created. To admit them, set
  `strictToolGating: false` and `capability: mid` (or `large`) under `agent`, for a model strong enough to use tools without a contract
- **Every agent route answers `401`.** No access token on the call, or an expired one. Sign in again at
  `POST /auth/login` and resend with `Authorization: Bearer <token>`
- **The agent routes answer `404`.** The app entry has no `mount: /`, so its routes are served under `/apps/<name>`. Add
  `mount: /` to its `spec.apps` entry
- Every other failure (`503`, `404`, `409`, `400`) maps to a specific cause and fix in
  [the app's error reference][agent-plugin-errors]
- **`npm ci` fails to resolve a stack that mounts only this app.** `@tetherto/mdk-app-agent` declares
  `@tetherto/mdk-agent` as a required dependency, not an optional peer, so the agent package must be installed
  alongside it for `npm ci` to resolve.

## Next steps

- [Read the agent app's route reference][agent-plugin-readme]: session, message, and approval routes, plus the manifest's `setup` fields
- [Get the agent app][supported-apps-availability]: its public repository, and why the onboarding catalog cannot install it yet
- [Understand the underlying agent][agent-core-readme]: the model and its fleet tools
- [Submit and approve write actions][write-actions] from a React app, for the UI-driven shape of this same approval gate

## Links

[run-gateway]: ../gateway/run.md
<!-- docs@tether.io: run-gateway → guides/gateway/run -->

[mdk-yaml]: ../../reference/mdk-yaml.md
<!-- docs@tether.io: mdk-yaml → reference/mdk-yaml -->

[first-operator]: ../security/create-the-first-operator.md
<!-- docs@tether.io: first-operator → guides/security/create-the-first-operator -->

[security-policy]: ../security/index.md#step-4-write-the-policy-and-put-identity-in-the-gateway
<!-- docs@tether.io: security-policy → guides/security#step-4-write-the-policy-and-put-identity-in-the-gateway -->

[write-actions]: ../gateway/write-actions.md
<!-- docs@tether.io: write-actions → guides/gateway/write-actions -->

[ai-agents-mcp]: ../../../backend/core/mcp/README.md#ai-agents-and-the-mcp-server
<!-- docs@tether.io: ai-agents-mcp → https://github.com/tetherto/mdk/blob/main/backend/core/mcp/README.md#ai-agents-and-the-mcp-server -->

[agent-plugin-readme]: https://github.com/tetherto/mdk-app-agent
<!-- docs@tether.io: agent-plugin-readme → https://github.com/tetherto/mdk-app-agent -->

[supported-apps-availability]: ../../reference/supported-apps.md#availability
<!-- docs@tether.io: supported-apps-availability → reference/supported-apps#availability -->

[mdk-onboard]: ../cli/install.md#command-groups
<!-- docs@tether.io: mdk-onboard → guides/cli/run-with-npm#command-groups -->

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

[connect-over-mcp]: connect-over-mcp.md
<!-- docs@tether.io: connect-over-mcp → guides/agent/connect-over-mcp -->

[mcp-server]: ../../../backend/core/mcp/README.md
<!-- docs@tether.io: mcp-server → https://github.com/tetherto/mdk/blob/main/backend/core/mcp/README.md -->

[ui-agent-readme]: ../../../ui/packages/ui-agent/README.md
<!-- docs@tether.io: ui-agent-readme → https://github.com/tetherto/mdk/blob/main/ui/packages/ui-agent/README.md -->

[agent-guides-index]: index.md
<!-- docs@tether.io: agent-guides-index → guides/agent -->

[app-route-errors]: ../../../backend/core/gateway/docs/http-api.md#errors-on-every-app-route
<!-- docs@tether.io: app-route-errors → https://github.com/tetherto/mdk/blob/main/backend/core/gateway/docs/http-api.md#errors-on-every-app-route -->

[gateway-security]: ../../../backend/core/gateway/README.md#security-model
<!-- docs@tether.io: gateway-security → https://github.com/tetherto/mdk/blob/main/backend/core/gateway/README.md#security-model -->
