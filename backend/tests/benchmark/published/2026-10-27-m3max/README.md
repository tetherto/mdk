---
title: Benchmark reports, 2026-10-27, Apple M3 Max
description: Per-profile benchmark harness reports behind the published benchmark results and operating limits
---

## Overview

These are the per-profile reports, in the capacity and metrics template format, that the
[benchmark results and operating limits][benchmark-results] page summarizes. Each profile has a Markdown report and the JSON
it was rendered from. Store paths in the JSON are relative to `backend/tests/benchmark/`.

Every run used MDK 0.12.1 at commit `2d71e224`, with no uncommitted changes to the harness, on one Apple M3 Max workstation
with simulated Avalon A1346 devices on loopback. Every report records config hash `2f48ab70dc13`.

| Files                                 | Profile                  | Notes                                                                 |
| ------------------------------------- | ------------------------ | --------------------------------------------------------------------- |
| `cap-10devices-1workers-r{1,2,3}.*`   | 10 devices, 1 Worker     | Three runs. `r3` is amber: 14 saturation reads timed out              |
| `cap-100devices-1workers-r{1,2,3}.*`  | 100 devices, 1 Worker    | Three runs                                                            |
| `cap-500devices-1workers.*`           | 500 devices, 1 Worker    |                                                                       |
| `cap-1000devices-1workers-r{1,2,3}.*` | 1,000 devices, 1 Worker  | Three runs                                                            |
| `cap-1000devices-2workers.*`          | 1,000 devices, 2 Workers |                                                                       |
| `cap-2000devices-1workers.*`          | 2,000 devices, 1 Worker  |                                                                       |
| `cap-2000devices-4workers.*`          | 2,000 devices, 4 Workers |                                                                       |
| `cap-5000devices-1workers.*`          | 5,000 devices, 1 Worker  | Red: collection headroom and Worker CPU                               |
| `cap-5000devices-5workers-r{1,2}.*`   | 5,000 devices, 5 Workers | Two runs. `r1` is red: 2,105 action submits rejected with `ERR_WORKER_NOT_ROUTABLE` |

## Reading these reports

### Network path

Every report records "Network path to devices" as `simulated-in-process`. That value is the [capacity template][capacity-template]
category for simulated devices with no real network between Worker and device, as opposed to `local LAN`, `VLAN`, or `WAN`. It
does not mean the devices run inside the Worker process. In these runs the mocks run as their own OS process, separate from the
Kernel, Gateway, and every Worker, and each Worker reaches its devices over TCP on loopback (`127.0.0.1`), through one mock
listener per Worker. No physical network sits on the path, so these results carry no network latency or packet loss.

### Device timeouts in the JSON

`operatingParameters.deviceRequestTimeoutMs` is the per-device RPC timeout, `thing.miner.timeout`, which is 10,000 ms in every
run. `operatingParameters.collectSnapTimeoutMs` is the 2,000 ms bound on the Worker's periodic snap collection. The harness at
commit `2d71e224` writes the 2,000 ms snap bound under `deviceRequestTimeoutMs` and omits `collectSnapTimeoutMs`; the JSON
here carries both fields with their correct values, and the Markdown reports, which never render either field, are unchanged.

## Next steps

- [Benchmark results and operating limits][benchmark-results]: what these reports show and the envelopes derived from them
- [Benchmark harness](../../README.md): how to produce reports like these on your own hardware

## Links

[benchmark-results]: ../../../../../docs/guides/deployment/benchmark-results.md
<!-- docs@tether.io: benchmark-results → guides/deployment/benchmark-results -->

[capacity-template]: ../../../../../docs/guides/deployment/capacity-metrics-template.md
<!-- docs@tether.io: capacity-template → guides/deployment/capacity-metrics-template -->
