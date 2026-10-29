---
title: Site security blueprint
description: Steps, options, and suggestions for securing an enterprise MDK site assembled from UI, Gateway, Kernel, and Workers
docs@tether_slug: guides/security
---

> [!WARNING]
> MDK enforces user identity and an access policy at every entry point, and it fails closed: a stack whose `spec.rbac` binds nobody
> refuses every call. That policy, TLS, network isolation and secrets are still part of the site you build. Treat
> [`mvp-site`](../../../examples/mvp-site/README.md) and per-family snippets as boot demos, not a production template.

## Overview

Walk the steps to understand how to secure an enterprise site you assemble from MDK: UI, Gateway, Kernel, and Workers on separate hosts or
containers. MDK leaves these controls to you on purpose. The SDK coordinates devices; your site owns who may talk to it.

Every caller signs in to the Kernel's [token issuer][identity] and gets a short-lived access token. One policy, `spec.rbac` in
`mdk.yaml`, decides what that identity may do, and the Gateway (users), the MCP server (AI agents) and the Kernel (apps and every
other caller) evaluate it with the same [RBAC library][rbac]. Your site owns the policy's content and the network it runs on.

This page presents what to do, the options MDK gives you, and a suggested default. It covers:

- [Network layout](#step-1-choose-a-network-layout)
- [Kernel admission](#step-2-admit-the-gateway-to-kernel)
- [Worker access](#step-3-isolate-workers-and-devices)
- [Policy and Gateway identity](#step-4-write-the-policy-and-put-identity-in-the-gateway)
- [Write authorization](#step-5-authorize-writes)
- [UI sessions](#step-6-wire-the-ui-session)
- [MCP and agents](#step-7-optional-mcp-and-the-operator-agent)
- [Secrets and operations](#step-8-handle-secrets-stores-and-day-two-operations)

> [!TIP]
> The companion pages, [security boundaries][security-boundaries] (what each layer trusts) and the [control plane][control-plane]
> (how a request travels) cover related concepts.

## What MDK enforces and what you own

Build around these. They are current `0.y.z` behavior.

| Layer   | What MDK does                                                                          | What you own       |
| ------- | -------------------------------------------------------------------------------------- | ------------------ |
| Policy  | `spec.rbac` in `mdk.yaml` is the only place policy is written. Default deny, no superadmin (`admin` is an ordinary role holding wildcards), an invalid policy refused at load | The roles and bindings, reviewed like code |
| UI      | `passwordAuth()` signs in through the Gateway, keeps the access token in memory and the refresh token in an httpOnly cookie | HTTPS, a real `apiBaseUrl`, hiding write controls the user cannot use |
| Gateway | Serves `/auth/*` from the Kernel's token issuer. Checks a bearer token and a `spec.rbac` rule on every app route; no route is open. Host allowlist (loopback), rate limit, Helmet headers, body limit on by default | TLS in front, `allowedHosts`, `trustProxy` behind a proxy you control |
| App runtime | Runs one app's controllers in its own process and admits only the Gateway's and MCP server's keys. Calls Kernel as service account `app:<name>`, holding only the grant its `mdk-app.yaml` `permissions` requested, and acting for the signed-in user through `req.mdk` so Kernel checks the user too | Reviewing an app's code and requested grant before installing it, narrowing the grant |
| Kernel  | Admits a key to connect (allowlist or trusted-keys dir), which grants nothing. Checks the access token on every request but sign-in against `spec.rbac`, per action and per device. Records every `command.request` attempt | Admitting the right keys, the policy, guarding the Kernel store |
| Workers | Noise transport and key-addressed HRPC. Admit only the Kernel's client key, so every device call passes the Kernel's checks and write-command log | Network isolation, device secrets, payload checks |
| MCP / agent | `POST /mcp` on `127.0.0.1`. Each agent signs in as its own service account and lists only the tools its rules allow | Agent accounts and their bindings, human approval for writes |
| Devices / pools | Vendor protocol APIs and authentication | Device-network isolation |

Consumers enter through the Gateway; AI agents enter through the standalone MCP server. The browser never holds a Kernel key. Direct Kernel or Worker
reachability is a backend-network concern, not a product feature.

## Blueprint

<Steps>

<Step>

### Step 1: Choose a network layout

Pick a [deployment topology][deployment-topologies] before you write policy. Isolation is the first control; identity and policy sit on top of it.

#### Options

| Option                 | When to pick it                        | Trade-off                                                |
| ---------------------- | -------------------------------------- | -------------------------------------------------------- |
| Single process         | Local demos, tests, smallest footprint | One heap. A compromise of the process is the whole site. |
| Local (one OS process per service, shared directory) | One machine, production-like restarts, or a step toward microservices | Stronger isolation than a single heap. Kernel and Workers still share the host, and the trusted-keys dir is the admission boundary. No DHT. |
| Microservices over DHT | Enterprise sites: separate hosts or containers, resource limits per service, Workers away from Kernel | Peers that know the discovery topic can find Kernel and Workers. Key distribution and a Kernel allowlist are mandatory. |

Suggested default: [microservices][deployment-topologies] (one process or container per service, discovery over DHT), with three
networks you define:

- Operator: UI origin and Gateway HTTP, behind TLS and a reverse proxy you control
- Backend: Kernel, app runtimes, MCP server and Workers, no inbound path from browsers or agents
- Devices: miner, container, meter, and pool APIs, reachable only from the Workers that own them

Pass the Kernel public key to a remote Gateway as `kernelKey`. Treat the DHT discovery topic as deployment configuration, not a
credential: generate a site-specific topic, distribute it out of band, and do not reuse example or well-known values. Pair this
shape with a [Kernel allowlist](#step-2-admit-the-gateway-to-kernel) that names every caller key.

Do not pass [`@tetherto/mdk-client`](../../../backend/core/client/README.md) or Kernel keys into the browser. HTTP to the
Gateway is the only operator path.

</Step>

<Step>

### Step 2: Admit the Gateway to Kernel

[Admission][kernel-admission] decides which keys may connect to Kernel. It is fail-closed (an empty allowlist admits nobody) and it
grants nothing: what an admitted caller may do comes from its access token and `spec.rbac`. There are no allowlist roles. An entry
written as `{ key, roles }` is refused at start with `ERR_KERNEL_CALLER_ROLES_UNSUPPORTED`, and `allowAll` on the Kernel with
`ERR_KERNEL_ALLOW_ALL_REMOVED`.

#### Options

| Option          | When to pick it        | Trade-off                                                                                        |
| --------------- | ---------------------- | ------------------------------------------------------------------------------------------------ |
| In process (`startGateway({ kernel })`) | Single process, or `mdk run` | The Gateway key is admitted for you. Nothing to distribute |
| [Trusted-keys dir][trust-and-admission] | Separate processes on one machine | The Kernel admits every `<name>.pub` in the dir. Anyone who can write the dir is admitted, so keep it `0700` and owned by the service user |
| Allowlist each key (`hrpc.whitelist`, `kernel.allowKey()`) | Every multi-host site | You distribute the Gateway, MCP server and app runtime keys yourself, and update the list when a key rotates |

Suggested default across hosts: one persistent key per caller, each hex public key on the Kernel's allowlist:

```js
const kernel = await getKernel({
  hrpc: { whitelist: ['<gateway-key-hex>', '<mcp-key-hex>', '<app-runtime-key-hex>'] }
})
```

The Gateway derives its caller key from a seed persisted in its store, so the key survives restarts: read it from
`status.rpcClientKey` in the Gateway status file. The standalone MCP server (`mdk run mcp`) and each app runtime have their own
persistent keys too; `mdk run` publishes them to the trusted-keys dir (`mcp.pub`, `app-<name>.pub`). Treat each of those stores with
the same care as a TLS key, since a copy of it presents that caller's transport identity.

Admission alone gets a caller nowhere. A Gateway or MCP server in its own process also signs in as its service account
(`mdk-gateway`, `mdk-mcp`) to read the policy it enforces, which needs `policy: read`; `mdk rbac init` binds both to a `gateway`
role holding exactly that. Each app runtime signs in as `app:<name>`. A service account's token is bound to the transport key that
signed in, so a copied token is refused from any other key.

Kernel admits Workers from the DHT topic the same way: only RPC keys on `discovery.workerKeys` (or added with
`kernel.allowWorkerKey()`) register, and an empty list admits nobody. `discovery.allowAnyWorker: true` admits every peer that knows
the topic; it is for throwaway local experiments only and logs a warning. Without it, a peer with the topic could register as a
Worker and receive the commands, including credentials, for its device family.

Workers are fail-closed too. Give each Worker the Kernel's client key (`kernel.getClientPublicKey()`, not the listener key) as its
only `allowedKeys` entry, so every command goes through Kernel's checks and [write-command log][write-command-log]. Do not add the
Gateway's key: an app reaches devices through Kernel, never by dialing a Worker.

On separate hosts, pass Kernel's public key to the Gateway as `kernelKey`. Do not rely on the well-known key file
(`~/.mdk/.kernel-key`) across machines. Where that file still exists on the Kernel host, it holds the public key, written
world-readable (`0644`) inside a directory you own; it is not deleted on shutdown. Do not expose Kernel's HRPC listener off the backend network.

</Step>

<Step>

### Step 3: Isolate Workers and devices

[`WorkerRuntime`][worker-runtime] answers only the keys in its `allowedKeys`, and `mdk run` and the `@tetherto/mdk-core` helpers
admit the Kernel's client key and no other. A Worker therefore takes device calls only through Kernel, where `spec.rbac` and the
write-command log apply. The device network is still yours to isolate: a Worker's key protects the Worker, not the miner behind it.
[Security boundaries][security-boundaries] give the trust-boundary rationale behind the controls below.

#### Options

| Option                                               | When to pick it | Trade-off                                                                   |
| ---------------------------------------------------- | --------------- | --------------------------------------------------------------------------- |
| Workers only on the backend network, `allowedKeys` holding the Kernel client key | Every site | Operational discipline: no Worker port or DHT topic on the operator network |
| One Worker process per trust zone | Different device families or vendors must not share credentials | More processes to supervise                    |
| Device APIs on a third network (CGMiner `4028`, miner HTTP, container APIs) | Real hardware | Required when the vendor protocol has weak or no auth ([Avalon][run-avalon] / CGMiner have none; [Antminer][run-antminer] uses digest auth; [Whatsminer][run-whatsminer] uses a device password) |
| `allowAll` on `WorkerRuntime` (`MDK_WORKER_ALLOW_ALL=1`) | Throwaway local experiments only | Any peer that learns the Worker key reaches devices with no policy check and no log entry. `mdk run` never sets it |

Suggested default: persist each Worker's `storeDir` so its key is stable, treat that key as a machine identity, and register the Worker
with Kernel only after the device network is isolated. On DHT, keep Worker public keys and the discovery topic off the operator network
and out of git. Inject device passwords and pool API keys from a secret manager or protected environment. Never put secrets in
`mdk-contract.json`, git, or a committed seed file.

Validate command payloads again in the handler (types, ranges, allowed targets). Kernel checks the command name and params against
the contract; it does not know your hardware's unsafe parameter combinations. Redact credentials and vendor responses in handler errors
and logs. For CGMiner-style devices, network isolation is the control: changing the Worker `password` field does not add a wire
handshake the protocol lacks.

</Step>

<Step>

### Step 4: Write the policy and put identity in the Gateway

`spec.rbac` in `mdk.yaml` is the only place policy is written. The Kernel applies it at every start and on `mdk rbac apply`; a
policy that fails validation is refused and the one in force stays. A rule names resources, verbs and, optionally, `resourceNames`;
a binding ties a role to `User`, `Group` or `ServiceAccount` subjects. The [RBAC vocabulary][rbac-vocabulary] lists every resource,
including `devices` (named `family/brand/worker/device`), `actions`, `commands`, `policy`, `identities` and app routes
(`<app>/<path>` with `get`, `list`, `create`, `update`, `delete`).

A package never decides who may call it. An app only requests its own Kernel access in `mdk-app.yaml` (`permissions`, required);
`mdk add app`, `mdk create app`, `mdk onboard` and `mdk rbac init` write that request as role `app-<name>` bound to service account
`app:<name>`, and the role is yours to narrow from then on. `mdk validate app <name>` fails when the grant is missing, differs from
the request or binds nobody. Who may call the app's routes is set by your own roles.

The Gateway is the user identity seam. It serves `POST /auth/login`, `POST /auth/token`, `POST /auth/refresh`, `POST /auth/logout`
and `GET /auth/me` from the Kernel's token issuer, and on every app route it checks a bearer access token and a `spec.rbac` rule for
the route's resource and verb (`401 ERR_AUTH_UNAUTHORIZED`, `403 ERR_AUTH_FORBIDDEN`) before body validation, the cache or the app.
A route that declares `resourceName` (from a param, query or body field) is checked for that instance. The app receives the verified
identity, `{ kind, sub, email?, groups? }`, as `req._info`, never the token. The [Gateway apps guide][plugins-auth] covers the route
fields.

#### Options

| Option                                  | When to pick it | Trade-off                             |
| --------------------------------------- | --------------- | ------------------------------------- |
| [`mdk rbac init`][cli-access-policy] | Every stack, and after `mdk add app` | Binds `mdk-cli` to `admin`, `mdk-gateway` and `mdk-mcp` to `gateway` (`policy: read`), and writes each app's grant. A role you edited is left alone |
| [`mdk user add <name> --admin`][cli-users] | The first operator | Writes the `admin` role if missing and binds the user. Keep the number of admins small; `admin` holds every wildcard |
| Narrow roles bound to `Group` subjects (`mdk user add --group`) | Teams with different duties (read-only staff, one rack's technicians) | More roles to review. `resourceNames` such as `rack-3-*` keep a technician to one rack |
| A custom `authVerifier` with no authority | A Gateway started with neither a Kernel nor a credential | Not checked against `spec.rbac`, and refused in `mdk.yaml` (`spec.gateway.config.authVerifier`). Outside the supported path once a stack has a policy |

Suggested default: run `mdk rbac init` before the first `mdk run` (a `spec.rbac` under which nobody may write the policy makes
`mdk run` refuse to boot the Kernel, which could not be handed a policy afterwards), create the first operator with `mdk user add <name> --admin`, then give
everyone else a narrow role bound by group. Read the effective policy with `mdk rbac show` after every change, and keep `mdk.yaml`
in review like code.
Single sign-on federation is not built in: users and passwords live in the Kernel's identity store.

```yaml
spec:
  rbac:
    enforcement: deny
    roles:
      - name: viewer
        rules:
          - resources: ["*"]
            verbs: [get, list]
      - name: rack3-tech
        rules:
          - resources: [ops-center/miners/command]
            verbs: [create]
            resourceNames: ["rack-3-*"]
    bindings:
      - role: viewer
        subjects: [{ kind: Group, name: ops-team }]
      - role: rack3-tech
        subjects: [{ kind: User, name: tech@example.com }]
```

> [!NOTE]
> The Gateway sanitizes error bodies: only `ERR_*` codes and Fastify's own 4xx errors reach the client verbatim; the
> [Gateway security model][gateway-security] details the shape and what gets logged instead.

Also, on the Gateway:

- Terminate TLS in front of it. The refresh cookie is `Secure` everywhere but plain-HTTP loopback, so over plain HTTP on a network
  the browser keeps no refresh cookie and every reload signs the user out
- Set `trustProxy` only behind a TLS proxy whose hop count you trust: it makes the Gateway see `https`, and without a trusted proxy
  client IPs (and so rate limits) can be spoofed
- List the names clients use in `allowedHosts`; only loopback on the bound port passes the Host check by default
- Tune `rateLimit` (default 300 requests per minute per IP). It is counted before the auth check, so failed sign-ins are throttled too
- Ship the Gateway's `authz` decision lines (subject, route, resource, verb, decision, policy version) to your log store
- Tune `rateLimit` for writes. `?overwriteCache=true` is honored only for an identity
  whose `perms` holds `cache:overwrite`
- `trustProxy` is off by default. Turn it on only behind a proxy whose hop count you trust, or client IPs (and so rate limits) can be spoofed

</Step>

<Step>

### Step 5: Authorize writes

Kernel checks every write against `spec.rbac`, whichever path it takes. A `command.request` needs `devices: write` on its target
device, and a command scoped to a worker or rack needs it on every device that worker owns. Every attempt, refused ones included, is
recorded in the [write-command log][write-command-log] with the caller's subject and the roles `spec.rbac` binds to it; reading it
with `command.log` needs `commands: read`. When an app acts for a signed-in user (`req.mdk`), Kernel verifies the user's own token,
requires both the app's and the user's rules to allow the write, and records the user as the caller via the app.

#### Options

| Option                                | When to pick it | Trade-off                               |
| ------------------------------------- | --------------- | --------------------------------------- |
| Direct command ([`command.request`][kernel-command-dispatcher]) | Low-impact, operator-in-front actions (LED, a single-device reboot) | Fast. One identity's `devices: write` rule is the only gate |
| Approval-gated write ([`action.push`][kernel-action-manager], then votes) | Fleet-changing actions: power mode, pool assignment, container PDU, bulk reboot | Slower. A push needs `actions: write` and `devices: write` on every device it resolves to. A vote is checked against the stored action's target devices with the voter's own `devices: write` rule. The [write-actions guide][write-actions] covers the HTTP side |
| Agent-proposed write with a human approval pause | Operator agent (`approvalTimeoutMs` on [`@tetherto/mdk-app-agent`](https://github.com/tetherto/mdk-app-agent)) | The model cannot execute a write until someone approves |

For a caller with a token, the voter and requester are the operator it acts for (`req.mdk`), else the caller's own identity, and
the payload's self-asserted `authPerms` are ignored on both push and vote; they apply only to in-process calls. Naming another voter
without the operator's token needs `actions: delegate`. Prefer `req.mdk`, which needs no `delegate` grant, and grant `delegate`
only to an app whose code you trust to name the right user.

Suggested default: approval-gated writes for anything that changes hash, power, or network membership, with the people who vote bound
to a role holding `actions: vote` and `devices: write` on the affected devices. Direct commands only where a single operator's
`devices: write` rule is enough. Keep `commands: read` with the people who audit.

</Step>

<Step>

### Step 6: Wire the UI session

[`passwordAuth()`][ui-sessions] from `@tetherto/mdk-ui-foundation` signs a user in through the Gateway's `/auth/login`. The access
token stays in memory; the refresh token stays in an httpOnly, `SameSite=Strict` cookie scoped to `/auth`, out of reach of page
scripts. The provider renews the token on a timer and on a `401`, and tabs refresh one at a time under a Web Locks lock. Refresh
tokens rotate on every use, and a used one presented again revokes the whole session (theft detection). The one exception is two
clients refreshing at once: within about 10 seconds of its use, while its successor is still unused, a used token gets that same
successor, so both hold one refresh token and the next reuse of it, by whoever is behind, revokes the session.

#### Options

| Option                                  | When to pick it | Trade-off                             |
| --------------------------------------- | --------------- | ------------------------------------- |
| `passwordAuth({ baseUrl })` | Every dashboard on an MDK stack | Needs TLS on a network, or the browser keeps no refresh cookie. You own the sign-in page |
| `bearerTokenAuth()` | A client that already holds an access token (a script, a kiosk handed a token) | No refresh; the session ends on `401` |
| `noAuth()` | Fixture-backed demos | No token. Every app route on a real stack answers `401` |
| Custom `AuthProvider` | A session model the presets do not cover | You implement `getToken`, refresh, and sign-out |

Suggested default for a production dashboard:

- `passwordAuth({ baseUrl: httpsOrigin })` passed to `<MdkProvider>`, with `restore()` before the first render
- HTTPS end to end, a real `apiBaseUrl`, no Vite dev proxy
- One fetch client (the provider's `fetcher`) so pages cannot skip `Authorization`
- Route guards on any view that can mutate the fleet (the shell template uses `<RequireAuth>`)
- Hide write controls the user's roles do not allow. Hiding is not authorization; the Gateway and Kernel still deny
- Static bundle behind the same proxy that terminates TLS. Do not run `vite dev` as the production UI

</Step>

<Step>

### Step 7: (Optional) MCP and the operator agent

MCP is optional. The standalone [`@tetherto/mdk-mcp`][mcp-agents] process binds `127.0.0.1` and answers `POST /mcp`. With an authority
(an in-process Kernel, or `mdk run mcp` signing in as `mdk-mcp`), every request needs an agent's own access token, each agent's
`tools/list` is filtered by its rules, and each call is checked as the Gateway checks the same route. A tool scoped by an instance name
is listed when some instance is allowed and checked per call; a tool with no declared access is not offered. The static
`spec.mcp.token` and `spec.mcp.identity` are refused.

#### Options

| Option           | When to pick it             | Trade-off                                         |
| ---------------- | --------------------------- | ------------------------------------------------- |
| No MCP, no agent | Dashboards and scripts only | Smallest surface                                  |
| One service account per agent on loopback | Any agent | `mdk sa add <agent>`, a binding in `spec.rbac`, then `mdk sa token <agent>` (or `ServiceAccountTokenSource`) for its bearer token. The agent reaches apps as itself |
| Operator agent app on the Gateway | In-process chat for people who already signed in | Keep `approvalTimeoutMs` on. Chat sessions bind to the signed-in user's `sub`, so one operator cannot read another's |
| MCP published past localhost | An agent runtime on another host | Put TLS in front and add the name to `allowedHosts`. The token check still applies; the transport is yours |

Suggested default: leave MCP on `127.0.0.1`, give each agent its own service account with a read-only role, and grant write tools only
with `allowWrite` or `allowTools` plus a rule that allows them. Treat the model provider (`qvac` or an OpenAI-compatible URL) as
sensitive infrastructure: prompts can include site topology and, if you are careless, secrets.

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
| Health check on the Gateway HTTP port only | Insufficient | The Gateway keeps serving HTTP while the Kernel is unreachable; Kernel-backed calls fail with `ERR_MDK_CLIENT_UNAVAILABLE` until it is back. |

Suggested default:

- Mode `0700` (or equivalent) on the Kernel db directory, `.mdk/`, the trusted-keys dir and Worker `storeDir`, and `0600` on seed,
  key and credential files. The Kernel store holds users, password hashes and the token signing key; `.mdk/credentials/` holds every
  app's and agent's private key. Encrypt at rest if the host requires it
- Back up those directories as operational data, with the same access control as the live files
- When staff leave, `mdk user disable` or `mdk user remove` them: their access tokens stop at the Kernel at once, and their bindings stay
  until you remove them from `spec.rbac`
- Rotate service-account keys with `mdk sa rotate`, and Kernel, Gateway and Worker transport keys when a host is rebuilt, updating the
  allowlist in the same change
- Practice recovery from a wiped data directory before an incident
- Watch Gateway-to-Kernel errors and the Gateway's policy version, not only the HTTP port
- Run Node.js >=24. Pin lockfiles. Prefer non-root containers with a read-only root filesystem
- Stay on the latest `main` or latest tag you have reviewed. `0.y.z` is initial development; older tags may not receive security
  fixes. Report product issues through the [security policy][security-policy], not public GitHub issues

#### Revoke access on every admitted path

Trusted-directory watchers add keys; deleting a `.pub` file does not revoke an admission in running processes. Use `kernel.revokeKey(key)`
and each affected `runtime.revokeKey(key)`, and remove the publication and startup configuration that would admit it again. Check the
live Kernel and Worker allowlists, not just files on disk, and verify that refused calls fail after revocation and after restart.

</Step>

</Steps>

## Trust boundaries and known limits

These hold by design. Plan the site around them.

| Boundary or limit | What happens | What to do |
| ----------------- | ------------ | ---------- |
| App routes are a confused-deputy boundary | The Gateway checks the user against the route's rule and forwards their token. A controller calling Kernel through `req.mdk` acts for that user: Kernel checks both `app:<name>` and the user. A controller calling through `config.mdkClient` acts as the app alone, and Kernel does not re-check the user | Use `req.mdk` for work done for a request, keep each app's grant narrow (`resourceNames`), and review app controller code like any privileged service |
| Policy at a remote Gateway | A Gateway or MCP server in its own process polls the policy every 5 seconds. A failed poll keeps the last good policy, so a Kernel blip does not lock the site, but for 60 seconds at most (`maxStaleMs`): past that it allows nothing until a poll succeeds. Kernel switches at once | Watch for failing polls; run the Gateway in the Kernel's process where an instant switch matters |
| Revoked access tokens at the edge | A password change, disable, delete, group or email change, or new service-account key refuses the subject's tokens at once wherever the issuer verifies: every Kernel request, and an in-process Gateway or MCP server. A Gateway or MCP server in another process polls every subject's token version with the policy, so there a revoked token keeps working until the next poll (up to 5 seconds); Kernel refuses it at once | Treat the edge window as one poll interval. Kernel-backed calls stop immediately |
| Login lockout is in memory | Failed sign-ins lock a user name (5 failures, doubling from 30 seconds up to 15 minutes), counted in the Kernel's memory; a Kernel restart clears it | Rate-limit `/auth/login` at the proxy too, and alert on repeated failures in the `authz` log |
| Service-account assertions | An assertion lives at most 60 seconds and is single use, remembered in the store across restarts | Keep agent and app private keys on the host that owns them |

## Decision cheat sheet

| Decision         | Suggested production choice    | Demo-only choice                              |
| ---------------- | ------------------------------ | --------------------------------------------- |
| Topology         | Microservices over DHT, three networks (operator / backend / devices) | Single process on loopback |
| Kernel admission | Allowlist of persistent Gateway, MCP and app runtime keys; trusted-keys dir on one machine | In process through `mdk run` |
| Worker access    | Backend network only, `allowedKeys` holding only the Kernel client key | `allowAll` on a throwaway local Worker |
| Policy           | `spec.rbac` from `mdk rbac init`, narrow roles bound by group, reviewed like code | One `admin` binding |
| User identity    | `mdk user add --admin` for the first operator, Gateway `/auth/*`, TLS | Plain HTTP on loopback |
| Writes           | Approval-gated for fleet changes; voters hold `devices: write` on the targets | Direct `command.request` as an admin |
| UI               | HTTPS, `passwordAuth()`, route guards | Vite proxy, `noAuth()` on fixtures |
| MCP / agent      | Loopback, one service account per agent, read-only role, human approval | Disabled |
| Secrets          | Secret manager into the process, `.mdk/` and stores `0700` | Example `admin` passwords |

## Next steps

- [Security boundaries][security-boundaries]: what each layer trusts, and what it does not
- [Control plane][control-plane]: read path, direct command, and approval-gated write
- [RBAC policy model][rbac]: rule shape, subjects, and the full vocabulary
- [Token issuer][identity]: access and refresh tokens, sessions, and when tokens stop working
- [Access policy commands][cli-access-policy]: `mdk rbac init`, `apply` and `show`
- [Users and service accounts][cli-users]: `mdk user`, `mdk sa`, and `mdk login`
- [Route rules in app controllers][plugins-auth]: `verb`, `resourceName`, and `req._info`
- [Deployment topologies][deployment-topologies]: this blueprint assumes microservices; local and single-process are smaller footprints
- [Hosted-site reference configuration][hosted-site]: two profiles and one settings table
- [Security policy][security-policy]: report product vulnerabilities through a private advisory, not a public issue

## Links

[security-boundaries]: ../../concepts/security-boundaries.md
<!-- docs@tether.io: security-boundaries → concepts/security-boundaries -->

[control-plane]: ../../concepts/control-plane.md
<!-- docs@tether.io: control-plane → concepts/control-plane -->

[deployment-topologies]: ../../concepts/deployment-topologies.md
<!-- docs@tether.io: deployment-topologies → concepts/deployment-topologies -->

[hosted-site]: ../deployment/hosted-site.md
<!-- docs@tether.io: hosted-site → guides/deployment/hosted-site -->

[plugins-auth]: ../gateway/apps.md#auth-and-permissions
<!-- docs@tether.io: plugins-auth → guides/gateway/apps#auth-and-permissions -->

[write-actions]: ../gateway/write-actions.md
<!-- docs@tether.io: write-actions → guides/gateway/write-actions -->

[security-policy]: ../../../SECURITY.md
<!-- docs@tether.io: security-policy → https://github.com/tetherto/mdk/blob/main/SECURITY.md -->

[worker-runtime]: ../../../backend/core/mdk-worker/README.md#caller-allowlist
<!-- docs@tether.io: worker-runtime → https://github.com/tetherto/mdk/blob/main/backend/core/mdk-worker/README.md#caller-allowlist -->

[kernel-command-dispatcher]: ../../../backend/core/kernel/README.md#commanddispatcher
<!-- docs@tether.io: kernel-command-dispatcher → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md#commanddispatcher -->

[kernel-action-manager]: ../../../backend/core/kernel/README.md#actionmanager
<!-- docs@tether.io: kernel-action-manager → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md#actionmanager -->

[kernel-admission]: ../../../backend/core/kernel/README.md#caller-admission-and-authorization
<!-- docs@tether.io: kernel-admission → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md#caller-admission-and-authorization -->

[write-command-log]: ../../../backend/core/kernel/README.md#write-command-log
<!-- docs@tether.io: write-command-log → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md#write-command-log -->

[trust-and-admission]: ../../../backend/core/mdk/README.md#trust-and-admission
<!-- docs@tether.io: trust-and-admission → https://github.com/tetherto/mdk/blob/main/backend/core/mdk/README.md#trust-and-admission -->

[rbac]: ../../../backend/core/rbac/README.md
<!-- docs@tether.io: rbac → https://github.com/tetherto/mdk/blob/main/backend/core/rbac/README.md -->

[rbac-vocabulary]: ../../../backend/core/rbac/README.md#vocabulary
<!-- docs@tether.io: rbac-vocabulary → https://github.com/tetherto/mdk/blob/main/backend/core/rbac/README.md#vocabulary -->

[identity]: ../../../backend/core/identity/README.md
<!-- docs@tether.io: identity → https://github.com/tetherto/mdk/blob/main/backend/core/identity/README.md -->

[cli-access-policy]: ../../../packages/cli/README.md#access-policy
<!-- docs@tether.io: cli-access-policy → https://github.com/tetherto/mdk/blob/main/packages/cli/README.md#access-policy -->

[cli-users]: ../../../packages/cli/README.md#users-and-service-accounts
<!-- docs@tether.io: cli-users → https://github.com/tetherto/mdk/blob/main/packages/cli/README.md#users-and-service-accounts -->

[mcp-agents]: ../../../backend/core/mcp/README.md#ai-agents-and-the-mcp-server
<!-- docs@tether.io: mcp-agents → https://github.com/tetherto/mdk/blob/main/backend/core/mcp/README.md#ai-agents-and-the-mcp-server -->

[ui-sessions]: ../../../ui/packages/ui-foundation/README.md#sessions
<!-- docs@tether.io: ui-sessions → https://github.com/tetherto/mdk/blob/main/ui/packages/ui-foundation/README.md#sessions -->

[gateway-security]: ../../../backend/core/gateway/README.md#security-model
<!-- docs@tether.io: gateway-security → https://github.com/tetherto/mdk/blob/main/backend/core/gateway/README.md#security-model -->

[run-avalon]: ../miners/run-avalon-worker.md
<!-- docs@tether.io: run-avalon → guides/miners/run-avalon-worker -->

[run-whatsminer]: ../miners/run-whatsminer-worker.md
<!-- docs@tether.io: run-whatsminer → guides/miners/run-whatsminer-worker -->

[run-antminer]: ../miners/run-antminer-worker.md
<!-- docs@tether.io: run-antminer → guides/miners/run-antminer-worker -->
