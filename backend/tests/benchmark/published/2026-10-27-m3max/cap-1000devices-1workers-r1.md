# Capacity profile: cap-1000devices-1workers-r1

Sweep: representative · Mode: multi-process · Generated: 2026-10-27T11:32:06.116Z

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

### Run reproducibility

| Field | Value |
| --- | --- |
| Profile id | cap-1000devices-1workers-r1 |
| `n` (samples per latency row) | 1000 (minimum recommended: 100) |
| Soak duration | 60000 ms (**indicative** — below the 24h minimum for growth/leak claims) |
| Read load definition | 1000 concurrent telemetry reads for 3000 ms |
| Action load definition | 1000/s setPowerMode submits for 3000 ms |
| Start time (UTC) | 2026-10-27T11:29:49.463Z |
| End time (UTC) | 2026-10-27T11:32:06.116Z |

## Resource metrics template

Sampled per OS process by pid (`ps -o rss,pcpu`) at 250 ms intervals — real per-process numbers, not one blended figure, but no heap/external breakdown (that needs in-process instrumentation this harness doesn't have).

### Per process

#### mocks

| Metric | Unit | Warm (after READY) | Steady (end of soak) | Peak | Notes |
| --- | --- | --- | --- | --- | --- |
| CPU average | % of 1 core | `_` | 18.8 | `_` | sampled cross-process via `ps -o pcpu` |
| CPU peak | % | `_` | `_` | 65.4 | |
| RSS | MiB | 177.1 | 234.2 | 287.0 | sampled cross-process via `ps -o rss` |

#### kernel

| Metric | Unit | Warm (after READY) | Steady (end of soak) | Peak | Notes |
| --- | --- | --- | --- | --- | --- |
| CPU average | % of 1 core | `_` | 20.8 | `_` | sampled cross-process via `ps -o pcpu` |
| CPU peak | % | `_` | `_` | 126.9 | |
| RSS | MiB | 150.9 | 434.8 | 434.8 | sampled cross-process via `ps -o rss` |

#### gateway

| Metric | Unit | Warm (after READY) | Steady (end of soak) | Peak | Notes |
| --- | --- | --- | --- | --- | --- |
| CPU average | % of 1 core | `_` | 3.5 | `_` | sampled cross-process via `ps -o pcpu` |
| CPU peak | % | `_` | `_` | 30.6 | |
| RSS | MiB | 140.7 | 134.5 | 262.3 | sampled cross-process via `ps -o rss` |

#### mdk-worker-avalon (a1346)

| Metric | Unit | Warm (after READY) | Steady (end of soak) | Peak | Notes |
| --- | --- | --- | --- | --- | --- |
| CPU average | % of 1 core | `_` | 40.0 | `_` | sampled cross-process via `ps -o pcpu` |
| CPU peak | % | `_` | `_` | 118.9 | |
| RSS | MiB | 392.3 | 673.4 | 797.2 | sampled cross-process via `ps -o rss` |

### Site aggregate

| Metric | Unit | Value |
| --- | --- | --- |
| Sum of process RSS | MiB | 1249 |
| Host CPU (all MDK processes) | % | 83.1 |

### Storage breakdown

Growth/day is a real delta (size at profile start vs. now), divided by this run's own elapsed time (0.04 h) — the same short-soak caveat as the RSS slope applies (see Run reproducibility): a soak below the 24h minimum makes this **indicative**, not a committed growth rate. Projections are linear extrapolations of that rate.

| Store | Size now (MiB) | Growth / day (MiB) | Projected 6 mo (GiB) | Projected 12 mo (GiB) |
| --- | --- | --- | --- | --- |
| mdk-worker-avalon (a1346) | 49.4 | 19305.5262 (**indicative**) | 3393.5978 | 6787.1473 |
| **Total** | 49.4 | 19305.5262 (**indicative**) | 3393.5978 | 6787.1473 |

### Zero-device baseline and per-device marginal cost

Baseline: Kernel + Gateway + one idle Worker per configured type/model (0
owned devices each), booted and sampled the same way as the real run,
concurrently with it. `mocks` is excluded from both sides — see note below.

| Metric | Zero-device baseline | At 1000 devices | Per-device marginal | Unit |
| --- | --- | --- | --- | --- |
| CPU (site, all MDK processes) | 0.6 | 64.4 | 0.0638 | % of 1 core |
| RSS (site, all MDK processes) | 311 | 1028 | 0.7170 | MiB |

## Device baseline (MDK overhead)

| Measurement | Boundary | p50 ms | p95 ms | p99 ms | max ms | n | Real / simulated |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Device-only telemetry / status read | Raw TCP connect to mock (**approximate**: not the full vendor-protocol round trip) | 0.2 | `_` | 1.5 | 1.5 | 20 | simulated |

| Derived | Formula | Value |
| --- | --- | --- |
| MDK overhead (read p99) | telemetry read p99 − device-only p99 | 494.5 ms |
| MDK overhead (action exec p99) | action submit p99 − device-only p99 (**approximate** — submit and exec aren't measured separately, see Write / action path) | 193.9 ms |

## Cycle headroom (devices per Worker signal)

| Metric | Value | Unit |
| --- | --- | --- |
| Configured telemetry interval | 10000 | ms |
| Full collection cycle time (worst Worker, all owned devices) | 758.0 | ms (avg / max: 758.0 / 920.5) |
| Cycle headroom ratio | 0.076 | cycle_time / interval |
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
| Sustained telemetry reads / s | 874.3 | 1/s |
| Sustained actions / s | 884.2 | 1/s |
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
| Telemetry read (single device) | Gateway → Kernel → Worker → Gateway | 298.4 | 395.1 | 878.4 | 878.4 | 50 | 0 |
| Telemetry read (single device) | Client → Kernel → Worker (bypasses Gateway) | 300.1 | 448.2 | 496.0 | 918.7 | 3050 | 0 |
| Telemetry / overview read (aggregate) | Gateway (+ fleet-summary plugin) → Kernel → Workers | 611.5 | 977.8 | 3566.8 | 3566.8 | 50 | 0 |
| Device list / registry read | Client → Kernel (bypasses Gateway) | 1.0 | 1.8 | 4.9 | 4.9 | 50 | 0 |

### Write / action path

| Operation | Boundary | p50 ms | p95 ms | p99 ms | max ms | n | errors |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Send / submit action | Client → Gateway → Kernel accept | 3.5 | 17.8 | 46.4 | 46.4 | 50 | 0 |
| Action execution (Kernel dispatch → Worker → device ack) | Client → Kernel → Worker → device ack | 77.3 | 159.2 | 195.4 | 212.2 | 2687 | 0 |
| End-to-end write action (submit → executed / terminal state) | Client → … → device → client-visible result | 77.3 | 159.2 | 195.4 | 212.2 | 2687 | 0 |

| Action type | reqVotes | e2e p50 ms | e2e p99 ms | exec-only p50 ms | exec-only p99 ms | n |
| --- | --- | --- | --- | --- | --- | --- |
| setPowerMode | `_` (whitelisted per-worker in each package's own boot.js — not read back here) | 77.3 | 195.4 | 77.3 | 195.4 | 2687 |

### Alerts path

Real condition, not injected: every device's temperature-warning threshold is forced below any real reading, so the devices's own alert trips on the first snap the Worker collects. Both rows below are n samples of one-per-device "time since this checklist started watching until the alert first appeared" — bounded below by the poll interval, and by the Worker's own snap interval above (`10000` ms): n = 0
| Operation | Boundary | p50 ms | p95 ms | p99 ms | max ms | n | errors |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Alert visible via Kernel (pull / list / query) | Consumer → Kernel → alert source | 137.0 | 138.0 | 1266.0 | 1266.0 | 1000 | 0 |
| Alert visible via Gateway (HTTP / WebSocket / plugin) | Consumer → Gateway → Kernel / store | 4461.0 | 4557.0 | 4565.0 | 4565.0 | 50 | 0 |

Active alert names this run: chips_temp_critical (1000).

## Pass / fail thresholds

| Criterion | Green | Amber | Red | Profile result |
| --- | --- | --- | --- | --- |
| Telemetry freshness (cycle ≤ interval) | headroom < 0.7 | 0.7–1 | ≥ 1 | 0.076 (**green**) |
| Action e2e p99 | ≤ 2000 ms | n/a — binary criterion, no amber band | above green | 195.4 ms (**green**) |
| Steady-state CPU (busiest process) | ≤ 80% | n/a — binary criterion, no amber band | above green | 40.0% (**green**) |
| Rejected + timed-out under sustained load | 0 | < 1.0% of attempted | otherwise | 0 / 7217 attempted, 0.00% (**green**) |
| RSS slope over 24 h soak | flat (≤ 18000 MiB/h) | red demoted to amber when soak < 24h (indicative) | clear leak (soak ≥ 24h) | -7475.128 MiB/h (**green**) |

**Overall: GREEN**

## Failure behaviour

Worker restart and Kernel restart are real kill+respawn drills against the same on-disk store/root (both processes' identity persists across a restart). Every restart time counts from the kill, and READY is reported separately from the first device read that succeeds again. The unreachable-device drill kills the mocks process: every device behind a worker shares one mock server, so this can only make the **whole fleet** unreachable at once. A killed mocks process refuses the connection immediately (ECONNREFUSED), so failed reads are fast. The drill then reads one device until a read fails (a failed live `snap` read counts) and until every channel fails (the other channels serve cached values until the miner's 5s device-data cache expires).

| Scenario | Metric | Value | Notes |
| --- | --- | --- | --- |
| Worker restart | Time to healthy / owning devices again | 4948 ms | bench-worker-0, 1000 devices, recovered=true |
| Worker restart | Time to device reads served again | 7205 ms | from the kill; restored=true |
| Kernel restart | Time to READY | 7871 ms | recovered=true |
| Kernel restart | Time to device reads served again | 8361 ms | from the kill; restored=true |
| Unreachable device | Time until a read fails (measured) | 22 ms | from the kill; first failure `ERR_BENCH_SNAP_FAILED`, failed read took 6.4 ms (fast refusal); baseline read 211.5 ms |
| Unreachable device | Time until every channel fails (measured) | 4630 ms | from the kill; cached channels return the last values until then |
| Unreachable device | Time to reads served again after the mocks return | 325 ms | recovered=true |
| Unreachable device | Effect on cycle time (analytical, hung-device worst case) | 20000 ms | timeout (10000 ms) × ⌈1000 devices / 500 concurrency⌉ |
| Unreachable device | Timeout budget per device | 10000 ms | `thing.miner.timeout` (`MINER_DEVICE_TIMEOUT_MS` in lib/constants.js) — the real per-device RPC timeout; not `collectSnapTimeoutMs`, which only bounds periodic snap collection |
| 24 h soak | RSS slope (MiB / h) per process | mocks: 1503.5642 MiB/h, kernel: 7475.1282 MiB/h, gateway: -160.8647 MiB/h, worker-0: 3462.0228 MiB/h | leak detection — **indicative**, soak below 24h |
| 24 h soak | FD / socket slope (per hour) per process | mocks: 0.0000 /h, kernel: 26.3019 /h, gateway: 105.2078 /h, worker-0: 105.2047 /h | sampled via `lsof -p <pid>` at start/stop only (more expensive than `ps`) — **indicative**, soak below 24h |
