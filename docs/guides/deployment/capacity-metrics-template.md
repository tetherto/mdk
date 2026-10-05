---
title: Capacity and metrics template
description: Size MDK Workers for a given host and device count by measuring CPU, RAM, disk, cycle headroom, and latency against pass/fail thresholds
docs@tether_slug: guides/deployment/capacity-metrics-template
---

## Overview

This template turns measured runs into **sizing answers**: given your hardware and `N` miners, how many Workers do you need, and what do they cost in CPU, RAM, and disk?

Fill each profile with what is running, record host resources and end-to-end latencies, then derive per-device cost, cycle headroom, and pass/fail status. Use the same percentile set, soak rules, and load definition across profiles so rows stay comparable.

Absolute numbers without reference hardware, device baseline, and a zero-device floor are not enough to size a site. Prefer formulas (`RAM ≈ base + n × per-device`) and headroom ratios over one-off tables.

> [!NOTE]
> The [benchmark harness][benchmark-harness] fills this template in from measured runs automatically. Fill it in by hand only for a topology it doesn't cover yet.

## What a filled profile should answer

| Question | Where it comes from |
| --- | --- |
| How many devices per Worker? | Cycle time / configured interval (headroom); ceiling sweeps |
| How many Workers for `N` devices? | Devices-per-Worker recommendation × `N`, validated by Worker-split sweeps |
| CPU / RAM / disk for that layout | Zero-device baseline + per-device marginal cost |
| Is this configuration supported? | Pass/fail thresholds (green / amber / red) |
| What breaks first? | Ceiling profiles and failure-behaviour section |

## Reference hardware

Record one hardware block per profile.

### Hardware block (per profile)

| Field | Value |
| --- | --- |
| Reference tier | `edge` / `site-server` / `custom` |
| CPU model | `_` |
| CPU cores (physical / logical) | `_` / `_` |
| RAM | `_` GiB |
| Disk type | NVMe / SATA SSD / HDD / SD-class / other |
| Disk size | `_` GiB |
| OS | `_` |
| Node.js version | `_` |
| MDK version / commit | `_` |
| Network path to devices | local LAN / VLAN / WAN / simulated-in-process |
| Notes | `_` |

### Reference tiers

| Tier | Intent | Typical shape (fill with your lab hosts) |
| --- | --- | --- |
| `edge` | Small box colocated with a rack or container | `_` cores, `_` GiB RAM, SD-class or SATA |
| `site-server` | Proper site host for hundreds–thousands of devices | `_` cores, `_` GiB RAM, NVMe |

Map a customer host to the nearest tier before quoting sizing numbers. If hardware differs materially (especially disk class or core count), treat results as indicative only.

## Capacity profile

Define what is running before you measure anything.



### Workers

List Worker types and device counts.

| Worker type | Device count | Max Device count | real / simulated |
| --- | --- | --- | - |
| `_` | `_` | `_` | - |
| `_` | `_` | `_` | - |



### Run reproducibility

Define enough that someone outside the team can repeat the run.

| Field | Value |
| --- | --- |
| Profile id | e.g. `cap-100dev-w2` |
| `n` (samples per latency row) | `_` (minimum recommended: `_`) |
| Soak duration | `_` (minimum **24 h** for growth / leak claims) |
| Load generator | name / script / commit |
| Read load definition | e.g. `R` concurrent telemetry reads, mix `_` |
| Action load definition | e.g. `A` actions/s, types `_`, batch size `_` |
| Alert induction method | real condition / injected / wait |
| Config artifact path / hash | `_` |
| Start time (UTC) | `_` |
| End time (UTC) | `_` |

## Resource metrics template

Record process-level and site-level resources. CPU and RSS are sampled cross-process (e.g. `ps -o rss,pcpu`), which any consumer can do without being inside the Node process — heap and external/buffer memory need in-process instrumentation instead, so they're out of scope here even though Hypercore traffic shows up outside the V8 heap.

### Per process

Repeat one table per process (Kernel, each Worker, Gateway, MCP).

| Metric | Unit | Warm (after READY) | Steady (end of soak) | Peak | Notes |
| --- | --- | --- | --- | --- | --- |
| CPU average | % of 1 core or host | `_` | `_` | `_` | |
| CPU peak | % | `_` | `_` | `_` | |
| RSS | MiB | `_` | `_` | `_` | |

### Site aggregate

| Metric | Unit | Value |
| --- | --- | --- |
| Sum of process RSS | MiB / GiB | `_` |
| Host CPU (all MDK processes) | % | `_` |

### Storage breakdown

Per-Worker-store disk size and growth (Kernel/Gateway/alerts/logs storage isn't broken out per worker, so it's out of scope here). Growth/day is a real delta — size at profile start vs. now — divided by the run's own elapsed time; label **indicative** unless the soak is at least 24 h. Projections are linear extrapolations of that rate, not a model of Hyperbee/Corestore's actual (non-linear) growth curve — do not extrapolate a short soak to 12 months and treat it as a commitment.

| Store | Size now (MiB) | Growth / day (MiB) | Projected 6 mo (GiB) | Projected 12 mo (GiB) |
| --- | --- | --- | --- | --- |
| `_` | `_` | `_` | `_` | `_` |
| **Total** | `_` | `_` | `_` | `_` |

### Zero-device baseline and per-device marginal cost

Sums do not extrapolate. Measure a **zero-device** (or idle Worker with no owned devices) baseline, then subtract to get marginal cost.

| Metric | Zero-device baseline | At `D` devices | Per-device marginal | Unit |
| --- | --- | --- | --- | --- |
| CPU (site, all MDK processes) | `_` | `_` | `_` | % of 1 core |
| RSS (site, all MDK processes) | `_` | `_` | `_` | MiB |

**Sizing formulas** (fill coefficients from the table):

```text
RSS  ≈ RSS_base  + D × RSS_per_device
CPU  ≈ CPU_base  + D × CPU_per_device
```

State whether coefficients are per Worker process or site-wide, and which reference tier they belong to.

## Device baseline (MDK overhead)

Firmware round-trip dominates on real hardware. Record device-only response time so you can subtract it from MDK path latencies.

| Measurement | Boundary | p50 ms | p95 ms | p99 ms | max ms | n | Real / simulated |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Device-only telemetry / status read | Direct to device (no MDK) or mock equivalent | `_` | `_` | `_` | `_` | `_` | |
| Device-only action ack | Direct to device | `_` | `_` | `_` | `_` | `_` | |

| Derived | Formula | Value |
| --- | --- | --- |
| MDK overhead (read p99) | MDK path p99 − device-only p99 | `_` ms |
| MDK overhead (action exec p99) | Exec path p99 − device-only p99 | `_` ms |

The number that makes MDK credible for sizing is the **overhead MDK adds** on top of what the device itself takes.

## Cycle headroom (devices per Worker signal)

For each profile, record how long a full collection cycle takes against the interval it is configured for. The ratio is headroom; the point where it crosses **1.0** is the practical answer to "how many devices per Worker."

| Metric | Value | Unit |
| --- | --- | --- |
| Configured telemetry interval | `_` | ms |
| Full collection cycle time (all owned devices) | `_` | ms (p50 / p95 / p99: `_` / `_` / `_`) |
| Cycle headroom ratio | `cycle_time` / interval | `_` |
| Devices owned by this Worker | `_` | count |
| Unreachable devices during cycle | `_` | count |
| Timeout budget consumed by unreachable devices | `_` | ms |

| Headroom | Meaning |
| --- | --- |
| `< 0.7` | Comfortable |
| `0.7–1.0` | Amber — little spare capacity |
| `≥ 1.0` | Overrun — reduce devices per Worker or raise concurrency / interval |

## Throughput under load

Record sustained rates and backpressure.

| Metric | Value | Unit |
| --- | --- | --- |
| Sustained telemetry reads / s | `_` | 1/s |
| Sustained actions / s | `_` | 1/s |
| Queue depth (peak / steady) | `_` / `_` | count |
| Rejected requests | `_` | count |
| Timed-out requests | `_` | count |

## Latency metrics template

All latencies in **milliseconds** use the same percentile set across profiles so rows are comparable. Record `n` on every row (see run reproducibility).

### Read path (telemetry and state)

Time from consumer request until usable payload returns.

| Operation | Boundary | p50 ms | p95 ms | p99 ms | max ms | n | errors |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Telemetry read (single device) | Gateway → Kernel → Worker → Gateway | `_` | `_` | `_` | `_` | `_` | `_` |
| Telemetry read (single device) | Kernel → Worker only | `_` | `_` | `_` | `_` | `_` | `_` |
| Telemetry / overview read (aggregate) | Gateway (+ plugin) → Kernel → Workers | `_` | `_` | `_` | `_` | `_` | `_` |
| Device list / registry read | Gateway → Kernel | `_` | `_` | `_` | `_` | `_` | `_` |

Scheduled Kernel telemetry pull and health ping are Kernel-internal timers with no client-observable start/end signal distinct from the reads above — not independently measurable without in-process Kernel instrumentation, so they're not tracked as separate rows.

### Write / action path

Split **submit** and **execution** so bottlenecks are visible. A separate approval round only exists if the Worker's write-action whitelist requires more than one vote — every shipped worker whitelists at a single required vote, so submit and execute collapse into one step.

| Operation | Boundary | p50 ms | p95 ms | p99 ms | max ms | n | errors |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Send / submit action | Client → Gateway → Kernel accept | `_` | `_` | `_` | `_` | `_` | `_` |
| Action execution (Kernel dispatch → Worker → device ack) | Kernel ActionCaller → Worker → device | `_` | `_` | `_` | `_` | `_` | `_` |
| End-to-end write action (submit → executed / terminal state) | Client → … → device → client-visible result | `_` | `_` | `_` | `_` | `_` | `_` |

Record separately by action type (for example reboot vs setPowerMode vs `updateThing`).

| Action type | `reqVotes` | e2e p50 ms | e2e p99 ms | exec-only p50 ms | exec-only p99 ms | n |
| --- | --- | --- | --- | --- | --- | --- |
| `_` | `_` | `_` | `_` | `_` | `_` | `_` |

### Alerts path

Track delivery — when Kernel or Gateway consumers can read the alert — separately by boundary. Alert generation (condition → persisted alert record) happens synchronously inside the Worker process and isn't independently observable without in-process instrumentation, so it isn't tracked as its own row.

| Operation | Boundary | p50 ms | p95 ms | p99 ms | max ms | n | errors |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Alert visible via Kernel (pull / list / query) | Consumer → Kernel → alert source | `_` | `_` | `_` | `_` | `_` | `_` |
| Alert visible via Gateway (HTTP / WebSocket / plugin) | Consumer → Gateway → Kernel / store | `_` | `_` | `_` | `_` | `_` | `_` |

Fan-out to N subscribers and historical (range-read) alert queries need Gateway capabilities (a subscription/push mechanism, a history store) beyond a single request/response endpoint — out of scope until the Gateway carries one.

## Pass / fail thresholds

Set site-wide defaults, then mark each profile green / amber / red.

| Criterion | Green | Amber | Red | Profile result |
| --- | --- | --- | --- | --- |
| Telemetry freshness (cycle ≤ interval) | headroom `< 0.7` | `0.7–1.0` | `≥ 1.0` | `_` |
| Action e2e p99 | `≤ _` ms | `≤ _` ms | above amber | `_` |
| Steady-state CPU (host or busiest process) | `≤ _` % | `≤ _` % | above amber | `_` |
| Rejected + timed-out under sustained load | `0` | `< _` | otherwise | `_` |
| RSS slope over 24 h soak | flat / `_` MiB/h | `_` | clear leak | `_` |

**Supported up to** means the densest green profile on that reference tier (devices per Worker and total `D`). Publish that bound explicitly after ceiling sweeps.

## Failure behaviour

Measure process failure recovery on at least one profile per reference tier. "Unreachable device" can only be induced fleet-wide if every device behind a Worker shares one mock/gateway endpoint rather than an isolated one per device — note the actual scope achieved, not just "one device" by assumption.

| Scenario | Metric | Value | Notes |
| --- | --- | --- | --- |
| Worker restart | Time to healthy / owning devices again | `_` ms | |
| Kernel restart | Time to READY | `_` ms | |
| Unreachable device | Effect on cycle time (measured) | `_` | live drill result; note whether the failure mode was a fast refusal or an actual hang |
| Unreachable device | Effect on cycle time (analytical, hung-device worst case) | `_` | timeout × ⌈unreachable count / concurrency⌉ |
| Unreachable device | Timeout budget per device | `_` ms | from operating parameters |
| 24 h soak | RSS slope (MiB / h) per process | `_` | leak detection |
| 24 h soak | FD / socket slope (per hour) per process | `_` | |

## Profile comparison matrix

One row per capacity profile. Copy columns as needed. Leave cells blank until measured. Prefer profile ids like `cap-10dev` / `cap-100dev-w2` (not `cap-10m`, which reads as ten minutes).

| Profile id | Tier | Real/sim | Kernels | Gateways | Plugins | W | D | Alert rules | CPU sum % | RSS sum | Heap sum | Disk now | Disk/day | Headroom | Reads/s | Actions/s | Rejects+timeouts | Read p99 | Action e2e p99 | Alert gen p99 | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `cap-10dev` | `_` | `_` | 1 | 1 | 1 | 3 | 12 | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` |
| `cap-50dev` | `_` | `_` | 1 | 1 | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` |
| `cap-100dev` | `_` | `_` | 1 | 1 | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` |
| `cap-500dev` | `_` | `_` | 1 | 1 | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` |
| `cap-1000dev` | `_` | `_` | 1 | 1 | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` |
| `cap-5000dev` | `_` | `_` | 1 | 1 | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` |
| `cap-custom` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` | `_` |

## Measurement checklist

Use the same checklist for every profile so results stay comparable.

1. Record reference hardware (tier, CPU, RAM, disk class, OS, Node, MDK, network path)
2. Record the capacity profile (control plane, Workers, devices, real vs simulated, operating parameters including alert rule count)
3. Record run reproducibility (`n`, soak ≥ 24 h for growth/leak claims, load generator, config hash)
4. Bring the site to READY; capture zero-device baseline if this run includes marginal-cost derivation
5. Sample CPU and RSS on a fixed interval throughout the soak; sample open FDs/sockets and on-disk store size at start and end (heap/external memory need in-process instrumentation and stay out of scope)
6. Measure device-only baseline response times; derive MDK overhead
7. Measure full telemetry cycle time vs configured interval (headroom)
8. Drive a defined read load; record read-path latencies and sustained reads/s
9. Drive a defined action load (single and batch); record submit, exec, e2e, actions/s, queue depth, rejects/timeouts
10. Induce or wait for alerts; record Kernel and Gateway visibility latencies (alert generation itself is Worker-internal and not independently observable)
11. Run failure drills (Worker restart, Kernel READY, unreachable-device impact — measured live plus the analytical hung-device worst case) for the profile set
12. Compute storage growth per Worker store from the soak (size at start vs. now, divided by elapsed time); label 6/12-month projections **indicative**
13. Apply pass/fail thresholds; copy summary into the comparison matrix and relevant sweep tables
14. Note failures, timeouts, config drift, and which single variable changed vs the previous profile

## Links

[benchmark-harness]: benchmark-your-site.md
<!-- docs@tether.io: benchmark-harness → guides/deployment/benchmark-your-site -->
