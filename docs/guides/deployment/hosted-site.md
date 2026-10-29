---
title: Hosted-site reference configuration
description: Networks, allowlists, a monitoring-only and a delegated-writes profile, MCP off or on loopback, and the Kernel and Gateway settings for a managed site
docs@tether_slug: guides/deployment/hosted-site
---

> [!WARNING]
> MDK ships no user identity at any tier. Every control on this page admits or scopes a backend process by its key, or a network by
> its reach. The person or agent behind a request is identified only by the `authVerifier` you give the Gateway.

> [!NOTE]
> This page still describes Kernel allowlist roles. Allowlist entries now only admit a key, and `spec.rbac` decides what each caller
> may do (see the [site security blueprint][security-blueprint]). The page is being updated to match.

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
| Devices  | [Whatsminer][run-whatsminer] | Encrypted TCP `4028` (API v2) or `4433` (v3), session token from the API password | From the owning Worker only                 |
| Devices  | [Antminer][run-antminer] HTTP | TCP `80`, digest authentication                                              | From the owning Worker only                    |
| Devices  | Containers, meters, sensors | Vendor API port, vendor authentication                                          | From the owning Worker only                    |
| Devices  | Pool APIs                 | HTTPS outbound                                                                    | From the pool Worker only                      |

Docker ports published by `startServices()` bind `127.0.0.1` unless `host` is set, so a containerised stack exposes nothing to
the backend network by accident.

## What MDK can and cannot do here

MDK can:

- Admit backend callers to Kernel by key and scope each one to `read`, `write` or `admin` ([Kernel roles][kernel-roles])
- Admit callers to each Worker by key (`allowedKeys`, fail-closed) ([Worker allowlist][worker-allowlist])
- Admit Workers to Kernel by key (`discovery.workerKeys`, fail-closed)
- Restrict the device addresses a Worker may register to a CIDR allowlist, `conf.thing.allowedAddressCidrs`
  ([device addresses][device-addresses])
- Serve the Gateway only to known `Host` names, rate limit by client IP, cap body size and send Helmet headers
- Expose only read-only tools over MCP by default, require a bearer token on `/mcp`, and bind MCP to loopback with no option to do otherwise
- Hold every write that changes hash, power or network membership for approval ([write actions][write-actions])
- Run with no outside network at all, against a private bootstrap list every component shares (the
  [local and air-gapped profile][private-dht], from code, `worker.js` or `spec.network.dht` in `mdk.yaml`)

MDK cannot:

- Identify a person or an agent. Only the Gateway `authVerifier` you write does that, and nothing below the Gateway sees it.
- Allowlist Gateway clients by IP. The Gateway has a `Host` allowlist and a per-IP rate limit; source-IP filtering is your proxy's or firewall's job.
- Offer a global read-only switch. Monitoring-only is a composition of the controls in Profile A, not one flag.
- Enforce an app's declared `permissions`. An app runtime key is a full Kernel principal; review an app before adding it to `spec.apps` ([app runtime][app-runtime]).

## Profile A: monitoring-only

The site reads telemetry and state. No exposed route, tool or Kernel caller can send a command to a device.

- Kernel admits the Gateway, the MCP server and each app runtime key with `roles: ['read']`; no entry carries `write` or `admin`
- Every Worker admits the Kernel client key (`kernel.getClientPublicKey()`) and the Gateway key, the two callers that dial
  Workers directly; the Worker allowlist carries no roles, so Kernel's `read` scope does not bind the Gateway's
  [direct calls][worker-direct-paths]
- `spec.apps` lists no app whose route table carries a write route; the operator shell therefore shows no write controls
- MCP is absent, or runs with the default tool set and no `allowWrite` or `allowTools`
- The approval flow is never reached: with no `write` caller, `action.push` is refused at the transport

A `read` caller that sends `command.request` or `action.push` through Kernel gets `ERR_KERNEL_ACTION_FORBIDDEN`. The Gateway's
direct Worker path carries no roles, so monitoring-only also rests on `spec.apps` exposing no write route and on the Gateway host
staying yours.

## Profile B: delegated writes

Named operators may change the fleet, and every fleet-changing write waits for approval.

- Kernel admits the Gateway with `roles: ['write']`, the MCP server with `roles: ['read']` unless agents may act, and each app runtime
  key with the narrowest role its routes need
- Workers admit the Kernel client key and the Gateway key, as in Profile A
- The Gateway runs an `authVerifier` backed by your identity provider, marks every route that reads or changes the fleet `"auth": true`,
  and maps verified roles onto `authPerms` (`miner:w`, `container:w`) and `voter`; it never accepts either from the HTTP client
  ([auth in app controllers][plugins-auth])
- Power mode, pool assignment, container PDU and bulk reboot go through `action.push` with the vote threshold the site owner signed
  off; single-device, operator-in-front actions may use a direct `command.request` behind a controller that checked the token
- MCP write tools stay hidden unless `spec.mcp.allowWrite` or `spec.mcp.allowTools` names them, and the MCP server then carries an
  `identity` whose `perms` match the routes it may call, behind an authenticated front door

## MCP: off or loopback

Off means not started: MCP is never part of the default `mdk run` target, so a stack that does not run `mdk run mcp` and does not
list the agent app in `spec.apps` has no MCP surface and no agent. That is the Profile A default.

On means loopback. The [MCP server][mcp-readme] listens on `127.0.0.1` at the Gateway port plus 100 (or `spec.mcp.port`), and there is no option to
bind elsewhere. Reaching it from another host is your reverse proxy's or tunnel's decision, and that front door must authenticate,
because MDK does not. With it on:

- Write tools are hidden unless `spec.mcp.allowWrite: true` or `spec.mcp.allowTools` lists them
- `spec.mcp.token` (use a `${MDK_MCP_TOKEN}` placeholder resolved from the environment or `.env`) requires `Authorization: Bearer` on every `/mcp` call
- `spec.mcp.identity` supplies the `perms` that `"auth": true` routes need; without it those routes are not exposed as tools
- Requests whose `Host` is not a loopback name, or that carry an unlisted `Origin`, get `403`

The operator agent, if you run it, keeps `approvalTimeoutMs` on and receives a real `userId` from the Gateway identity, so a model
never executes a write that no one approved.

## Gateway and Kernel settings

Each row names the setting, its configuration surface, and the value for each profile. Some controls are available through
`mdk.yaml`; others require programmatic startup or component configuration files.

`mdk run` does not expose Kernel caller roles, pinned Worker admission, or the Gateway bind address as stack settings.
It admits callers from the trusted-keys directory with full Kernel access, so it does not establish the restricted roles in these
profiles. A programmatic host that assigns caller roles must disable automatic directory admission with `trustedKeysDir: false`
and explicitly manage caller admission. The [trust and admission reference][trust-and-admission] describes automatic key exchange.
Pinned Worker admission through `discovery.workerKeys` applies to topic discovery; local discovery and direct registration skip that check.

| Setting                          | `mdk.yaml`                                  | Programmatic                                              | Profile A                         | Profile B                                  |
| -------------------------------- | ------------------------------------------- | --------------------------------------------------------- | --------------------------------- | ------------------------------------------ |
| Kernel caller allowlist and roles | Not exposed; trusted-directory callers receive full access | `getKernel({ hrpc: { whitelist }, trustedKeysDir: false })`; explicitly manage later admissions | Every entry `roles: ['read']` | Gateway `['write']`, others as narrow as their routes allow |
| Kernel `allowAll`                | never                                       | `hrpc.allowAll`                                           | `false`                           | `false`                                    |
| Worker admission to Kernel       | Not exposed; CLI uses local discovery      | `getKernel({ discovery: { workerKeys } })`, `kernel.allowWorkerKey()` for topic discovery | Every topic-discovered Worker key, pinned | Same |
| `allowAnyWorker`                 | never                                       | `discovery.allowAnyWorker`                                | `false`                           | `false`                                    |
| Worker caller allowlist          | set by `mdk run` from the trusted-keys dir  | boot function `allowedKeys`, `MDK_WORKER_ALLOWED_KEYS` for `worker.js` | Kernel client key plus the Gateway key | Same                             |
| Device address allowlist         | Not exposed                                 | `conf.thing.allowedAddressCidrs` on Worker boot functions | The device VLAN CIDR              | Same                                       |
| DHT bootstrap list and bind interface | `spec.network.dht` (`host`, `port`, `bootstrap`) | `getKernel({ hrpc: { bootstrap, dhtHost } })`, `bootstrap` and `dhtHost` on Worker boot functions and `startGateway()`; `MDK_DHT_BOOTSTRAP` and `MDK_DHT_HOST` for `worker.js` | The [private profile][private-dht] if outbound UDP is blocked | Same |
| Gateway bind address             | Not exposed; configure the Gateway HTTP facility | `startGateway({ httpd })` overrides or the Gateway's `config/facs/httpd.config.json` | The proxy-facing interface | Same |
| Gateway `allowedHosts`           | `spec.gateway.config.allowedHosts`          | `startGateway({ allowedHosts })`                          | The names operators type          | Same                                       |
| Gateway `trustProxy`             | `spec.gateway.config.trustProxy`            | `startGateway({ trustProxy })`                            | `true` only behind your proxy     | Same                                       |
| Gateway `rateLimit`              | `spec.gateway.config.rateLimit`             | `startGateway({ rateLimit })`                             | Default `300` per minute per IP   | Lower on write routes                      |
| Gateway `authVerifier`           | `spec.gateway.config.authVerifier` names a built-in; a function needs code | `startGateway({ authVerifier })`    | Your verifier; `'loopback'` reads the socket address, so never behind a proxy | Your verifier, required |
| MCP                              | `spec.mcp` absent, or `port`, `allowWrite`, `allowTools`, `token`, `identity` | `createMcpServer(root, port, config, pluginDirs, apps, options)` | Absent, or defaults | `token` set, `allowWrite` only with an authenticated front door |
| Signal handling                  | handled by `mdk run`                        | `handleSignals: true` on `getKernel`, `createMcpServer` and a standalone `startGateway` (ignored with an in-process `kernel`); `worker.js` installs no handlers | Set where offered, so a supervisor stop runs cleanup | Same |
| Secrets                          | `${VAR}` placeholders resolved from the environment, then `.env` (mode `0600`) | Injected by your secret manager  | Never in `mdk.yaml`, git or a contract | Same |

When Gateway is started with `startGateway({ kernel })` using a Kernel returned by `getKernel()`, set `handleSignals: true` on
`getKernel()` so Kernel's cleanup also stops Gateway. A custom host can instead own signal handling and shut down its components through the
[shutdown API][shutdown-api]. Sending a supervisor stop signal alone does not guarantee that application cleanup runs.

## Next steps

- Follow the [site security blueprint][security-blueprint]: the rationale and trade-offs behind every row
- Understand the [locked-down site shape][locked-down-site]: why pinned keys remove the topic but not the DHT
- Compare [HRPC with a known-endpoint RPC][transport-comparison]: setup, failure modes, latency and diagnosability at a managed site
- Map verified users onto `authPerms` in [app controllers][plugins-auth]
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
<!-- docs@tether.io: locked-down-site → concepts/deployment-topologies#locked-down-managed-site -->

[transport-comparison]: ../../concepts/transport-comparison.md
<!-- docs@tether.io: transport-comparison → concepts/transport-comparison -->

[kernel-roles]: ../../../backend/core/kernel/README.md#caller-admission-and-authorization
<!-- docs@tether.io: kernel-roles → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md#caller-admission-and-authorization -->

[worker-allowlist]: ../../../backend/core/mdk-worker/README.md#caller-allowlist
<!-- docs@tether.io: worker-allowlist → https://github.com/tetherto/mdk/blob/main/backend/core/mdk-worker/README.md#caller-allowlist -->

[worker-direct-paths]: ../security/index.md#step-3-isolate-workers-and-devices
<!-- docs@tether.io: worker-direct-paths → guides/security#step-3-isolate-workers-and-devices -->

[device-addresses]: ../../../backend/core/mdk/README.md#device-data-and-caller-input
<!-- docs@tether.io: device-addresses → https://github.com/tetherto/mdk/blob/main/backend/core/mdk/README.md#device-data-and-caller-input -->

[app-runtime]: ../../../backend/core/app-runtime/README.md
<!-- docs@tether.io: app-runtime → https://github.com/tetherto/mdk/blob/main/backend/core/app-runtime/README.md -->

[write-actions]: ../gateway/write-actions.md
<!-- docs@tether.io: write-actions → guides/gateway/write-actions -->

[plugins-auth]: ../gateway/apps.md#auth-and-permissions
<!-- docs@tether.io: plugins-auth → guides/gateway/apps#auth-and-permissions -->

[environment]: ../../reference/environment.md
<!-- docs@tether.io: environment → reference/environment -->

[run-avalon]: ../miners/run-avalon-worker.md
<!-- docs@tether.io: run-avalon → guides/miners/run-avalon-worker -->

[run-whatsminer]: ../miners/run-whatsminer-worker.md
<!-- docs@tether.io: run-whatsminer → guides/miners/run-whatsminer-worker -->

[run-antminer]: ../miners/run-antminer-worker.md
<!-- docs@tether.io: run-antminer → guides/miners/run-antminer-worker -->

[mcp-readme]: ../../../backend/core/mcp/README.md
<!-- docs@tether.io: mcp-readme → https://github.com/tetherto/mdk/blob/main/backend/core/mcp/README.md -->
