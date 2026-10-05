---
title: Security boundaries
description: Security model, trust boundaries, and isolation between MDK components
docs@tether_slug: concepts/security-boundaries
---

## TL;DR

No tier of MDK enforces user identity. The Gateway serves its plugin routes to any caller, Kernel inspects no user identity, and `WorkerRuntime`
applies no caller allowlist, so the only user authentication on the Gateway path is what you build into your plugin controllers. Until you do,
network policy and process isolation are the fleet's only boundaries.

> [!NOTE]
> Assembling a site from UI, Gateway, Kernel, and Workers? The [site security blueprint][security-blueprint] provides the steps, options, and
> suggested defaults.

## Overview

This page describes the trust boundary at the Worker tier in depth and where it sits in the Worker → Kernel → Gateway → UI chain. Data flows
outward along that chain; a request travels the other way, entering at the Gateway (or, for AI agents, the standalone MCP server). It covers what each layer does and does not authenticate.

## Worker security boundary

### Endpoint identity and key material

[`WorkerRuntime`][worker-runtime] listens over HyperswarmRPC (HRPC) on an encrypted [Noise][noise] transport, and its HRPC public key
identifies and addresses the endpoint. That proves which endpoint a backend peer is talking to: it does **not** establish a
human or application identity, grant command permission, or substitute for the application-level authentication you implement above it.

A Worker's identity is a pair of seeds, [`seedDht` and `seedRpc`][worker-seeds], from which its DHT and HRPC keypairs are derived.
With a `storeDir`, they are written unencrypted as plain files in that directory; with a Hyperbee store, they live unencrypted in the
store's `workerConf` space. Anyone who can read them can regenerate the keypair and impersonate the endpoint. Restrict access to the
seeds with the same care as a private key: use restrictive file permissions, at-rest encryption where the host requires it, and treat
backups as secrets. A DHT topic is only a discovery rendezvous — not a credential or an authorization token.

### Reachability and network controls

The `WorkerRuntime` does not enforce a caller allowlist before dispatching the requests it supports: any backend peer that knows the Worker's
public key and can reach it with HRPC over the network may send requests.

The Kernel's [HRPC allowlist][kernel-hrpc-allowlist] protects clients connecting to Kernel, not direct callers to a Worker. Consumers
must enter through the Gateway → Kernel path, with request authentication in the Gateway's plugin controllers. AI agents enter through the MCP server → Kernel path instead, where authentication is the MCP endpoint's concern — native MCP tools do not pass through those Gateway controllers. [Kernel's caller allowlist][mcp-allowlist] admits each path's caller by its HRPC public key.

Given that the Worker does not turn an unwanted caller away, the surrounding controls are yours:

- Restrict direct Worker reachability to trusted backend networks, and apply a host/container firewall policy
- Never expose device management interfaces publicly
- Treat Worker public keys and DHT topics as deployment configuration, distributed through an authenticated control plane
- Run Kernel, Workers, and Gateway as separate processes or containers, so a compromise of one is contained and cannot spread to the others

### Production command path and secrets

A host that starts a Worker with `services: null` — the minimal setup — provides no first-party service built-ins and no
`write.calls.request` approval integration (MDK's built-in write-approval flow). Direct [`command.request`][kernel-command-dispatcher] dispatch still
reaches plugin command handlers regardless, so a production command path must:

- Authenticate the requester at the Gateway or control plane
- Authorize each device and command, and optionally require approval for high-impact actions
- Validate the request again in the handler, and rate-limit it
- Write an audit record with actor, target, requested parameters, outcome, and correlation ID

The handler context does not currently include actor identity, so actor-level auditing belongs upstream, with handler logs to supplement it.
The [control-plane security model][control-plane] covers the production trust path.

Inject credentials through the host process from a secret manager or protected environment. Pass only the minimum device-specific values in
`config`, and never place secrets in `mdk-contract.json`. Redact credentials and device responses from errors, debug logs, telemetry, and audit
records.

## Next steps

- Follow the [site security blueprint][security-blueprint]: steps, options, and suggested defaults for a real site
- [Understand the Gateway's security model][gateway-auth-design]: where user identity checks are meant to live
- [Review the control-plane security model][control-plane]: the production trust path for approval-gated writes
- [Read the Worker Runtime store services reference][worker-runtime-store-services]: the full built-in surface `opts.services` can activate

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

[kernel-command-dispatcher]: ../../backend/core/kernel/README.md#commanddispatcher
<!-- docs@tether.io: kernel-command-dispatcher → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md#commanddispatcher -->

[kernel-hrpc-allowlist]: ../../backend/core/kernel/README.md#hrpc-hyperswarm-rpc
<!-- docs@tether.io: kernel-hrpc-allowlist → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md#hrpc-hyperswarm-rpc -->

[worker-runtime-store-services]: ../../backend/core/mdk-worker/README.md#store-services
<!-- docs@tether.io: worker-runtime-store-services → https://github.com/tetherto/mdk/blob/main/backend/core/mdk-worker/README.md#store-services -->
