---
title: Connect an AI agent over MCP
description: Give an AI agent its own service account, grant it app routes in spec.rbac, and call those routes as MCP tools.
docs@tether_slug: guides/agent/connect-over-mcp
---

## Overview

Any MCP client, such as a coding agent, an agent framework or a script, can call an MDK stack's app routes as tools.
The agent signs in as its own service account, `spec.rbac` decides which routes it may call, and `mdk run mcp` serves
those routes as [MCP tools][expose-data] on `/mcp`. Every request carries the agent's bearer token, so each agent sees
only the tools its role allows. This page connects one agent to the `ops` app that `mdk create app ops` scaffolds.

## Prerequisites

- An MDK project with an app, for example from `npx mdk create app ops`. Commands on this page use `npx mdk`, which runs
  the CLI the project's `package.json` depends on.
- The stack running: `npm run dev`, the same as `npx mdk run`

<Steps>

<Step>

### Create the agent's service account

```bash
npx mdk sa add operator-agent
```

This writes the agent's Ed25519 credential to `.mdk/credentials/agents/operator-agent.json`, readable by you only, and
registers its public key with the running Kernel. The account can't call anything yet.

</Step>

<Step>

### Grant it routes in `spec.rbac`

Add a role to `mdk.yaml` and bind the agent to it, beside the roles and bindings `mdk onboard` or `mdk rbac init` wrote:

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

An app route's resource is `<app>/<path>`: the app's name in `spec.apps`, then the route's path. `GET /api/ops/summary`
in the `ops` app is `ops/api/ops/summary`, so `ops/*` covers every route of the app. The verb is the route's `verb`, or
follows its method: `GET` is `get`, `POST` is `create`, `PUT` and `PATCH` are `update`, `DELETE` is `delete`.

Apply the policy:

```bash
npx mdk rbac apply
```

The running Kernel switches to the new policy. Nothing restarts, the MCP server included.

</Step>

<Step>

### Start the MCP server

In a second terminal:

```bash
npx mdk run mcp    # http://localhost:3947/mcp
```

It listens on `spec.mcp.port`, by default the Gateway's port plus 100. Only routes marked `"safety": "read-only"`
[become tools][expose-data] unless it starts with `--allow-write`.

</Step>

<Step>

### Get the agent a token

For a quick test, print one. It lasts 10 minutes:

```bash
TOKEN=$(npx mdk sa token operator-agent)
```

An agent that runs longer signs itself in with its credential and renews the token before it expires.
`@tetherto/mdk-identity` does both, through the Gateway's `POST /auth/token`. Ask the token source for headers on every
`POST /mcp`:

```js
const fs = require('node:fs')
const { ServiceAccountTokenSource, gatewayTokenRequest } = require('@tetherto/mdk-identity')

const { name, privateKeyPem } = JSON.parse(fs.readFileSync('.mdk/credentials/agents/operator-agent.json', 'utf8'))
const source = new ServiceAccountTokenSource({
  name,
  privateKey: privateKeyPem,
  request: gatewayTokenRequest('http://localhost:3847')
})

async function mcpHeaders () {
  return { authorization: `Bearer ${await source.getToken()}` }
}
```

</Step>

<Step>

### Call the tools

List them:

```bash
curl -s -X POST localhost:3947/mcp \
  -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' \
  -H "authorization: Bearer $TOKEN" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

The result lists `ops_summary`, named after the route's `id`, with the route's `description` as its own. Call it:

```bash
curl -s -X POST localhost:3947/mcp \
  -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' \
  -H "authorization: Bearer $TOKEN" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"ops_summary","arguments":{}}}'
```

The tool returns the controller's JSON, `{"ok":true,"kernelConnected":true,"workerCount":1,"deviceCount":1,…}`: the same
body the Gateway returns for `GET /apps/ops/api/ops/summary` with the same token.

To connect an MCP client, point it at `http://localhost:3947/mcp` with the `authorization` header. A client with a fixed
header needs a fresh token every 10 minutes; one that runs your code can use the token source above.

</Step>

</Steps>

## Troubleshooting

| Symptom                           | Cause                                                | Fix                                                     |
| --------------------------------- | ---------------------------------------------------- | ------------------------------------------------------- |
| `401` from `/mcp`                 | No token, or an expired one                          | Send `authorization: Bearer <token>` with a fresh token |
| `tools/list` returns no tools, and a call answers `Tool ops_summary not found` | No rule grants the agent any route | Bind it in `spec.rbac`, then run `npx mdk rbac apply` |
| `ERR_AUTH_FORBIDDEN: operator-agent may not get ops/api/ops/summary` from the Gateway | The agent's rules don't cover that resource and verb | Widen the rule's `resources` or `verbs` |
| `ERR_APP_RUNTIME_UNAVAILABLE`     | The app isn't running                                | Start the stack with `npm run dev`                      |

## Next steps

- [Choose which routes become tools][expose-data]: read-only routes by default, and tools written by hand
- [Secure MCP for agents beyond localhost][security-mcp]: TLS, `allowedHosts` and one service account per agent
- [Deploy the operator agent behind the Gateway][gateway-deployment]: MDK's own chat agent, for people who signed in

## Links

[expose-data]: expose-data.md
<!-- docs@tether.io: expose-data → guides/agent/expose-data -->

[security-mcp]: ../security/index.md#step-7-optional-mcp-and-the-operator-agent
<!-- docs@tether.io: security-mcp → guides/security#step-7-optional-mcp-and-the-operator-agent -->

[gateway-deployment]: gateway-deployment.md
<!-- docs@tether.io: gateway-deployment → guides/agent/gateway-deployment -->
