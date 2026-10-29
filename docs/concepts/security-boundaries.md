---
title: Security boundaries
description: Security model, trust boundaries, and isolation between MDK components
docs@tether_slug: concepts/security-boundaries
---

## TL;DR

Every caller of an MDK stack has an identity issued by the Kernel's token issuer, and one policy, `spec.rbac` in `mdk.yaml`, decides
what it may do. The Gateway checks users, the MCP server checks AI agents, and the Kernel checks every caller on every request, per
action and per device. Transport keys only admit a process to connect; they grant nothing. Workers admit only the Kernel, so every
device call passes the Kernel's checks and its write-command log.

> [!NOTE]
> Assembling a site from UI, Gateway, Kernel, and Workers? The [site security blueprint][security-blueprint] provides the steps, options, and
> suggested defaults.

## Overview

This page describes what each layer of the Worker → Kernel → Gateway → UI chain authenticates and authorizes, and where the trust
boundaries between them sit. Data flows outward along that chain; a request travels the other way, entering at the Gateway (or, for AI
agents, the standalone MCP server).

## Identity and policy

Two separate questions are answered for every request, by two separate mechanisms:

| Question | Answered by | Grants |
| -------- | ----------- | ------ |
| May this process connect? | Transport admission: the Kernel's [caller allowlist][kernel-admission] or the trusted-keys dir, a Worker's `allowedKeys` | A connection, nothing more |
| May this identity do this? | An access token from the [token issuer][identity], evaluated against `spec.rbac` by the [RBAC library][rbac] | One action on one resource, per rule |

The identities are:

| Subject | Signs in with | Bound in `spec.rbac` as |
| ------- | ------------- | ----------------------- |
| A person | User name and password at the Gateway's `POST /auth/login`, or `mdk login` | `User` (name or email), or `Group` |
| An app | An assertion signed by its own key, from its runtime | `ServiceAccount` `app:<name>` (role `app-<name>`, from its `mdk-app.yaml` grant) |
| An AI agent | An assertion signed by its own key (`mdk sa add <agent>`) | `ServiceAccount` `<agent>` |
| The CLI, Gateway and MCP server | Their own keys | `ServiceAccount` `mdk-cli`, `mdk-gateway`, `mdk-mcp` |

The policy is default deny. No matching rule is a refusal, a stack with no bindings refuses every Kernel call, and there is no
superadmin: `admin` is an ordinary role holding wildcards. A package never decides who may call it; an app only requests its own
Kernel access, and the operator's `spec.rbac` grants it.

Access tokens are EdDSA-signed JWTs that live 600 seconds, paired with a refresh token that rotates on every use. Changing a password,
disabling or deleting a subject, changing a user's groups or email, or giving a service account a new key refuses the tokens it already
holds: at once wherever the issuer verifies (every Kernel request, and a Gateway or MCP server in the Kernel's process), and within
one policy poll (5 seconds) at a Gateway or MCP server in another process, which polls every subject's token version with the policy.

## Layer by layer

| Layer | Authenticates | Authorizes |
| ----- | ------------- | ---------- |
| Gateway | A bearer access token on every app route; no route is open | A `spec.rbac` rule for the route's resource (`<app>/<path>`) and verb, and its instance when the route declares `resourceName` |
| App runtime | Only the Gateway's and MCP server's keys | Nothing itself: it receives the verified identity as `req._info`, and calls Kernel as `app:<name>` acting for the signed-in user (`req.mdk`) |
| MCP server | An agent's own access token on every `POST /mcp` | Which tools the agent lists, and each call, by the same route rules the Gateway applies |
| Kernel | An access token on every request but sign-in, in the envelope `auth` field; a service account's token only from the transport key it signed in with. The user an app acts for, by their own token in the envelope `actor` field | Each action against `spec.rbac`, per device (`devices` on `family/brand/worker/device`); a worker-scoped command on every device the worker owns. With an `actor`, both the app and the user must be allowed |
| Worker | Only the Kernel's client key | Nothing itself: the Kernel already checked the caller |

## Operator identity at the Kernel

A command request alone does not establish who the operator is: an app calls Kernel with its own service account. The Gateway closes
that gap by passing the verified operator to Kernel's authorization, not just to the app:

1. The Gateway verifies the user's bearer token and checks the route's rule.
2. It forwards the request to the app runtime with the identity (`req._info`) and, beside it, the user's access token. App code never
   sees the token.
3. A controller calls Kernel through `req.mdk`, which sends the app's token in `auth` and the user's in `actor`.
4. Kernel verifies the user's token itself (signature, expiry, token version, a user and not a service account) and evaluates the
   action for both identities. Either refusal refuses the request.
5. The write-command log records the user as the caller, `via` the app, with the roles `spec.rbac` binds to each. The user is also
   the voter on approval-gated pushes, votes and cancels.

Kernel trusts no claim it cannot verify: an app cannot name an operator, only forward a token the issuer signed. What the app holds
caps what any of its users can do through it, and what the user holds caps what the app does for them.

## Worker security boundary

### Endpoint identity and key material

[`WorkerRuntime`][worker-runtime] listens over HyperswarmRPC (HRPC) on an encrypted [Noise][noise] transport, and its HRPC public key
identifies and addresses the endpoint. That proves which endpoint a backend peer is talking to: it does **not** establish a
human or application identity, or grant command permission.

A Worker's identity is a pair of seeds, [`seedDht` and `seedRpc`][worker-seeds], from which its DHT and HRPC keypairs are derived.
With a `storeDir`, they are written unencrypted as plain files in that directory; with a Hyperbee store, they live unencrypted in the
store's `workerConf` space. Anyone who can read them can regenerate the keypair and impersonate the endpoint. Restrict access to the
seeds with the same care as a private key: use restrictive file permissions, at-rest encryption where the host requires it, and treat
backups as secrets. A DHT topic is only a discovery rendezvous, not a credential or an authorization token.

### Reachability and network controls

A Worker is fail-closed: it answers only the keys in its `allowedKeys`, and `mdk run` and the `@tetherto/mdk-core` helpers give it the
Kernel's client key and no other. Every device call therefore goes through the Kernel, where the caller's token is checked against
`spec.rbac` and the attempt is written to the [write-command log][write-command-log]. `allowAll` on `WorkerRuntime`
(`MDK_WORKER_ALLOW_ALL=1`) admits every peer that learns the Worker key, with no policy check and no log entry; it exists for throwaway
local experiments only, and `mdk run` never sets it.

Consumers enter through the Gateway → app runtime → Kernel path, and AI agents through the MCP server → app runtime → Kernel path.
[Kernel admission][mcp-allowlist] admits each path's caller by its HRPC public key, and its token decides what it may do.

The surrounding controls are yours:

- Restrict Worker reachability to trusted backend networks, and apply a host/container firewall policy
- Never expose device management interfaces publicly. A Worker's allowlist protects the Worker, not the device behind it
- Treat Worker public keys and DHT topics as deployment configuration, distributed through an authenticated control plane
- Run Kernel, Workers, and Gateway as separate processes or containers, so a compromise of one is contained and cannot spread to the others

### Production command path and secrets

Every `command.request` reaches a Worker only after the Kernel has checked `devices: write` on its target (on every device of the
worker, for a worker or rack scope) and validated the command and params against the Worker's contract. The write-command log records
each attempt, refused ones included, with the caller's subject and the roles `spec.rbac` binds to it (for an app acting for an
operator, the operator, and the app as `via`); reading it with `command.log` needs `commands: read`. Approval-gated writes check `devices: write` on every device a push resolves to, and each vote against the
stored action's target devices with the voter's own rule. For a token caller, the voter is the operator it acts for, else its own identity
unless a rule grants `actions: delegate`, and self-asserted `authPerms` in the payload are ignored.

What stays with the handler:

- Validate the request again (types, ranges, allowed targets), since the contract does not know your hardware's unsafe combinations
- Rate-limit device-facing operations the vendor protocol cannot absorb

The handler context does not include actor identity; the write-command log and the Gateway's `authz` decision lines are the audit trail.
The [control-plane security model][control-plane] covers the request paths end to end.

Inject credentials through the host process from a secret manager or protected environment. Pass only the minimum device-specific values in
`config`, and never place secrets in `mdk-contract.json`. Redact credentials and device responses from errors, debug logs, telemetry, and audit
records.

## Trust boundaries and known limits

| Boundary or limit | What happens | What to do |
| ----------------- | ------------ | ---------- |
| App routes are a confused-deputy boundary | The Gateway checks the user against the route's rule and forwards their token. A controller calling Kernel through `req.mdk` acts for that user: Kernel checks both `app:<name>` and the user. A controller calling through `config.mdkClient` acts as the app alone, and Kernel does not re-check the user | Use `req.mdk` for work done for a request, keep each app's grant narrow (`resourceNames`), and review app controller code like any privileged service |
| Policy at a remote Gateway | A Gateway or MCP server in its own process polls the policy every 5 seconds. A failed poll keeps the last good policy, so a Kernel blip does not lock the site, but for 60 seconds at most (`maxStaleMs`): past that it allows nothing until a poll succeeds. Kernel switches at once | Watch for failing polls; run the Gateway in the Kernel's process where an instant switch matters |
| Revoked access tokens at the edge | A Gateway or MCP server in another process checks tokens against the token versions it polls with the policy, so a revoked token keeps working there until the next poll (up to 5 seconds). Kernel refuses it at once | Treat the edge window as one poll interval |
| Login lockout is in memory | Failed sign-ins lock a user name in the Kernel's memory; a Kernel restart clears the count | Rate-limit `/auth/login` at the proxy too |
| Refresh cookie over plain HTTP | The refresh cookie is `Secure` everywhere but plain-HTTP loopback, so over plain HTTP on a network the browser keeps no refresh cookie | Serve the Gateway over TLS, or behind a TLS proxy with `trustProxy` set |

## Next steps

- [Site security blueprint][security-blueprint]: steps, options, and suggested defaults for a real site
- [RBAC policy model][rbac]: rules, subjects, and the resource vocabulary
- [Token issuer][identity]: tokens, sessions, and when they stop working
- [Gateway security model][gateway-auth-design]: sign-in routes and the per-route check
- [Control-plane security model][control-plane]: the request paths for reads, direct commands, and approval-gated writes
- [Worker Runtime store services][worker-runtime-store-services]: the full built-in surface `opts.services` can activate

## Links

[security-blueprint]: ../guides/security/index.md
<!-- docs@tether.io: security-blueprint → guides/security -->

[mcp-allowlist]: ../guides/security/index.md#step-2-admit-the-gateway-to-kernel
<!-- docs@tether.io: mcp-allowlist → guides/security#step-2-admit-the-gateway-to-kernel -->

[gateway-auth-design]: ../../backend/core/gateway/README.md#security-model
<!-- docs@tether.io: gateway-auth-design → https://github.com/tetherto/mdk/blob/main/backend/core/gateway/README.md#security-model -->

[control-plane]: control-plane.md
<!-- docs@tether.io: control-plane → concepts/control-plane -->

[noise]: https://noiseprotocol.org/
<!-- docs@tether.io: noise → https://noiseprotocol.org/ -->

[worker-runtime]: ../../backend/core/mdk-worker/README.md
<!-- docs@tether.io: worker-runtime → https://github.com/tetherto/mdk/blob/main/backend/core/mdk-worker/README.md -->

[worker-seeds]: ../../backend/core/mdk-worker/lib/worker-runtime.js
<!-- docs@tether.io: worker-seeds → https://github.com/tetherto/mdk/blob/main/backend/core/mdk-worker/lib/worker-runtime.js -->

[kernel-admission]: ../../backend/core/kernel/README.md#caller-admission-and-authorization
<!-- docs@tether.io: kernel-admission → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md#caller-admission-and-authorization -->

[write-command-log]: ../../backend/core/kernel/README.md#write-command-log
<!-- docs@tether.io: write-command-log → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md#write-command-log -->

[rbac]: ../../backend/core/rbac/README.md
<!-- docs@tether.io: rbac → https://github.com/tetherto/mdk/blob/main/backend/core/rbac/README.md -->

[identity]: ../../backend/core/identity/README.md
<!-- docs@tether.io: identity → https://github.com/tetherto/mdk/blob/main/backend/core/identity/README.md -->

[worker-runtime-store-services]: ../../backend/core/mdk-worker/README.md#store-services
<!-- docs@tether.io: worker-runtime-store-services → https://github.com/tetherto/mdk/blob/main/backend/core/mdk-worker/README.md#store-services -->
