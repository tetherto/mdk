---
title: Site security blueprint
description: Steps, options, and suggestions for securing an enterprise MDK site assembled from UI, Gateway, Kernel, and Workers
docs@tether_slug: guides/security
---

> [!WARNING]
> MDK ships no user identity at any tier. The Gateway serves every plugin route to any caller, Kernel inspects no human identity, and
> `WorkerRuntime` applies no caller allowlist. Identity, allowlists, TLS, and network policy are part of the site you build, not defaults
> the SDK turns on. Treat [`mvp-site`](../../../examples/mvp-site/README.md), [`full-site`](../../../examples/full-site/README.md), and per-family snippets as boot demos, not a production template.

## Overview

This page is a blueprint for securing an enterprise site you assemble from MDK: UI, Gateway, Kernel, and Workers on separate hosts or
containers. Walk the steps in order. Each step names what to do, the options MDK actually gives you, and a suggested default. Use it
with the [security boundaries][security-boundaries] concept (what each layer trusts) and the [control plane][control-plane] (how a
request travels).

MDK leaves these controls to you on purpose. The SDK coordinates devices; your site owns who may talk to it.

## Constraints the SDK does not lift

Build around these. They are current `0.y.z` behavior, not optional extras.

| Layer   | What MDK does                                                                          | What you own       |
| ------- | -------------------------------------------------------------------------------------- | ------------------ |
| UI      | Token attachment if you pass an `AuthProvider`; no route guards ship with the toolkit  | Session, HTTPS, `apiBaseUrl`, hiding write controls |
| Gateway | Plugin host over HTTP. Manifest `"auth"` / `"permissions"` have no reader. Bundled `@tetherto/mdk-plugin-auth` is not wired. | Identity checks in every controller |
| Kernel  | Encrypted HRPC. Optional caller-key allowlist (`auth.whitelist`, default empty). `authPerms` only on approval-gated writes, taken from the caller. | Allowlist, mapping verified roles to `authPerms` / `voter` |
| Workers | Noise transport and key-addressed HRPC. No caller allowlist. No actor in handler context. | Network isolation, secrets, payload checks, audit upstream |
| MCP / agent | `POST /mcp` on `127.0.0.1` with no user auth. Agent plugin binds to `local` without an identity layer. | Bind policy, human approval for writes, real `userId` |
| Devices / pools | Vendor protocol APIs and authentication | Device-network isolation |

Consumers enter through the Gateway; AI agents enter through the standalone MCP server. The browser never holds a Kernel key. Direct Kernel or Worker
reachability is a backend-network concern, not a product feature.

## Blueprint

<Steps>

<Step>

### Step 1: Choose a network layout

Pick a [deployment topology][deployment-topologies] before you write auth code. Isolation is the first control; identity sits on top of it.

#### Options

| Option                 | When to pick it                        | Trade-off                                                |
| ---------------------- | -------------------------------------- | -------------------------------------------------------- |
| Single process         | Local demos, tests, smallest footprint | One heap. A compromise of the process is the whole site. |
| Local (one OS process per service, shared directory) | One machine, production-like restarts, or a step toward microservices | Stronger isolation than a single heap. Kernel and Workers still share the host. No DHT. |
| Microservices over DHT | Enterprise sites: separate hosts or containers, resource limits per service, Workers away from Kernel | Peers that know the discovery topic can find Kernel and Workers. Key distribution and a Kernel allowlist are mandatory. |

Suggested default: [microservices][deployment-topologies] (one process or container per service, discovery over DHT), with three
networks you define:

- Operator: UI origin and Gateway HTTP, behind TLS and a reverse proxy you control
- Backend: Kernel and Workers on separate hosts, no inbound path from browsers or agents
- Devices: miner, container, meter, and pool APIs, reachable only from the Workers that own them

Pass the Kernel public key to a remote Gateway as `kernelKey`. Treat the DHT discovery topic as deployment configuration, not a
credential: generate a site-specific topic, distribute it out of band, and do not reuse example or well-known values. Pair this
shape with a non-empty Kernel allowlist in the next step. Without that allowlist, DHT makes Kernel reachable to any peer that has
the topic and the listener key.

Do not pass [`@tetherto/mdk-client`](../../../backend/core/client/README.md) or Kernel keys into the browser. HTTP to the Gateway is the only operator path.

</Step>

<Step>

### Step 2: Admit the Gateway to Kernel

Pre v1.0, [`auth.whitelist`][kernel-auth-api] defaults to `[]` and admits any HRPC caller that knows Kernel's public key. A production Kernel always
has a non-empty allowlist.

#### Options

| Option          | When to pick it        | Trade-off                                                                                        |
| --------------- | ---------------------- | ------------------------------------------------------------------------------------------------ |
| Empty allowlist | Local development only | Anyone with the Kernel public key can read telemetry and dispatch commands, skipping the Gateway |
| Allowlist the Gateway DHT public key | Every real site | The key is stable across restarts (persisted seed); guard it like a production credential |
| Allowlist Gateway plus extra backend clients | A second `mdk-client` service you trust (batch jobs, a second Gateway, the standalone MCP server) | Each extra key is a full Kernel principal. Review it like a production credential. |

Suggested default: one persistent Gateway key pair, that hex public key only, on Kernel:

```js
const kernel = await getKernel({
  hrpc: { whitelist: ['<gateway-dht-public-key-hex>'] }
})
```

The [auth allowlist example][auth-whitelist] shows the exchange. Generate the Gateway key once, store it with the same care as a TLS
key, and put it on the allowlist. The Gateway derives its key from a persisted seed, so it stays stable across restarts — no need to
re-check after a bounce.

The standalone MCP server (`mdk run mcp`) is a separate Kernel caller with its own persistent key. Add it to `auth.whitelist`
alongside the Gateway, or its tools can't reach Kernel on a site with a non-empty allowlist.

On separate hosts, pass Kernel's public key to the Gateway as `kernelKey`. Do not rely on the well-known key file
(`<tmpdir>/mdk/.kernel-key`) across machines. Where that file still exists on the Kernel host, keep it mode `0600` on a directory you
own; it is not deleted on shutdown. Do not expose Kernel's HRPC listener off the backend network.

</Step>

<Step>

### Step 3: Isolate Workers and devices

[`WorkerRuntime`][worker-runtime] does not enforce a caller allowlist. Any backend peer that can reach a Worker and address its public key may send
[`command.request`][kernel-command-dispatcher]. Kernel's allowlist does not protect a Worker that is dialed directly.
[Security boundaries][security-boundaries] give the trust-boundary rationale behind the controls below.

#### Options

| Option                                               | When to pick it | Trade-off                                                                   |
| ---------------------------------------------------- | --------------- | --------------------------------------------------------------------------- |
| Workers only on the Kernel network, keys unpublished | Every site      | Operational discipline: no Worker port or DHT topic on the operator network |
| One Worker process per trust zone | Different device families or vendors must not share credentials | More processes to supervise                    |
| Device APIs on a third network (CGMiner `4028`, miner HTTP, container APIs) | Real hardware | Required when the vendor protocol has weak or no auth (Avalon / CGMiner have none; Antminer uses digest auth; Whatsminer uses a device password) |

Suggested default: persist each Worker's `storeDir` so its key is stable, treat that key as a machine identity, and register the Worker
with Kernel only after the device network is isolated. On DHT, keep Worker public keys and the discovery topic off the operator network
and out of git. Inject device passwords and pool API keys from a secret manager or protected environment. Never put secrets in
`mdk-contract.json`, git, or a committed seed file.

Validate command payloads again in the handler (types, ranges, allowed targets). Kernel checks the command name against the contract;
it does not know your hardware's unsafe parameter combinations. Redact credentials and vendor responses in handler errors and logs.
For CGMiner-style devices, network isolation is the control: changing the Worker `password` field does not add a wire handshake the
protocol lacks.

</Step>

<Step>

### Step 4: Put identity in Gateway controllers

The Gateway is the only supported user-auth seam. Every [bundled plugin][supported-plugins-bundled] is served to any caller.
Paths under `/auth/metrics/*` are historical names, not a login gate. Manifest `"auth": true` changes nothing.

Do not mount `@tetherto/mdk-plugin-auth` expecting it to work. The Gateway does not register it, and its controllers still expect
`ctx.authLib`, a `services` argument, and `req._info.user`, which the current host does not provide.

#### Options

| Option                                  | When to pick it | Trade-off                             |
| --------------------------------------- | --------------- | ------------------------------------- |
| Your SSO (OIDC / SAML / existing IdP), validated in each controller | Production sites with an identity provider | You write the plugin: this is the supported path |
| Gateway-issued JWT after an OAuth redirect you implement (`/oauth/...` → `?authToken=`, plus `POST /auth/token` and `/auth/userinfo`) | Browser UI using `gatewayRedirectAuth({ oauthBaseUrl })` | You still write those routes. The bundled auth plugin is not a substitute. |
| Bearer tokens only (`Authorization: Bearer`), no browser redirect | Service accounts, scripts, or a UI that already has a token | Pair with `bearerTokenAuth()` in the UI |
| No identity (`noAuth()`, or nothing in the controller) | Laptop demos bound to loopback | Anyone who can reach the port has the fleet |

Suggested default: one identity helper shared by every controller. Map verified roles onto Kernel `authPerms` (`miner:w`,
`container:w`, and any others you define). Never accept `authPerms` or `voter` from the HTTP client. Reject missing tokens with
`401` and missing perms with `403`, setting `err.statusCode` so the Gateway does not collapse them to `400`.

```js
// The controller does the check; the Gateway plugins guide (linked below) owns the full example.
if (!token) throw Object.assign(new Error('ERR_UNAUTHORIZED'), { statusCode: 401 })
if (!permissions.includes('miner:w')) throw Object.assign(new Error('ERR_FORBIDDEN'), { statusCode: 403 })
```

> [!NOTE]
> The Gateway returns one error body, `{ statusCode, error, message }`, and sanitizes `message`: only `ERR_*` codes and
> Fastify's own 4xx errors (validation, content type, body size) reach the client verbatim. Any other message is replaced
> with the generic status text and the real error is logged, so an internal failure never surfaces its detail to the caller.

The [Gateway plugins guide][plugins-auth] owns this pattern. Also:

- Bind HTTP to the proxy network, not a public interface without that proxy
- Rate-limit writes. The Gateway honors `?overwriteCache=true` only on a request that carries an `Authorization` header, but it
  cannot validate that header: on a route whose controller checks no token, any caller who sends one still bypasses the cache
- The HTTP worker sets `trustProxy: true`. Only do that behind a proxy whose hop count you trust, or client IPs can be spoofed
- Log actor, route, target, command, outcome, and a correlation id for every write. Redact secrets. Worker handlers cannot see
  actor identity, so this audit stays in the Gateway

</Step>

<Step>

### Step 5: Authorize writes

Kernel treats two write paths differently. Choose per action, then enforce the choice in the Gateway. Direct `command.request` has
**no** Kernel-side permission check. Approval-gated writes read `authPerms`, but that array is caller-supplied once the HRPC
connection is accepted.

#### Options

| Option                                | When to pick it | Trade-off                               |
| ------------------------------------- | --------------- | --------------------------------------- |
| Direct command (`command.request`) after a Gateway perm check | Low-impact, operator-in-front actions (LED, a single-device reboot you already authorized) | Fast. Kernel does not second-guess the caller. A missing controller check is full control. |
| Approval-gated write ([`action.push`][kernel-action-manager], then votes) | Fleet-changing actions: power mode, pool assignment, container PDU, bulk reboot | Slower. Still requires the Gateway to set `authPerms` and `voter` from the verified token. The [write-actions guide][write-actions] covers the HTTP side. |
| Agent-proposed write with a human approval pause | Operator agent (`approvalTimeoutMs` on [`@tetherto/mdk-plugin-agent`](../../../backend/plugins/agent/README.md)) | The model cannot execute a write until someone approves. Without identity, every request is the same `local` operator. |

Suggested default: approval-gated writes for anything that changes hash, power, or network membership; direct commands only behind a
controller that already checked a token. Do not expose a raw `sendCommand` route to the UI without that check.

</Step>

<Step>

### Step 6: Wire the UI session

[`<MdkProvider auth={...}>`][mdk-provider-auth] is how the browser attaches a credential. The toolkit does not guard routes or deny writes on its own.

#### Options

| Option                                  | When to pick it | Trade-off                             |
| --------------------------------------- | --------------- | ------------------------------------- |
| `noAuth()` | Fixture-backed demos, open APIs on loopback | No token. A finished-looking dashboard still sends unauthenticated calls. |
| `bearerTokenAuth()` | You already issue JWTs from the Gateway identity plugin | Session ends on `401`. You own login UI. |
| `gatewayRedirectAuth({ oauthBaseUrl })` | OAuth redirect, `?authToken=` capture, refresh against `POST /auth/token` | Needs *your* token routes. Default `MdkProvider` auth without `oauthBaseUrl` cannot sign in. |
| Custom `AuthProvider` | A session model the three presets do not cover | You implement `getToken`, refresh, and sign-out |

Suggested default for a production dashboard:

- `<MdkProvider apiBaseUrl={httpsOrigin} auth={bearerTokenAuth()}>` or `gatewayRedirectAuth({ oauthBaseUrl })` after those routes exist
- HTTPS, a real `apiBaseUrl`, no Vite dev proxy
- One fetch client so pages cannot skip `Authorization`
- Route guards on any view that can mutate the fleet (the shell template uses `<RequireAuth>`; copy that idea, not `noAuth()`)
- Hide write controls unless the token carries the matching permission. Hiding is not authorization; the Gateway still denies
- Scrub `?authToken=` from the URL after capture. Tokens in query strings leak through access logs and Referer
- Static bundle behind the same proxy that terminates TLS. Do not run `vite dev` as the production UI

The full-site example UI has no sign-in, no session, and a hardcoded profile. Do not copy that into a reachable host.

</Step>

<Step>

### Step 7: (Optional) MCP and the operator agent

MCP is optional. When you enable it, it has the same authority as the process that hosts it. The standalone [`@tetherto/mdk-mcp`](../../../backend/core/mcp/README.md)
process binds `127.0.0.1` and answers `POST /mcp` with no user auth. The Gateway hosts no MCP itself.

#### Options

| Option           | When to pick it             | Trade-off                                         |
| ---------------- | --------------------------- | ------------------------------------------------- |
| No MCP, no agent | Dashboards and scripts only | Smallest surface                                  |
| MCP on loopback, operator agent on the Gateway | In-process chat for people who already passed Gateway identity | Keep `approvalTimeoutMs` on. Pass a real `userId` into `createSession` / `resumeSession`. A session id in a URL must not read another operator's chat |
| MCP or agent published past localhost | An agent runtime on another host | MDK does not authenticate this path. Put mutual TLS or your SSO proxy in front, and authorize inside the reused HTTP handlers (a Gateway plugin's routes served as MCP tools are those same handlers, with no extra check) |

Suggested default: leave MCP on `127.0.0.1`. Do not publish it with compose `ports:`, an SSH tunnel, or a reverse proxy unless that
front door is authenticated. Treat the model provider (`qvac` or an OpenAI-compatible URL) as sensitive infrastructure: prompts can
include site topology and, if you are careless, secrets.

</Step>

<Step>

### Step 8: Handle secrets, stores, and day-two operations

#### Options for secrets

| Option               | When to pick it | Trade-off                                                |
| -------------------- | --------------- | -------------------------------------------------------- |
| Secret manager (Vault, cloud SM, Kubernetes secrets) into the host process | Production | Extra moving part. This is the suggested default. |
| Protected environment on a locked-down host | Small single-host sites | Rotation and audit are your scripts |
| Values in git, `mdk-contract.json`, example `site.deploy.json`, or the UI bundle | Never | Credentials leak with the repo or the browser |

#### Options for process lifecycle

| Option                                    | When to pick it | Trade-off                           |
| ----------------------------------------- | --------------- | ----------------------------------- |
| `SIGINT` / supervisor stop so WAL and cleanup run | Always | A `SIGKILL` can leave `.mdk-data` / `storeDir` unusable. The next boot may look healthy with zero Workers. |
| Health check HTTP only (`GET /auth/site`) | Insufficient | The Gateway can keep serving HTTP after the Kernel channel closes (`CHANNEL_CLOSED`) and never reconnect |

Suggested default:

- Mode `0600` (or equivalent) on Kernel db, Worker `storeDir`, and key files. Encrypt at rest if the host requires it
- Back up those directories as operational data, with the same access control as the live files
- Rotate Kernel, Gateway, and Worker keys when staff leave or a host is rebuilt, and update the allowlist in the same change
- Practice recovery from a wiped data directory before an incident
- Watch Gateway-to-Kernel errors, not only the HTTP port
- Run Node.js >=24. Pin lockfiles. Prefer non-root containers with a read-only root filesystem
- Stay on the latest `main` or latest tag you have reviewed. `0.y.z` is initial development; older tags may not receive security
  fixes. Report product issues through the [security policy][security-policy], not public GitHub issues

</Step>

</Steps>

## Decision cheat sheet

| Decision         | Suggested production choice    | Demo-only choice                              |
| ---------------- | ------------------------------ | --------------------------------------------- |
| Topology         | Microservices over DHT, three networks (operator / backend / devices) | Single process on loopback |
| Kernel admission | Non-empty `auth.whitelist` with persistent Gateway and MCP keys | Empty allowlist |
| Worker access    | Backend network only, keys unpublished | Same host, unpublished anyway |
| User identity    | Your SSO or JWTs, checked in every Gateway controller | No check, `noAuth()` |
| Writes           | Approval-gated for fleet changes; Gateway sets `authPerms` | Direct `sendCommand` with no token |
| UI               | HTTPS, `bearerTokenAuth` or working `gatewayRedirectAuth`, route guards | Vite proxy, `noAuth()`, HashRouter |
| MCP / agent      | Loopback, human approval, real `userId` | Disabled, or loopback with `local` operator |
| Secrets          | Secret manager into the process | Example `admin` passwords                    |

## Next steps

- Read the [security boundaries][security-boundaries]: what each layer trusts, and what it does not
- Follow the [control plane][control-plane]: read path, direct command, and approval-gated write
- Add identity in [Gateway plugin controllers][plugins-auth]: the only supported user-auth seam
- Restrict Kernel callers with the [HRPC allowlist][auth-whitelist]: transport admission for the Gateway
- Compare [deployment topologies][deployment-topologies]: this blueprint assumes microservices; local and single-process are smaller footprints
- Report product vulnerabilities through the [security policy][security-policy]: private advisory, not a public issue

## Links

[security-boundaries]: ../../concepts/security-boundaries.md
<!-- docs@tether.io: security-boundaries → concepts/security-boundaries -->

[control-plane]: ../../concepts/control-plane.md
<!-- docs@tether.io: control-plane → concepts/control-plane -->

[deployment-topologies]: ../../concepts/deployment-topologies.md
<!-- docs@tether.io: deployment-topologies → concepts/deployment-topologies -->

[plugins-auth]: ../gateway/plugins.md#auth-and-permissions
<!-- docs@tether.io: plugins-auth → guides/gateway/plugins#auth-and-permissions -->

[supported-plugins-bundled]: ../../reference/supported-plugins.md#bundled-site-plugins
<!-- docs@tether.io: supported-plugins-bundled → reference/supported-plugins#bundled-site-plugins -->

[write-actions]: ../gateway/write-actions.md
<!-- docs@tether.io: write-actions → guides/gateway/write-actions -->

[auth-whitelist]: ../../../examples/backend/kernel/auth-whitelist.js
<!-- docs@tether.io: auth-whitelist → https://github.com/tetherto/mdk/blob/main/examples/backend/kernel/auth-whitelist.js -->

[security-policy]: ../../../SECURITY.md
<!-- docs@tether.io: security-policy → https://github.com/tetherto/mdk/blob/main/SECURITY.md -->

[worker-runtime]: ../../../backend/core/mdk-worker/README.md
<!-- docs@tether.io: worker-runtime → https://github.com/tetherto/mdk/blob/main/backend/core/mdk-worker/README.md -->

[kernel-command-dispatcher]: ../../../backend/core/kernel/README.md#commanddispatcher
<!-- docs@tether.io: kernel-command-dispatcher → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md#commanddispatcher -->

[kernel-action-manager]: ../../../backend/core/kernel/README.md#actionmanager
<!-- docs@tether.io: kernel-action-manager → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md#actionmanager -->

[kernel-auth-api]: ../../../backend/core/kernel/README.md#api
<!-- docs@tether.io: kernel-auth-api → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md#api -->

[mdk-provider-auth]: ../../../ui/packages/react-adapter/README.md#authentication
<!-- docs@tether.io: mdk-provider-auth → https://github.com/tetherto/mdk/blob/main/ui/packages/react-adapter/README.md#authentication -->
