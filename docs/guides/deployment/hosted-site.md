---
title: Hosted-site reference configuration
description: Networks, allowlists, a monitoring-only and a delegated-writes profile, MCP off or on loopback, and the Kernel and Gateway settings for a managed site
docs@tether_slug: guides/deployment/hosted-site
---

> [!WARNING]
> Every control on this page is a network setting, an admission list, or a line of policy. MDK identifies the person or agent behind
> a request from the access token the Kernel's token issuer signed, and `spec.rbac` decides what that identity may do. TLS, network
> isolation and secret storage are still yours.

## Overview

This page is a reference configuration for MDK on a hosted or managed mining site: fixed hosts, a controlled network, a change
process, and an operator who needs to hand a network team one page. It gives values, not rationale; the
[site security blueprint][security-blueprint] owns the reasoning behind each control, and the [locked-down site
shape][locked-down-site] explains why discovery and transport are separate decisions. Pick one of the two profiles, apply the
settings table, and read the can and cannot lists before promising anything to the site owner.

## Networks and ports

Three networks, as the blueprint suggests. Every HRPC hop is UDP over HyperDHT, addressed by public key, so there is no fixed
listener port to open between MDK processes; what each host needs is UDP reachability to its peers and to the bootstrap nodes.

| Network  | Component                 | Protocol and port                                                                 | Direction                                      |
| -------- | ------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------- |
| Operator | Gateway HTTP              | TCP `spec.gateway.port`, behind the TLS proxy you run                             | Inbound from operators and the UI origin only  |
| Operator | Operator shell (UI)       | Static files served by that same proxy                                            | Inbound from operators                         |
| Backend  | Kernel, Workers, app runtimes | UDP, ephemeral local ports; HyperDHT bootstrap `49737` (public set) or your private list | Peer to peer inside the backend network; outbound to the bootstrap nodes |
| Backend  | MCP server                | TCP `127.0.0.1:<gateway port + 100>`, loopback only                               | Local processes on the MCP host                |
| Backend  | Agent model provider      | TCP to `qvac` or your OpenAI-compatible URL                                       | Outbound from the agent host only              |
| Devices  | [Avalon][run-avalon] (CGMiner) | TCP `4028`, no authentication                                                | From the owning Worker only                    |
| Devices  | [Whatsminer][run-whatsminer] | Encrypted TCP `4433` (API v3, probed first) or `4028` (v2); v3 signs each command with the API account and password, v2 takes a session token from the password | From the owning Worker only                 |
| Devices  | [Antminer][run-antminer] HTTP | TCP `80`, digest authentication                                              | From the owning Worker only                    |
| Devices  | [Bitdeer D40][run-bitdeer] containers | MQTT broker on the Worker, TCP `10883` (MQTTS with `mqttTls`); a per-container login with `mqttCredentials`, anonymous without it | Inbound to the Worker from the containers only; bind `mqttHost` to the container network |
| Devices  | Other containers, meters, sensors | Vendor API port, vendor authentication                                    | From the owning Worker only                    |
| Devices  | Pool APIs                 | HTTPS outbound                                                                    | From the pool Worker only                      |

Docker ports published by `startServices()` bind `127.0.0.1` unless `host` is set, so a containerised stack exposes nothing to
the backend network by accident.

## What MDK can and cannot do here

MDK can:

- Admit backend callers to Kernel by key, which lets them connect and nothing more ([Kernel admission][kernel-admission])
- Check an access token and one `spec.rbac` rule on every Kernel request and every Gateway app route, default deny
  ([policy model][rbac-policy])
- Hold an app to the `app-<name>` role `spec.rbac` binds to its service account `app:<name>`, seeded at install from the app's
  `mdk-app.yaml` `permissions`, and check the signed-in user's own rules as well when the app acts for one
  ([app runtime][app-runtime])
- Record every `command.request` attempt, refused ones included, with its caller, target, params and outcome
  ([write-command log][write-command-log])
- Admit callers to each Worker by key (`allowedKeys`, fail-closed) ([Worker allowlist][worker-allowlist])
- Admit Workers to Kernel by key (`discovery.workerKeys`, fail-closed)
- Restrict the device addresses a Worker may register to a CIDR allowlist, `conf.thing.allowedAddressCidrs`
  ([device addresses][device-addresses])
- Serve the Gateway only to known `Host` names, rate limit by client IP, cap body size and send Helmet headers
- Expose only read-only tools over MCP by default, require each agent's own access token on `/mcp`, and bind MCP to loopback
  with no option to do otherwise
- Hold every write that changes hash, power or network membership for approval ([write actions][write-actions])
- Run with no outside network at all, against a private bootstrap list every component shares (the
  [local and air-gapped profile][private-dht], from code, `worker.js` or `spec.network.dht` in `mdk.yaml`)

MDK cannot:

- Federate sign-in. Users, groups and passwords live in the Kernel's identity store, and there is no SSO hook.
- Allowlist Gateway clients by IP. The Gateway has a `Host` allowlist and a per-IP rate limit; source-IP filtering is your proxy's or firewall's job.
- Offer a global read-only switch. Monitoring-only is a composition of the roles and bindings in Profile A, not one flag.
- Review the grant an app asks for. `mdk validate app <name>` checks that the grant matches the request and binds somebody; whether
  that grant is narrow enough is your call before adding the app to `spec.apps`.

## Before either profile

Both profiles are policy, so the policy exists before the stack boots. A `spec.rbac` that binds no user and no group, and whose
bound subjects include nobody who may write the policy, is refused at `mdk run` rather than booted: a Kernel in that state
cannot be handed a policy afterwards. That is a fresh stack, or one where only an app's account is bound. Run
[`mdk rbac init`][cli-access-policy], then [create the first operator][first-operator] with `mdk user add <name> --admin`,
then pick a profile.

Binding a user is enough to boot, so a policy that keeps `policy: write` out of every role still starts. That is a choice rather
than an error: policy changes then go through `mdk.yaml` and a restart instead of `mdk rbac apply`.

Admission is the same in both: the Kernel admits the Gateway, the MCP server and each app runtime key so they can connect, and
every Worker admits the Kernel client key (`kernel.getClientPublicKey()`) and nothing else, so every device call passes the
Kernel's checks and [write-command log][write-command-log]. What separates the two profiles is `spec.rbac`.

## Profile A: monitoring-only

The site reads telemetry and state. While this policy is in force, no route, tool or Kernel caller can send a command to a device.

- Roles grant `devices: read`, `workers: list` and the read verbs of the app routes operators use; none carries `devices: write`,
  `actions: write` or `actions: vote`
- Replace every wildcard administrator grant, the CLI account's included, with a dedicated policy-maintenance role holding
  `policy: read`, `policy: write` and the read permissions its callers need, bound only to whoever maintains `mdk.yaml`. Do not
  bind the `admin` role in this profile: it holds every resource and verb, `devices: write` and `actions: write` among them, so
  binding it breaks the guarantee above. `mdk rbac init` binds `mdk-cli` to `admin` by default, so rebind that account to the
  narrower role before relying on this profile.
- Each app's `app-<name>` role in `spec.rbac` carries no write verb, so the app cannot reach `command.request` even when a user
  asks it to. The role is seeded from the app's `mdk-app.yaml` `permissions` at install and is yours from then on, so audit the
  role rather than the manifest.
- `spec.apps` lists no app whose route table carries a write route; the operator shell therefore shows no write controls
- MCP is absent, or runs with the default tool set and no `allowWrite` or `allowTools`
- The approval flow is never reached: with nobody holding `actions: write`, `action.push` is refused

An identity whose rules cover no write verb gets `ERR_KERNEL_ACTION_FORBIDDEN` on `command.request` or `action.push`. A refused
`command.request` is recorded in the [write-command log][write-command-log]; a refused `action.push` is denied before dispatch
and leaves no entry. Monitoring-only rests on the policy, so read it back with `mdk rbac show` after every change.
An identity with `policy: write` can replace this policy with one that permits device writes; this profile does not prevent its
maintainers from enabling writes through a policy change.

## Profile B: delegated writes

Named operators may change the fleet, and every fleet-changing write waits for approval.

- Roles add `devices: write` on the devices each team owns, scoped with `resourceNames` such as `miner/antminer/*` or
  `miner/antminer/rack-3/*`, and `actions: write` and `actions: vote` on the people who push and approve. A device name is
  `family/brand/worker/device` and a pattern is anchored at both ends, so a pattern that does not start at the family segment
  matches nothing and denies.
- Bindings name `Group` subjects rather than individuals, so joining a team is an identity change and not a policy change
- Users sign in at the Gateway's `POST /auth/login`; the Gateway checks a bearer token and the route's rule before body
  validation, the cache or the app, and the app receives the verified identity as `req._info`, never the token
  ([auth in app controllers][app-auth])
- An app acting for a signed-in user calls Kernel through `req.mdk`, so Kernel requires both the app's and the user's rules to
  allow the write; a payload's self-asserted `authPerms` are ignored for any caller that carries a token
- Power mode, pool assignment, container PDU and bulk reboot go through `action.push` with the vote threshold the site owner
  signed off; single-device, operator-in-front actions may use a direct `command.request`
- MCP write tools stay hidden unless `spec.mcp.allowWrite` or `spec.mcp.allowTools` names them, and each agent signs in with its
  own service account whose rules cover the tools it may call

## MCP: off or loopback

Off means not started: MCP is never part of the default `mdk run` target, so a stack that does not run `mdk run mcp` and does not
list the agent app in `spec.apps` has no MCP surface and no agent. That is the Profile A default.

On means loopback. The [MCP server][mcp-readme] listens on `127.0.0.1` at the Gateway port plus 100 (or `spec.mcp.port`), and there is no option to
bind elsewhere. Reaching it from another host is your reverse proxy's or tunnel's decision, and that front door must authenticate,
because MDK does not. With it on:

- Write tools are hidden unless `spec.mcp.allowWrite: true` or `spec.mcp.allowTools` lists them
- Every `/mcp` call carries one agent's own access token: `mdk sa add <agent>` creates the credential, and the agent signs in at
  the Gateway's `POST /auth/token`. `spec.mcp.token` and `spec.mcp.identity` are refused in `mdk.yaml`
- The agent's rules decide which app routes are listed as tools at all, and a route that declares a `resourceName` is checked
  again on each call
- Requests whose `Host` is not a loopback name, or that carry an unlisted `Origin`, get `403`

The operator agent, if you run it, keeps `approvalTimeoutMs` on and signs in as its own service account like any other agent, so a
model never executes a write that no one approved.

## Gateway and Kernel settings

Each row names the setting, its configuration surface, and the value for each profile. Some controls are available through
`mdk.yaml`; others require programmatic startup or component configuration files.

`mdk run` does not expose pinned Worker admission or the Gateway bind address as stack settings. It admits callers from the
trusted-keys directory, which lets them connect and nothing more, so both profiles are reached from `spec.rbac` rather than from
the admission list. A host that names every caller key itself disables automatic directory admission with `trustedKeysDir: false`.
The [trust and admission reference][trust-and-admission] describes automatic key exchange. Pinned Worker admission through
`discovery.workerKeys` applies to topic discovery; local discovery and direct registration skip that check.

| Setting                          | `mdk.yaml`                                  | Programmatic                                              | Profile A                         | Profile B                                  |
| -------------------------------- | ------------------------------------------- | --------------------------------------------------------- | --------------------------------- | ------------------------------------------ |
| Access policy                    | `spec.rbac`, written by `mdk rbac init`, `mdk user add` and `mdk sa add`, applied on `mdk rbac apply` | `getKernel({ rbac })` | Read verbs, plus `policy: write` for policy maintenance; no wildcard grants | Adds `devices: write`, `actions: write` and `actions: vote` on named roles |
| Kernel caller allowlist          | Not exposed; trusted-directory callers are admitted | `getKernel({ hrpc: { whitelist }, trustedKeysDir: false })`; explicitly manage later admissions | Every backend caller key, and no roles | Same |
| Worker admission to Kernel       | Not exposed; CLI uses local discovery      | `getKernel({ discovery: { workerKeys } })`, `kernel.allowWorkerKey()` for topic discovery | Every topic-discovered Worker key, pinned | Same |
| `allowAnyWorker`                 | never                                       | `discovery.allowAnyWorker`                                | `false`                           | `false`                                    |
| Worker caller allowlist          | set by `mdk run` from the trusted-keys dir  | boot function `allowedKeys`, `MDK_WORKER_ALLOWED_KEYS` for `worker.js` | The Kernel client key alone      | Same                             |
| Device address allowlist         | Not exposed                                 | `conf.thing.allowedAddressCidrs` on Worker boot functions | The device VLAN CIDR              | Same                                       |
| DHT bootstrap list and bind interface | `spec.network.dht` (`host`, `port`, `bootstrap`) | `getKernel({ hrpc: { bootstrap, dhtHost } })`, `bootstrap` and `dhtHost` on Worker boot functions and `startGateway()`; `MDK_DHT_BOOTSTRAP` and `MDK_DHT_HOST` for `worker.js` | The [private profile][private-dht] if outbound UDP is blocked | Same |
| Gateway bind address             | Not exposed; configure the Gateway HTTP facility | `startGateway({ httpd })` overrides or the Gateway's `config/facs/httpd.config.json` | The proxy-facing interface | Same |
| Gateway `allowedHosts`           | `spec.gateway.config.allowedHosts`          | `startGateway({ allowedHosts })`                          | The names operators type          | Same                                       |
| Gateway `trustProxy`             | `spec.gateway.config.trustProxy`            | `startGateway({ trustProxy })`                            | `true` only behind your proxy     | Same                                       |
| Gateway `rateLimit`              | `spec.gateway.config.rateLimit`             | `startGateway({ rateLimit })`                             | Default `300` per minute per IP   | Lower on write routes                      |
| Gateway identity                 | Not exposed; `spec.gateway.config.authVerifier` is refused | `startGateway({ kernel })` in process, or `startGateway({ gatewayCredential })` against a Kernel elsewhere | The Kernel's token issuer | Same |
| MCP                              | `spec.mcp` absent, or `port`, `allowWrite`, `allowTools` | `createMcpServer(root, port, config, pluginDirs, apps, options)` | Absent, or defaults | `allowWrite` only for agents whose rules cover the tools |
| Signal handling                  | handled by `mdk run`                        | `handleSignals: true` on `getKernel`, `createMcpServer` and a standalone `startGateway` (ignored with an in-process `kernel`); `worker.js` installs no handlers | Set where offered, so a supervisor stop runs cleanup | Same |
| Secrets                          | `${VAR}` placeholders resolved from the environment, then `.env` (mode `0600`) | Injected by your secret manager  | Never in `mdk.yaml`, git or a contract | Same |

When Gateway is started with `startGateway({ kernel })` using a Kernel returned by `getKernel()`, set `handleSignals: true` on
`getKernel()` so Kernel's cleanup also stops Gateway. A custom host can instead own signal handling and shut down its components through the
[shutdown API][shutdown-api]. Sending a supervisor stop signal alone does not guarantee that application cleanup runs.

## Next steps

- Follow the [site security blueprint][security-blueprint]: the rationale and trade-offs behind every row
- Understand the [locked-down site shape][locked-down-site]: why pinned keys remove the topic but not the DHT
- Compare [HRPC with a known-endpoint RPC][transport-comparison]: setup, failure modes, latency and diagnosability at a managed site
- Read the signed-in user in [app controllers][app-auth]: what `req._info` and `req.mdk` carry, and how a route's rule is chosen
- Stage fleet-changing writes with the [write-actions guide][write-actions]
- Check the [environment requirements][environment] for the Node.js and npm baseline

## Links

[shutdown-api]: ../../../backend/core/mdk/README.md#shutdownhandle--promisevoid
<!-- docs@tether.io: shutdown-api → https://github.com/tetherto/mdk/blob/main/backend/core/mdk/README.md#shutdownhandle--promisevoid -->

[trust-and-admission]: ../../../backend/core/mdk/README.md#trust-and-admission
<!-- docs@tether.io: trust-and-admission → https://github.com/tetherto/mdk/blob/main/backend/core/mdk/README.md#trust-and-admission -->

[private-dht]: private-dht.md
<!-- docs@tether.io: private-dht → guides/deployment/private-dht -->

[security-blueprint]: ../security/index.md
<!-- docs@tether.io: security-blueprint → guides/security -->

[locked-down-site]: ../../concepts/deployment-topologies.md#locked-down-managed-site
<!-- docs@tether.io: locked-down-site → https://github.com/tetherto/mdk/blob/main/docs/concepts/deployment-topologies.md#locked-down-managed-site -->

[transport-comparison]: ../../concepts/transport-comparison.md
<!-- docs@tether.io: transport-comparison → concepts/transport-comparison -->

[kernel-admission]: ../../../backend/core/kernel/README.md#caller-admission-and-authorization
<!-- docs@tether.io: kernel-admission → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md#caller-admission-and-authorization -->

[write-command-log]: ../../../backend/core/kernel/README.md#write-command-log
<!-- docs@tether.io: write-command-log → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md#write-command-log -->

[rbac-policy]: ../../../backend/core/rbac/README.md
<!-- docs@tether.io: rbac-policy → https://github.com/tetherto/mdk/blob/main/backend/core/rbac/README.md -->

[cli-access-policy]: ../../reference/tooling/cli.md#mdk-rbac
<!-- docs@tether.io: cli-access-policy → reference/tooling/cli#mdk-rbac -->

[first-operator]: ../security/create-the-first-operator.md
<!-- docs@tether.io: first-operator → guides/security/create-the-first-operator -->

[worker-allowlist]: ../../../backend/core/mdk-worker/README.md#caller-allowlist
<!-- docs@tether.io: worker-allowlist → https://github.com/tetherto/mdk/blob/main/backend/core/mdk-worker/README.md#caller-allowlist -->

[device-addresses]: ../../../backend/core/mdk/README.md#device-data-and-caller-input
<!-- docs@tether.io: device-addresses → https://github.com/tetherto/mdk/blob/main/backend/core/mdk/README.md#device-data-and-caller-input -->

[app-runtime]: ../../../backend/core/app-runtime/README.md
<!-- docs@tether.io: app-runtime → https://github.com/tetherto/mdk/blob/main/backend/core/app-runtime/README.md -->

[write-actions]: ../gateway/write-actions.md
<!-- docs@tether.io: write-actions → guides/gateway/write-actions -->

[app-auth]: ../gateway/apps.md#auth-and-permissions
<!-- docs@tether.io: app-auth → guides/gateway/apps#auth-and-permissions -->

[environment]: ../../reference/environment.md
<!-- docs@tether.io: environment → reference/environment -->

[run-avalon]: ../miners/run-avalon-worker.md
<!-- docs@tether.io: run-avalon → guides/miners/run-avalon-worker -->

[run-bitdeer]: ../containers/run-bitdeer-worker.md
<!-- docs@tether.io: run-bitdeer → guides/containers/run-bitdeer-worker -->

[run-whatsminer]: ../miners/run-whatsminer-worker.md
<!-- docs@tether.io: run-whatsminer → guides/miners/run-whatsminer-worker -->

[run-antminer]: ../miners/run-antminer-worker.md
<!-- docs@tether.io: run-antminer → guides/miners/run-antminer-worker -->

[mcp-readme]: ../../../backend/core/mcp/README.md
<!-- docs@tether.io: mcp-readme → https://github.com/tetherto/mdk/blob/main/backend/core/mcp/README.md -->
