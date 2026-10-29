---
title: HRPC and direct RPC compared
description: HRPC over HyperDHT against a known-endpoint RPC with equivalent authentication at a managed site, covering setup effort, failure modes, latency and diagnosability
docs@tether_slug: concepts/transport-comparison
---

## TL;DR

On an open connection, HRPC and a direct TCP RPC cost about the same: tens of microseconds for a small call on Linux loopback. The
DHT shows up around that call: joining the network, the first call to a peer, how long a failure takes to surface, and how little
the error says. A site with fixed hosts and internal DNS finds a known-endpoint RPC simpler to run and to diagnose. HRPC pays off
where addresses change, peers sit behind NAT, or nobody wants to run a PKI. MDK ships HRPC only.

## Overview

This page compares [HRPC][hrpc-glossary] over HyperDHT, the transport on every MDK hop, with a direct RPC that dials a known host
and port and authenticates both ends as strongly. It covers setup effort, failure modes, latency and diagnosability, then when the
DHT is most valuable. MDK has no known-endpoint transport to switch to; the comparison helps choose a deployment and set
expectations with a network team. How Kernel learns a Worker key is a separate question, answered by the
[deployment topologies][deployment-topologies].

Two direct baselines are measured:

- HTTPS with mutual TLS and a private CA, the usual way to authenticate a direct RPC
- Noise over TCP: the handshake and RPC framing HRPC already uses (`@hyperswarm/secret-stream`, `protomux-rpc`) with pinned keys,
  dialed at `host:port`. A known-endpoint MDK transport would most likely take this shape.

## What differs

| Property         | HRPC over HyperDHT                                                                         | Direct RPC with equivalent authentication |
| ---------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------- |
| Address          | The peer's 32-byte public key                                                              | `host:port`, an IP or an internal DNS name |
| Identity         | The address itself, an Ed25519 key pair derived from a seed kept in the component's store  | A certificate from your CA, or a pinned Noise key, separate from the address |
| Connection setup | DHT lookup of the key, handshake relayed by DHT nodes, then a direct UDP stream, holepunched when needed | TCP connect, then the TLS or Noise handshake |
| Listener ports   | None fixed; UDP on ephemeral ports                                                         | One TCP port per service                  |
| Network needs    | UDP to the bootstrap nodes, public or private, and to every peer                           | TCP to each endpoint, plus DNS when names are used |
| Admission        | Key allowlists: the Kernel caller allowlist, `discovery.workerKeys`, Worker `allowedKeys`  | CA trust plus a subject or key allowlist  |
| NAT              | Peers behind NAT reach each other with no inbound rule                                     | The server needs a reachable address and an inbound rule |

## Setup effort

| Task                         | HRPC over HyperDHT                                                                   | Direct RPC                              |
| ---------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------- |
| Give each service an address | Nothing: the key comes from the stored seed                                          | Assign a static IP or DNS name and keep config in step with it |
| Distribute credentials       | Share public keys: the Kernel key file, `.worker-keys`, or pinned lists              | Run a CA, issue a certificate per service and rotate it before expiry, or pin keys |
| Admit callers                | List keys on each side                                                               | Trust the CA and match subjects, or pin keys |
| Open the network             | UDP between backend hosts and to the bootstrap nodes; no per-service rule            | One TCP rule per service port           |
| Run with no outside network  | Run a [private bootstrap][private-dht] every component joins: from code, `spec.network.dht` in `mdk.yaml` or `startServices({ dht })` | Nothing beyond the network itself |
| Run on one host              | Still joins a DHT, so still needs bootstrap reach                                    | Loopback, nothing else                  |

The [hosted-site reference][hosted-site] lists every key, allowlist and bootstrap setting a managed site sets.

## Failure modes

Each row is a measured drill against a peer on the same host, on a three-node private DHT unless the row names the public DHT. The
[method](#method) section describes the drills.

| Failure                               | HRPC over HyperDHT                                                              | HTTPS with mutual TLS                 |
| ------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------- |
| Peer process killed, new connection   | `CHANNEL_CLOSED` after 4.0 s                                                    | `ECONNREFUSED` after about 1 ms       |
| Peer process killed, open connection  | `CHANNEL_CLOSED` after 13 s                                                     | `ECONNREFUSED` after about 1 ms       |
| Peer process frozen with `SIGSTOP`    | `CHANNEL_CLOSED` after 4.0 s on a new connection, 13 s on an open one           | No error within 60 s; only the caller's timeout ends the call |
| Peer closed cleanly                   | `CHANNEL_CLOSED` within 4 ms; 2.4 s on the public DHT                           | `ECONNREFUSED` after about 1 ms       |
| Key or address that never existed     | `CHANNEL_CLOSED` within 3 ms; 2.2 s on the public DHT                           | `ECONNREFUSED`, or `ENOTFOUND` for an unknown name |
| Caller missing from the allowlist     | `CHANNEL_CLOSED` after 4.0 s; 9.0 s on the public DHT                           | `ECONNRESET` after about 4 ms         |
| Bootstrap nodes unreachable           | Joining the DHT and `listen()` resolve after about 6 s with no error; a call then fails with `CHANNEL_CLOSED` after 4.0 s | Not applicable |
| One call outlives the 10 s pool linger | `CHANNEL_DESTROYED` at 10 s when no other request to that peer started meanwhile | Not applicable                       |

HRPC fails closed in bounded time even when the caller sets no timeout, because HyperDHT gives up on a peer that stops answering;
plain TCP does not. The price is that every failure is the same `CHANNEL_CLOSED`, seconds rather than milliseconds later, so a dead
peer, a wrong key and a missing allowlist entry look identical to the caller. Noise over TCP fails a closed port or a rejected key
within 2 ms, but also as `CHANNEL_CLOSED`, because `protomux-rpc` reports every closed stream that way; a known-endpoint transport
keeps TCP's diagnosability only if it passes the socket error through.

MDK adds its own bounds on top:

- An MDK client request times out after 30 s by default with `ERR_MDK_REQUEST_TIMEOUT`, and a Gateway app built on
  `createMdkClient` sees a transport failure as `ERR_MDK_CLIENT_UNAVAILABLE: CHANNEL_CLOSED: channel closed`
- Kernel calls to a Worker time out after 30 s with `ERR_CHANNEL_TIMEOUT`, and the Kernel [health monitor][health-monitor] pings
  each Worker every 5 s with a 3 s timeout; the first missed ping marks it `SICK`, which stops command dispatch to it
- The 10 s pool linger belongs to `@hyperswarm/rpc`'s pooled `request()`, which the Gateway's Kernel client and Kernel's Worker
  calls use; the app runtime client holds its connection open while a call is in flight, so Gateway calls to apps are not cut

## Latency

Measured on Linux loopback, one request at a time. p50 and p99 come from 1,000 calls for 256 B and 200 calls for 64 KiB; the first
call opens a new connection to an announced peer, 20 times.

| Step                              | HRPC, private DHT  | Noise over TCP     | HTTPS with mutual TLS |
| --------------------------------- | ------------------ | ------------------ | --------------------- |
| Join the network                  | About 1 ms         | Not applicable     | Not applicable        |
| Announce a server                 | 1.6 ms             | Not applicable     | Not applicable        |
| First call to a peer, p50 and max | 4.8 ms, 7.7 ms     | 0.84 ms, 5.3 ms    | 1.8 ms, 6.3 ms        |
| 256 B call, p50 and p99           | 0.024 ms, 0.11 ms  | 0.017 ms, 0.082 ms | 0.13 ms, 0.42 ms      |
| 64 KiB reply, p50 and p99         | 0.41 ms, 5.1 ms    | 0.27 ms, 0.52 ms   | 0.17 ms, 0.49 ms      |

HRPC replies between 16 and 64 KiB stall now and then for 3 to 6 ms; a 1 MiB reply measured 6.5 ms p50. On the macOS host every
HRPC call on an open connection is slower: 0.44 ms for 256 B and 10 ms for 64 KiB, growing linearly to 155 ms for 1 MiB, against
0.05 ms and 0.28 ms for Noise over TCP on the same machine. Benchmark on the OS the site runs, not on a developer laptop.

The public DHT changes the steps around the call, not the call. From the macOS host, joining took 6.2 to 6.8 s, announcing 3.6 s,
and a first call to a peer 527 ms p50 with a 1.39 s maximum; calls on an open connection matched the private DHT. A component that
restarts on the public DHT is therefore unreachable for about 10 s, and every first contact with a peer costs about half a second.

At MDK's cadences (telemetry pulls every 10 s, health pings every 5 s) per-call cost does not decide between the two. Start-up,
reconnects and failure detection do.

## Diagnosability

| Question                  | HRPC over HyperDHT                                                                     | Direct RPC                        |
| ------------------------- | -------------------------------------------------------------------------------------- | --------------------------------- |
| Is the service up?        | No port to probe; only an HRPC call to its key answers, and Kernel's health states cover Workers | `nc`, `curl`, load balancer health checks and blackbox probes against `host:port` |
| Where is it?              | Resolved from the key at connect time, never written in config                        | Config and DNS                    |
| Why did a call fail?      | `CHANNEL_CLOSED` for a dead peer, a frozen peer, a wrong key, a missing allowlist entry and unreachable bootstrap alike; only the delay differs | `ECONNREFUSED`, `ECONNRESET` and `ENOTFOUND` point at different causes |
| Who was rejected?         | Only the rejecting side knows: `DEBUG=mdk:kernel:hrpc` logs `blocked: <key prefix>` on Kernel, `DEBUG=mdk:worker:runtime` logs `blocked caller` on a Worker | The server rejects the certificate during the TLS handshake and can log its subject |
| What is on the wire?      | Encrypted UDP between ephemeral ports; a capture shows flows, not services            | TCP to a known port that capture tools label by port and TLS server name |
| Existing tooling          | Needs MDK-aware checks                                                                 | Standard monitoring, load balancers and service meshes work unchanged |

## When the DHT is most valuable

HRPC over HyperDHT earns its keep when:

- Addresses change: DHCP leases, rescheduled containers or hosts that move, so config must never name an IP
- Peers sit behind NAT or a firewall with no inbound rule, for example a Gateway outside the site network dialing its Kernel
- Nobody wants to run a PKI: keys need no CA, no issuance and no expiry
- Identity must outlive the address: allowlists name keys, so renumbering a network changes nothing
- One configuration must hold from a laptop to a multi-host site

A known-endpoint RPC is simpler when:

- Hosts are fixed and internal DNS already names them
- Outbound UDP to the public bootstrap nodes is blocked, so HRPC needs a private bootstrap anyway
- Operations depend on port probes, load balancer health checks or packet inspection
- A PKI or service mesh already issues and rotates certificates
- A failure must surface in milliseconds with a specific cause

A managed site that runs MDK today keeps HRPC and narrows its cost: pin every key, prefer local or single-process discovery where
Kernel and its Workers share a host, and run a private bootstrap where outbound UDP is blocked. The
[locked-down managed site][locked-down-site] shape covers those choices.

## Method

- One host, loopback only, so the numbers isolate transport overhead and leave out network round trips. They compare transports;
  they are not capacity figures.
- Linux is Node 24.22 in a `node:24-bookworm-slim` arm64 container under OrbStack on an Apple M3 Max; macOS is Node 24.16 on the
  same machine.
- HRPC is `@hyperswarm/rpc` 3.5.0 on `hyperdht` 6.34.1, the versions MDK pins. The private DHT is three `hyperdht/testnet` nodes on
  loopback; the public DHT uses the default bootstrap set.
- Each call sends a 256 B request, after 50 warm-up calls on the same connection.
- Failure drills run the peer as a separate process, send `SIGKILL` or `SIGSTOP` 200 ms before the call, and cap each wait at 60 s.
  The kill and freeze drills ran on macOS; the others ran on both hosts, and their timings, set by protocol timers, matched.

## Next steps

- [Deployment topologies](deployment-topologies.md): pick how Kernel learns Worker keys before choosing a network design
- [Hosted-site reference configuration](../guides/deployment/hosted-site.md): apply the key, allowlist and bootstrap settings for a managed site
- [Benchmark your site](../guides/deployment/benchmark-your-site.md): measure Kernel, Gateway and Workers on your own hardware

## Links

[hrpc-glossary]: ../reference/glossary.md#hyperswarm-rpc
<!-- docs@tether.io: hrpc-glossary → reference/glossary#hyperswarm-rpc -->

[deployment-topologies]: deployment-topologies.md
<!-- docs@tether.io: deployment-topologies → concepts/deployment-topologies -->

[hosted-site]: ../guides/deployment/hosted-site.md
<!-- docs@tether.io: hosted-site → guides/deployment/hosted-site -->

[health-monitor]: ../../backend/core/kernel/README.md#healthmonitor
<!-- docs@tether.io: health-monitor → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md#healthmonitor -->

[locked-down-site]: deployment-topologies.md#locked-down-managed-site
<!-- docs@tether.io: locked-down-site → concepts/deployment-topologies#locked-down-managed-site -->

[private-dht]: ../guides/deployment/private-dht.md
<!-- docs@tether.io: private-dht → guides/deployment/private-dht -->
