# Capacity profile: cap-5000devices-5workers-r1

Sweep: representative · Mode: multi-process · Generated: 2026-10-27T12:25:24.584Z

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
| Profile id | cap-5000devices-5workers-r1 |
| `n` (samples per latency row) | 1000 (minimum recommended: 100) |
| Soak duration | 60000 ms (**indicative** — below the 24h minimum for growth/leak claims) |
| Read load definition | 1000 concurrent telemetry reads for 3000 ms |
| Action load definition | 1000/s setPowerMode submits for 3000 ms |
| Start time (UTC) | 2026-10-27T12:15:47.299Z |
| End time (UTC) | 2026-10-27T12:25:24.584Z |

## Resource metrics template

Sampled per OS process by pid (`ps -o rss,pcpu`) at 250 ms intervals — real per-process numbers, not one blended figure, but no heap/external breakdown (that needs in-process instrumentation this harness doesn't have).

### Per process

#### mocks

| Metric | Unit | Warm (after READY) | Steady (end of soak) | Peak | Notes |
| --- | --- | --- | --- | --- | --- |
| CPU average | % of 1 core | `_` | 46.4 | `_` | sampled cross-process via `ps -o pcpu` |
| CPU peak | % | `_` | `_` | 101.9 | |
| RSS | MiB | 267.3 | 260.6 | 271.5 | sampled cross-process via `ps -o rss` |

#### kernel

| Metric | Unit | Warm (after READY) | Steady (end of soak) | Peak | Notes |
| --- | --- | --- | --- | --- | --- |
| CPU average | % of 1 core | `_` | 28.3 | `_` | sampled cross-process via `ps -o pcpu` |
| CPU peak | % | `_` | `_` | 111.4 | |
| RSS | MiB | 242.3 | 401.6 | 455.5 | sampled cross-process via `ps -o rss` |

#### gateway

| Metric | Unit | Warm (after READY) | Steady (end of soak) | Peak | Notes |
| --- | --- | --- | --- | --- | --- |
| CPU average | % of 1 core | `_` | 4.7 | `_` | sampled cross-process via `ps -o pcpu` |
| CPU peak | % | `_` | `_` | 51.6 | |
| RSS | MiB | 125.1 | 92.9 | 336.5 | sampled cross-process via `ps -o rss` |

#### mdk-worker-avalon (a1346)

| Metric | Unit | Warm (after READY) | Steady (end of soak) | Peak | Notes |
| --- | --- | --- | --- | --- | --- |
| CPU average | % of 1 core | `_` | 25.1 | `_` | sampled cross-process via `ps -o pcpu` |
| CPU peak | % | `_` | `_` | 130.8 | |
| RSS | MiB | 521.6 | 623.5 | 823.9 | sampled cross-process via `ps -o rss` |

#### mdk-worker-avalon (a1346)

| Metric | Unit | Warm (after READY) | Steady (end of soak) | Peak | Notes |
| --- | --- | --- | --- | --- | --- |
| CPU average | % of 1 core | `_` | 26.6 | `_` | sampled cross-process via `ps -o pcpu` |
| CPU peak | % | `_` | `_` | 115.5 | |
| RSS | MiB | 447.5 | 591.3 | 763.1 | sampled cross-process via `ps -o rss` |

#### mdk-worker-avalon (a1346)

| Metric | Unit | Warm (after READY) | Steady (end of soak) | Peak | Notes |
| --- | --- | --- | --- | --- | --- |
| CPU average | % of 1 core | `_` | 26.1 | `_` | sampled cross-process via `ps -o pcpu` |
| CPU peak | % | `_` | `_` | 117.6 | |
| RSS | MiB | 441.3 | 659.5 | 846.2 | sampled cross-process via `ps -o rss` |

#### mdk-worker-avalon (a1346)

| Metric | Unit | Warm (after READY) | Steady (end of soak) | Peak | Notes |
| --- | --- | --- | --- | --- | --- |
| CPU average | % of 1 core | `_` | 25.9 | `_` | sampled cross-process via `ps -o pcpu` |
| CPU peak | % | `_` | `_` | 125.7 | |
| RSS | MiB | 443.6 | 629.3 | 789.6 | sampled cross-process via `ps -o rss` |

#### mdk-worker-avalon (a1346)

| Metric | Unit | Warm (after READY) | Steady (end of soak) | Peak | Notes |
| --- | --- | --- | --- | --- | --- |
| CPU average | % of 1 core | `_` | 25.7 | `_` | sampled cross-process via `ps -o pcpu` |
| CPU peak | % | `_` | `_` | 103.2 | |
| RSS | MiB | 406.6 | 672.6 | 801.2 | sampled cross-process via `ps -o rss` |

### Site aggregate

| Metric | Unit | Value |
| --- | --- | --- |
| Sum of process RSS | MiB | 3848 |
| Host CPU (all MDK processes) | % | 208.6 |

### Storage breakdown

Growth/day is a real delta (size at profile start vs. now), divided by this run's own elapsed time (0.16 h) — the same short-soak caveat as the RSS slope applies (see Run reproducibility): a soak below the 24h minimum makes this **indicative**, not a committed growth rate. Projections are linear extrapolations of that rate.

| Store | Size now (MiB) | Growth / day (MiB) | Projected 6 mo (GiB) | Projected 12 mo (GiB) |
| --- | --- | --- | --- | --- |
| mdk-worker-avalon (a1346) | 126.3 | 12984.7334 (**indicative**) | 2282.5960 | 4565.0687 |
| mdk-worker-avalon (a1346) | 151.1 | 18167.9293 (**indicative**) | 3193.7289 | 6387.3102 |
| mdk-worker-avalon (a1346) | 132.3 | 15348.9649 (**indicative**) | 2698.1894 | 5396.2497 |
| mdk-worker-avalon (a1346) | 148.1 | 18429.5760 (**indicative**) | 3239.7185 | 6479.2924 |
| mdk-worker-avalon (a1346) | 93.7 | 10448.8499 (**indicative**) | 1836.8034 | 3673.5153 |
| **Total** | 651.4 | 75380.0535 (**indicative**) | 13251.0362 | 26501.4362 |

### Zero-device baseline and per-device marginal cost

Baseline: Kernel + Gateway + one idle Worker per configured type/model (0
owned devices each), booted and sampled the same way as the real run,
concurrently with it. `mocks` is excluded from both sides — see note below.

| Metric | Zero-device baseline | At 5000 devices | Per-device marginal | Unit |
| --- | --- | --- | --- | --- |
| CPU (site, all MDK processes) | 0.5 | 162.2 | 0.0323 | % of 1 core |
| RSS (site, all MDK processes) | 658 | 3589 | 0.5861 | MiB |

## Device baseline (MDK overhead)

| Measurement | Boundary | p50 ms | p95 ms | p99 ms | max ms | n | Real / simulated |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Device-only telemetry / status read | Raw TCP connect to mock (**approximate**: not the full vendor-protocol round trip) | 0.1 | `_` | 3.0 | 3.0 | 20 | simulated |

| Derived | Formula | Value |
| --- | --- | --- |
| MDK overhead (read p99) | telemetry read p99 − device-only p99 | 7015.3 ms |
| MDK overhead (action exec p99) | action submit p99 − device-only p99 (**approximate** — submit and exec aren't measured separately, see Write / action path) | 2587.8 ms |

## Cycle headroom (devices per Worker signal)

| Metric | Value | Unit |
| --- | --- | --- |
| Configured telemetry interval | 10000 | ms |
| Full collection cycle time (worst Worker, all owned devices) | 3488.1 | ms (avg / max: 3488.1 / 8279.9) |
| Cycle headroom ratio | 0.349 | cycle_time / interval |
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
| Sustained telemetry reads / s | 1466.3 | 1/s |
| Sustained actions / s | 87.6 | 1/s |
| Queue depth (peak / steady) | 1000 / `_` | count |
| Rejected requests | 2105 | count |
| Timed-out requests | 0 | count |
| Failure codes (reads) | none | count per code |
| Failure codes (actions) | `ERR_WORKER_NOT_ROUTABLE` 2105 | count per code |

## Latency metrics template

All latencies in **milliseconds**, same percentile set across profiles.

### Read path (telemetry and state)

| Operation | Boundary | p50 ms | p95 ms | p99 ms | max ms | n | errors |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Telemetry read (single device) | Gateway → Kernel → Worker → Gateway | 337.1 | 4081.1 | 5008.3 | 5008.3 | 49 | 1 |
| Telemetry read (single device) | Client → Kernel → Worker (bypasses Gateway) | 471.1 | 4919.4 | 7018.3 | 7813.8 | 15050 | 0 |
| Telemetry / overview read (aggregate) | Gateway (+ fleet-summary plugin) → Kernel → Workers | 7808.1 | 11273.3 | 11493.4 | 11493.4 | 50 | 0 |
| Device list / registry read | Client → Kernel (bypasses Gateway) | 5.5 | 13.1 | 75.2 | 75.2 | 50 | 0 |

### Write / action path

| Operation | Boundary | p50 ms | p95 ms | p99 ms | max ms | n | errors |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Send / submit action | Client → Gateway → Kernel accept | 4.3 | 58.4 | 70.3 | 70.3 | 50 | 0 |
| Action execution (Kernel dispatch → Worker → device ack) | Client → Kernel → Worker → device ack | 951.0 | 2463.0 | 2590.8 | 2608.4 | 419 | 2105 |
| End-to-end write action (submit → executed / terminal state) | Client → … → device → client-visible result | 951.0 | 2463.0 | 2590.8 | 2608.4 | 419 | 2105 |

| Action type | reqVotes | e2e p50 ms | e2e p99 ms | exec-only p50 ms | exec-only p99 ms | n |
| --- | --- | --- | --- | --- | --- | --- |
| setPowerMode | `_` (whitelisted per-worker in each package's own boot.js — not read back here) | 951.0 | 2590.8 | 951.0 | 2590.8 | 419 |

### Alerts path

Real condition, not injected: every device's temperature-warning threshold is forced below any real reading, so the devices's own alert trips on the first snap the Worker collects. Both rows below are n samples of one-per-device "time since this checklist started watching until the alert first appeared" — bounded below by the poll interval, and by the Worker's own snap interval above (`10000` ms): n = 0
| Operation | Boundary | p50 ms | p95 ms | p99 ms | max ms | n | errors |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Alert visible via Kernel (pull / list / query) | Consumer → Kernel → alert source | 421.0 | 6391.0 | 27194.0 | 124534.0 | 5000 | 0 |
| Alert visible via Gateway (HTTP / WebSocket / plugin) | Consumer → Gateway → Kernel / store | 6718.0 | 6989.0 | 54872.0 | 54872.0 | 50 | 0 |

Active alert names this run: chips_temp_critical (5000).

## Pass / fail thresholds

| Criterion | Green | Amber | Red | Profile result |
| --- | --- | --- | --- | --- |
| Telemetry freshness (cycle ≤ interval) | headroom < 0.7 | 0.7–1 | ≥ 1 | 0.349 (**green**) |
| Action e2e p99 | ≤ 2000 ms | n/a — binary criterion, no amber band | above green | 2590.8 ms (**red**) |
| Steady-state CPU (busiest process) | ≤ 80% | n/a — binary criterion, no amber band | above green | 46.4% (**green**) |
| Rejected + timed-out under sustained load | 0 | < 1.0% of attempted | otherwise | 2105 / 8392 attempted, 25.08% (**red**) |
| RSS slope over 24 h soak | flat (≤ 18000 MiB/h) | red demoted to amber when soak < 24h (indicative) | clear leak (soak ≥ 24h) | -1011.943 MiB/h (**green**) |

**Overall: RED**

## Failure behaviour

Worker restart and Kernel restart are real kill+respawn drills against the same on-disk store/root (both processes' identity persists across a restart). Every restart time counts from the kill, and READY is reported separately from the first device read that succeeds again. The unreachable-device drill kills the mocks process: every device behind a worker shares one mock server, so this can only make the **whole fleet** unreachable at once. A killed mocks process refuses the connection immediately (ECONNREFUSED), so failed reads are fast. The drill then reads one device until a read fails (a failed live `snap` read counts) and until every channel fails (the other channels serve cached values until the miner's 5s device-data cache expires).

| Scenario | Metric | Value | Notes |
| --- | --- | --- | --- |
| Worker restart | Time to healthy / owning devices again | 4555 ms | bench-worker-0, 1000 devices, recovered=true |
| Worker restart | Time to device reads served again | 7938 ms | from the kill; restored=true |
| Kernel restart | Time to READY | 4140 ms | recovered=true |
| Kernel restart | Time to device reads served again | 5462 ms | from the kill; restored=true |
| Unreachable device | Time until a read fails (measured) | 25 ms | from the kill; first failure `ERR_BENCH_SNAP_FAILED`, failed read took 3.8 ms (fast refusal); baseline read 210.5 ms |
| Unreachable device | Time until every channel fails (measured) | 4695 ms | from the kill; cached channels return the last values until then |
| Unreachable device | Time to reads served again after the mocks return | 324 ms | recovered=true |
| Unreachable device | Effect on cycle time (analytical, hung-device worst case) | 100000 ms | timeout (10000 ms) × ⌈5000 devices / 500 concurrency⌉ |
| Unreachable device | Timeout budget per device | 10000 ms | `thing.miner.timeout` (`MINER_DEVICE_TIMEOUT_MS` in lib/constants.js) — the real per-device RPC timeout; not `collectSnapTimeoutMs`, which only bounds periodic snap collection |
| 24 h soak | RSS slope (MiB / h) per process | mocks: -41.8748 MiB/h, kernel: 993.1741 MiB/h, gateway: -200.7332 MiB/h, worker-0: 360.2434 MiB/h, worker-1: 260.2587 MiB/h, worker-2: 812.5166 MiB/h, worker-3: 462.9057 MiB/h, worker-4: 1011.9431 MiB/h | leak detection — **indicative**, soak below 24h |
| 24 h soak | FD / socket slope (per hour) per process | mocks: 0.0000 /h, kernel: 0.0000 /h, gateway: 24.9247 /h, worker-0: 49.8487 /h, worker-1: 49.8484 /h, worker-2: 37.3867 /h, worker-3: 18.6937 /h, worker-4: 24.9266 /h | sampled via `lsof -p <pid>` at start/stop only (more expensive than `ps`) — **indicative**, soak below 24h |
