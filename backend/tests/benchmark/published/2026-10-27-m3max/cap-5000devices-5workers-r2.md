# Capacity profile: cap-5000devices-5workers-r2

Sweep: representative · Mode: multi-process · Generated: 2026-10-27T12:34:48.981Z

## Reference hardware

### Hardware block (per profile)

| Field | Value |
| --- | --- |
| Reference tier | custom |
| CPU model | Apple M3 Max |
| CPU cores (physical / logical) | 14 / 14 |
| RAM | 36 GiB |
| Disk type | NVMe (Apple Fabric SSD) |
| Disk size | 926 GiB |
| OS | macOS 15.8.1 (24H32), darwin arm64 |
| Node.js version | v24.19.0 |
| MDK version / commit | 0.12.1 @ 2d71e224 |
| Network path to devices | simulated-in-process |
| Notes | Developer workstation, loopback mocks (one mock TCP/HTTP listener per Worker). Not a reference tier; results are indicative. |

## Capacity profile

### Workers

| Worker type | Device count | Max Device count | real / simulated |
| --- | --- | --- | --- |
| mdk-worker-avalon (a1346) | 1000 | 10 | simulated |
| mdk-worker-avalon (a1346) | 1000 | 10 | simulated |
| mdk-worker-avalon (a1346) | 1000 | 10 | simulated |
| mdk-worker-avalon (a1346) | 1000 | 10 | simulated |
| mdk-worker-avalon (a1346) | 1000 | 10 | simulated |

### Run reproducibility

| Field | Value |
| --- | --- |
| Profile id | cap-5000devices-5workers-r2 |
| `n` (samples per latency row) | 1000 (minimum recommended: 100) |
| Soak duration | 60000 ms (**indicative** — below the 24h minimum for growth/leak claims) |
| Read load definition | 1000 concurrent telemetry reads for 3000 ms |
| Action load definition | 1000/s setPowerMode submits for 3000 ms |
| Start time (UTC) | 2026-10-27T12:26:28.137Z |
| End time (UTC) | 2026-10-27T12:34:48.981Z |

## Resource metrics template

Sampled per OS process by pid (`ps -o rss,pcpu`) at 250 ms intervals — real per-process numbers, not one blended figure, but no heap/external breakdown (that needs in-process instrumentation this harness doesn't have).

### Per process

#### mocks

| Metric | Unit | Warm (after READY) | Steady (end of soak) | Peak | Notes |
| --- | --- | --- | --- | --- | --- |
| CPU average | % of 1 core | `_` | 47.3 | `_` | sampled cross-process via `ps -o pcpu` |
| CPU peak | % | `_` | `_` | 91.5 | |
| RSS | MiB | 287.9 | 266.1 | 287.9 | sampled cross-process via `ps -o rss` |

#### kernel

| Metric | Unit | Warm (after READY) | Steady (end of soak) | Peak | Notes |
| --- | --- | --- | --- | --- | --- |
| CPU average | % of 1 core | `_` | 29.1 | `_` | sampled cross-process via `ps -o pcpu` |
| CPU peak | % | `_` | `_` | 137.5 | |
| RSS | MiB | 227.4 | 505.8 | 505.8 | sampled cross-process via `ps -o rss` |

#### gateway

| Metric | Unit | Warm (after READY) | Steady (end of soak) | Peak | Notes |
| --- | --- | --- | --- | --- | --- |
| CPU average | % of 1 core | `_` | 5.0 | `_` | sampled cross-process via `ps -o pcpu` |
| CPU peak | % | `_` | `_` | 54.5 | |
| RSS | MiB | 138.7 | 80.4 | 341.0 | sampled cross-process via `ps -o rss` |

#### mdk-worker-avalon (a1346)

| Metric | Unit | Warm (after READY) | Steady (end of soak) | Peak | Notes |
| --- | --- | --- | --- | --- | --- |
| CPU average | % of 1 core | `_` | 25.9 | `_` | sampled cross-process via `ps -o pcpu` |
| CPU peak | % | `_` | `_` | 106.5 | |
| RSS | MiB | 548.4 | 593.1 | 723.3 | sampled cross-process via `ps -o rss` |

#### mdk-worker-avalon (a1346)

| Metric | Unit | Warm (after READY) | Steady (end of soak) | Peak | Notes |
| --- | --- | --- | --- | --- | --- |
| CPU average | % of 1 core | `_` | 26.4 | `_` | sampled cross-process via `ps -o pcpu` |
| CPU peak | % | `_` | `_` | 118.7 | |
| RSS | MiB | 474.6 | 616.9 | 661.4 | sampled cross-process via `ps -o rss` |

#### mdk-worker-avalon (a1346)

| Metric | Unit | Warm (after READY) | Steady (end of soak) | Peak | Notes |
| --- | --- | --- | --- | --- | --- |
| CPU average | % of 1 core | `_` | 26.0 | `_` | sampled cross-process via `ps -o pcpu` |
| CPU peak | % | `_` | `_` | 112.5 | |
| RSS | MiB | 457.2 | 572.3 | 676.0 | sampled cross-process via `ps -o rss` |

#### mdk-worker-avalon (a1346)

| Metric | Unit | Warm (after READY) | Steady (end of soak) | Peak | Notes |
| --- | --- | --- | --- | --- | --- |
| CPU average | % of 1 core | `_` | 25.9 | `_` | sampled cross-process via `ps -o pcpu` |
| CPU peak | % | `_` | `_` | 119.0 | |
| RSS | MiB | 410.1 | 685.6 | 685.6 | sampled cross-process via `ps -o rss` |

#### mdk-worker-avalon (a1346)

| Metric | Unit | Warm (after READY) | Steady (end of soak) | Peak | Notes |
| --- | --- | --- | --- | --- | --- |
| CPU average | % of 1 core | `_` | 26.0 | `_` | sampled cross-process via `ps -o pcpu` |
| CPU peak | % | `_` | `_` | 117.1 | |
| RSS | MiB | 468.8 | 700.1 | 706.3 | sampled cross-process via `ps -o rss` |

### Site aggregate

| Metric | Unit | Value |
| --- | --- | --- |
| Sum of process RSS | MiB | 3655 |
| Host CPU (all MDK processes) | % | 211.5 |

### Storage breakdown

Growth/day is a real delta (size at profile start vs. now), divided by this run's own elapsed time (0.14 h) — the same short-soak caveat as the RSS slope applies (see Run reproducibility): a soak below the 24h minimum makes this **indicative**, not a committed growth rate. Projections are linear extrapolations of that rate.

| Store | Size now (MiB) | Growth / day (MiB) | Projected 6 mo (GiB) | Projected 12 mo (GiB) |
| --- | --- | --- | --- | --- |
| mdk-worker-avalon (a1346) | 147.0 | 18119.7344 (**indicative**) | 3185.2532 | 6370.3627 |
| mdk-worker-avalon (a1346) | 136.9 | 18350.3798 (**indicative**) | 3225.7864 | 6451.4391 |
| mdk-worker-avalon (a1346) | 185.4 | 26638.2021 (**indicative**) | 4682.6775 | 9365.1740 |
| mdk-worker-avalon (a1346) | 159.6 | 23218.2263 (**indicative**) | 4081.4847 | 8162.8135 |
| mdk-worker-avalon (a1346) | 125.3 | 17513.7185 (**indicative**) | 3078.7056 | 6157.2890 |
| **Total** | 754.1 | 103840.2612 (**indicative**) | 18253.9074 | 36507.0783 |

### Zero-device baseline and per-device marginal cost

Baseline: Kernel + Gateway + one idle Worker per configured type/model (0
owned devices each), booted and sampled the same way as the real run,
concurrently with it. `mocks` is excluded from both sides — see note below.

| Metric | Zero-device baseline | At 5000 devices | Per-device marginal | Unit |
| --- | --- | --- | --- | --- |
| CPU (site, all MDK processes) | 0.6 | 164.2 | 0.0327 | % of 1 core |
| RSS (site, all MDK processes) | 661 | 3397 | 0.5474 | MiB |

## Device baseline (MDK overhead)

| Measurement | Boundary | p50 ms | p95 ms | p99 ms | max ms | n | Real / simulated |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Device-only telemetry / status read | Raw TCP connect to mock (**approximate**: not the full vendor-protocol round trip) | 0.1 | `_` | 0.8 | 0.8 | 20 | simulated |

| Derived | Formula | Value |
| --- | --- | --- |
| MDK overhead (read p99) | telemetry read p99 − device-only p99 | 5370.5 ms |
| MDK overhead (action exec p99) | action submit p99 − device-only p99 (**approximate** — submit and exec aren't measured separately, see Write / action path) | 702.0 ms |

## Cycle headroom (devices per Worker signal)

| Metric | Value | Unit |
| --- | --- | --- |
| Configured telemetry interval | 10000 | ms |
| Full collection cycle time (worst Worker, all owned devices) | 3504.7 | ms (avg / max: 3504.7 / 8111.3) |
| Cycle headroom ratio | 0.350 | cycle_time / interval |
| Devices owned by this Worker | 1000 | count |
| Unreachable devices during cycle | 0 | count |
| Timeout budget consumed by unreachable devices | `_` | ms |

| Headroom | Meaning |
| --- | --- |
| `< 0.7` | Comfortable |
| `0.7–1.0` | Amber — little spare capacity |
| `>= 1.0` | Overrun — reduce devices per Worker or raise concurrency / interval |

This profile: **green**.

## Throughput under load

Reads below are driven at 1000 concurrent readers for 3000 ms — deliberately >= the Worker's own operating concurrency (500), to find the queueing/rejection ceiling rather than measure steady-state single-request latency. Per-call latency for this saturation phase is recorded separately from the "Telemetry read (single device)" row in the Latency metrics section below (see `latencies.readLoadSaturation` in the JSON output) precisely so induced queue wait doesn't read as ordinary read-path latency.

| Metric | Value | Unit |
| --- | --- | --- |
| Sustained telemetry reads / s | 490.4 | 1/s |
| Sustained actions / s | 732.0 | 1/s |
| Queue depth (peak / steady) | 1000 / `_` | count |
| Rejected requests | 0 | count |
| Timed-out requests | 0 | count |
| Failure codes (reads) | none | count per code |
| Failure codes (actions) | none | count per code |

## Latency metrics template

All latencies in **milliseconds**, same percentile set across profiles.

### Read path (telemetry and state)

| Operation | Boundary | p50 ms | p95 ms | p99 ms | max ms | n | errors |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Telemetry read (single device) | Gateway → Kernel → Worker → Gateway | 341.5 | 3205.8 | 5558.9 | 5558.9 | 50 | 0 |
| Telemetry read (single device) | Client → Kernel → Worker (bypasses Gateway) | 464.1 | 4672.7 | 5371.4 | 7235.8 | 15050 | 0 |
| Telemetry / overview read (aggregate) | Gateway (+ fleet-summary plugin) → Kernel → Workers | 6272.2 | 10721.8 | 13970.2 | 13970.2 | 50 | 0 |
| Device list / registry read | Client → Kernel (bypasses Gateway) | 6.7 | 29.0 | 81.7 | 81.7 | 50 | 0 |

### Write / action path

| Operation | Boundary | p50 ms | p95 ms | p99 ms | max ms | n | errors |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Send / submit action | Client → Gateway → Kernel accept | 3.1 | 12.2 | 64.0 | 64.0 | 50 | 0 |
| Action execution (Kernel dispatch → Worker → device ack) | Client → Kernel → Worker → device ack | 422.5 | 656.4 | 702.8 | 710.6 | 2505 | 0 |
| End-to-end write action (submit → executed / terminal state) | Client → … → device → client-visible result | 422.5 | 656.4 | 702.8 | 710.6 | 2505 | 0 |

| Action type | reqVotes | e2e p50 ms | e2e p99 ms | exec-only p50 ms | exec-only p99 ms | n |
| --- | --- | --- | --- | --- | --- | --- |
| setPowerMode | `_` (whitelisted per-worker in each package's own boot.js — not read back here) | 422.5 | 702.8 | 422.5 | 702.8 | 2505 |

### Alerts path

Real condition, not injected: every device's temperature-warning threshold is forced below any real reading, so the devices's own alert trips on the first snap the Worker collects. Both rows below are n samples of one-per-device "time since this checklist started watching until the alert first appeared" — bounded below by the poll interval, and by the Worker's own snap interval above (`10000` ms): n = 0
| Operation | Boundary | p50 ms | p95 ms | p99 ms | max ms | n | errors |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Alert visible via Kernel (pull / list / query) | Consumer → Kernel → alert source | 413.0 | 640.0 | 151694.0 | 154326.0 | 5000 | 0 |
| Alert visible via Gateway (HTTP / WebSocket / plugin) | Consumer → Gateway → Kernel / store | 6553.0 | 6914.0 | 149618.0 | 149618.0 | 50 | 0 |

Active alert names this run: chips_temp_critical (5000).

## Pass / fail thresholds

| Criterion | Green | Amber | Red | Profile result |
| --- | --- | --- | --- | --- |
| Telemetry freshness (cycle ≤ interval) | headroom < 0.7 | 0.7–1 | ≥ 1 | 0.350 (**green**) |
| Action e2e p99 | ≤ 2000 ms | n/a — binary criterion, no amber band | above green | 702.8 ms (**green**) |
| Steady-state CPU (busiest process) | ≤ 80% | n/a — binary criterion, no amber band | above green | 47.3% (**green**) |
| Rejected + timed-out under sustained load | 0 | < 1.0% of attempted | otherwise | 0 / 6098 attempted, 0.00% (**green**) |
| RSS slope over 24 h soak | flat (≤ 18000 MiB/h) | red demoted to amber when soak < 24h (indicative) | clear leak (soak ≥ 24h) | -2000.141 MiB/h (**green**) |

**Overall: GREEN**

## Failure behaviour

Worker restart and Kernel restart are real kill+respawn drills against the same on-disk store/root (both processes' identity persists across a restart). Every restart time counts from the kill, and READY is reported separately from the first device read that succeeds again. The unreachable-device drill kills the mocks process: every device behind a worker shares one mock server, so this can only make the **whole fleet** unreachable at once. A killed mocks process refuses the connection immediately (ECONNREFUSED), so failed reads are fast. The drill then reads one device until a read fails (a failed live `snap` read counts) and until every channel fails (the other channels serve cached values until the miner's 5s device-data cache expires).

| Scenario | Metric | Value | Notes |
| --- | --- | --- | --- |
| Worker restart | Time to healthy / owning devices again | 5475 ms | bench-worker-0, 1000 devices, recovered=true |
| Worker restart | Time to device reads served again | 6127 ms | from the kill; restored=true |
| Kernel restart | Time to READY | 6373 ms | recovered=true |
| Kernel restart | Time to device reads served again | 6701 ms | from the kill; restored=true |
| Unreachable device | Time until a read fails (measured) | 28 ms | from the kill; first failure `ERR_BENCH_SNAP_FAILED`, failed read took 8.7 ms (fast refusal); baseline read 228.3 ms |
| Unreachable device | Time until every channel fails (measured) | 4629 ms | from the kill; cached channels return the last values until then |
| Unreachable device | Time to reads served again after the mocks return | 334 ms | recovered=true |
| Unreachable device | Effect on cycle time (analytical, hung-device worst case) | 100000 ms | timeout (10000 ms) × ⌈5000 devices / 500 concurrency⌉ |
| Unreachable device | Timeout budget per device | 10000 ms | `thing.miner.timeout` (`MINER_DEVICE_TIMEOUT_MS` in lib/constants.js) — the real per-device RPC timeout; not `collectSnapTimeoutMs`, which only bounds periodic snap collection |
| 24 h soak | RSS slope (MiB / h) per process | mocks: -156.8266 MiB/h, kernel: 2000.1407 MiB/h, gateway: -418.9468 MiB/h, worker-0: 212.1485 MiB/h, worker-1: 372.6613 MiB/h, worker-2: -329.0095 MiB/h, worker-3: 913.9413 MiB/h, worker-4: 1241.1993 MiB/h | leak detection — **indicative**, soak below 24h |
| 24 h soak | FD / socket slope (per hour) per process | mocks: 193.8932 /h, kernel: 7.1809 /h, gateway: 28.7237 /h, worker-0: 57.4475 /h, worker-1: -129.2575 /h, worker-2: 57.4525 /h, worker-3: 71.8169 /h, worker-4: 57.4541 /h | sampled via `lsof -p <pid>` at start/stop only (more expensive than `ps`) — **indicative**, soak below 24h |
