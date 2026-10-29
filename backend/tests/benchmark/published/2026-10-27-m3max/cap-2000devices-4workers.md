# Capacity profile: cap-2000devices-4workers

Sweep: representative · Mode: multi-process · Generated: 2026-10-27T12:02:38.789Z

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
| mdk-worker-avalon (a1346) | 500 | 10 | simulated |
| mdk-worker-avalon (a1346) | 500 | 10 | simulated |
| mdk-worker-avalon (a1346) | 500 | 10 | simulated |
| mdk-worker-avalon (a1346) | 500 | 10 | simulated |

### Run reproducibility

| Field | Value |
| --- | --- |
| Profile id | cap-2000devices-4workers |
| `n` (samples per latency row) | 1000 (minimum recommended: 100) |
| Soak duration | 60000 ms (**indicative** — below the 24h minimum for growth/leak claims) |
| Read load definition | 1000 concurrent telemetry reads for 3000 ms |
| Action load definition | 1000/s setPowerMode submits for 3000 ms |
| Start time (UTC) | 2026-10-27T11:59:50.221Z |
| End time (UTC) | 2026-10-27T12:02:38.789Z |

## Resource metrics template

Sampled per OS process by pid (`ps -o rss,pcpu`) at 250 ms intervals — real per-process numbers, not one blended figure, but no heap/external breakdown (that needs in-process instrumentation this harness doesn't have).

### Per process

#### mocks

| Metric | Unit | Warm (after READY) | Steady (end of soak) | Peak | Notes |
| --- | --- | --- | --- | --- | --- |
| CPU average | % of 1 core | `_` | 32.9 | `_` | sampled cross-process via `ps -o pcpu` |
| CPU peak | % | `_` | `_` | 86.2 | |
| RSS | MiB | 212.7 | 264.4 | 264.4 | sampled cross-process via `ps -o rss` |

#### kernel

| Metric | Unit | Warm (after READY) | Steady (end of soak) | Peak | Notes |
| --- | --- | --- | --- | --- | --- |
| CPU average | % of 1 core | `_` | 32.4 | `_` | sampled cross-process via `ps -o pcpu` |
| CPU peak | % | `_` | `_` | 129.9 | |
| RSS | MiB | 169.1 | 440.4 | 440.4 | sampled cross-process via `ps -o rss` |

#### gateway

| Metric | Unit | Warm (after READY) | Steady (end of soak) | Peak | Notes |
| --- | --- | --- | --- | --- | --- |
| CPU average | % of 1 core | `_` | 5.8 | `_` | sampled cross-process via `ps -o pcpu` |
| CPU peak | % | `_` | `_` | 39.6 | |
| RSS | MiB | 139.5 | 101.4 | 315.7 | sampled cross-process via `ps -o rss` |

#### mdk-worker-avalon (a1346)

| Metric | Unit | Warm (after READY) | Steady (end of soak) | Peak | Notes |
| --- | --- | --- | --- | --- | --- |
| CPU average | % of 1 core | `_` | 20.9 | `_` | sampled cross-process via `ps -o pcpu` |
| CPU peak | % | `_` | `_` | 76.9 | |
| RSS | MiB | 298.3 | 458.8 | 533.8 | sampled cross-process via `ps -o rss` |

#### mdk-worker-avalon (a1346)

| Metric | Unit | Warm (after READY) | Steady (end of soak) | Peak | Notes |
| --- | --- | --- | --- | --- | --- |
| CPU average | % of 1 core | `_` | 20.8 | `_` | sampled cross-process via `ps -o pcpu` |
| CPU peak | % | `_` | `_` | 87.6 | |
| RSS | MiB | 307.0 | 435.4 | 541.2 | sampled cross-process via `ps -o rss` |

#### mdk-worker-avalon (a1346)

| Metric | Unit | Warm (after READY) | Steady (end of soak) | Peak | Notes |
| --- | --- | --- | --- | --- | --- |
| CPU average | % of 1 core | `_` | 20.9 | `_` | sampled cross-process via `ps -o pcpu` |
| CPU peak | % | `_` | `_` | 88.5 | |
| RSS | MiB | 310.5 | 445.2 | 546.3 | sampled cross-process via `ps -o rss` |

#### mdk-worker-avalon (a1346)

| Metric | Unit | Warm (after READY) | Steady (end of soak) | Peak | Notes |
| --- | --- | --- | --- | --- | --- |
| CPU average | % of 1 core | `_` | 20.8 | `_` | sampled cross-process via `ps -o pcpu` |
| CPU peak | % | `_` | `_` | 96.4 | |
| RSS | MiB | 305.4 | 458.0 | 545.8 | sampled cross-process via `ps -o rss` |

### Site aggregate

| Metric | Unit | Value |
| --- | --- | --- |
| Sum of process RSS | MiB | 2326 |
| Host CPU (all MDK processes) | % | 154.4 |

### Storage breakdown

Growth/day is a real delta (size at profile start vs. now), divided by this run's own elapsed time (0.05 h) — the same short-soak caveat as the RSS slope applies (see Run reproducibility): a soak below the 24h minimum makes this **indicative**, not a committed growth rate. Projections are linear extrapolations of that rate.

| Store | Size now (MiB) | Growth / day (MiB) | Projected 6 mo (GiB) | Projected 12 mo (GiB) |
| --- | --- | --- | --- | --- |
| mdk-worker-avalon (a1346) | 27.9 | 6509.5216 (**indicative**) | 1144.2791 | 2288.5309 |
| mdk-worker-avalon (a1346) | 43.2 | 15738.9855 (**indicative**) | 2766.6607 | 5533.2792 |
| mdk-worker-avalon (a1346) | 38.2 | 13207.1397 (**indicative**) | 2321.6048 | 4643.1723 |
| mdk-worker-avalon (a1346) | 48.3 | 18310.5143 (**indicative**) | 3218.6923 | 6437.3374 |
| **Total** | 157.5 | 53766.1611 (**indicative**) | 9451.2368 | 18902.3198 |

### Zero-device baseline and per-device marginal cost

Baseline: Kernel + Gateway + one idle Worker per configured type/model (0
owned devices each), booted and sampled the same way as the real run,
concurrently with it. `mocks` is excluded from both sides — see note below.

| Metric | Zero-device baseline | At 2000 devices | Per-device marginal | Unit |
| --- | --- | --- | --- | --- |
| CPU (site, all MDK processes) | 0.9 | 121.5 | 0.0603 | % of 1 core |
| RSS (site, all MDK processes) | 537 | 2073 | 0.7680 | MiB |

## Device baseline (MDK overhead)

| Measurement | Boundary | p50 ms | p95 ms | p99 ms | max ms | n | Real / simulated |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Device-only telemetry / status read | Raw TCP connect to mock (**approximate**: not the full vendor-protocol round trip) | 0.2 | `_` | 11.7 | 11.7 | 20 | simulated |

| Derived | Formula | Value |
| --- | --- | --- |
| MDK overhead (read p99) | telemetry read p99 − device-only p99 | 568.1 ms |
| MDK overhead (action exec p99) | action submit p99 − device-only p99 (**approximate** — submit and exec aren't measured separately, see Write / action path) | 135.0 ms |

## Cycle headroom (devices per Worker signal)

| Metric | Value | Unit |
| --- | --- | --- |
| Configured telemetry interval | 10000 | ms |
| Full collection cycle time (worst Worker, all owned devices) | 624.4 | ms (avg / max: 624.4 / 744.3) |
| Cycle headroom ratio | 0.062 | cycle_time / interval |
| Devices owned by this Worker | 500 | count |
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
| Sustained telemetry reads / s | 1766.2 | 1/s |
| Sustained actions / s | 862.7 | 1/s |
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
| Telemetry read (single device) | Gateway → Kernel → Worker → Gateway | 245.7 | 438.6 | 1609.8 | 1609.8 | 50 | 0 |
| Telemetry read (single device) | Client → Kernel → Worker (bypasses Gateway) | 299.6 | 523.0 | 579.7 | 1503.9 | 6050 | 0 |
| Telemetry / overview read (aggregate) | Gateway (+ fleet-summary plugin) → Kernel → Workers | 958.7 | 2572.5 | 5085.8 | 5085.8 | 50 | 0 |
| Device list / registry read | Client → Kernel (bypasses Gateway) | 3.1 | 7.5 | 8.9 | 8.9 | 50 | 0 |

### Write / action path

| Operation | Boundary | p50 ms | p95 ms | p99 ms | max ms | n | errors |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Send / submit action | Client → Gateway → Kernel accept | 3.4 | 41.2 | 59.9 | 59.9 | 50 | 0 |
| Action execution (Kernel dispatch → Worker → device ack) | Client → Kernel → Worker → device ack | 58.7 | 114.5 | 146.7 | 162.6 | 2633 | 0 |
| End-to-end write action (submit → executed / terminal state) | Client → … → device → client-visible result | 58.7 | 114.5 | 146.7 | 162.6 | 2633 | 0 |

| Action type | reqVotes | e2e p50 ms | e2e p99 ms | exec-only p50 ms | exec-only p99 ms | n |
| --- | --- | --- | --- | --- | --- | --- |
| setPowerMode | `_` (whitelisted per-worker in each package's own boot.js — not read back here) | 58.7 | 146.7 | 58.7 | 146.7 | 2633 |

### Alerts path

Real condition, not injected: every device's temperature-warning threshold is forced below any real reading, so the devices's own alert trips on the first snap the Worker collects. Both rows below are n samples of one-per-device "time since this checklist started watching until the alert first appeared" — bounded below by the poll interval, and by the Worker's own snap interval above (`10000` ms): n = 0
| Operation | Boundary | p50 ms | p95 ms | p99 ms | max ms | n | errors |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Alert visible via Kernel (pull / list / query) | Consumer → Kernel → alert source | 164.0 | 275.0 | 275.0 | 275.0 | 2000 | 0 |
| Alert visible via Gateway (HTTP / WebSocket / plugin) | Consumer → Gateway → Kernel / store | 4315.0 | 4444.0 | 4452.0 | 4452.0 | 50 | 0 |

Active alert names this run: chips_temp_critical (2000).

## Pass / fail thresholds

| Criterion | Green | Amber | Red | Profile result |
| --- | --- | --- | --- | --- |
| Telemetry freshness (cycle ≤ interval) | headroom < 0.7 | 0.7–1 | ≥ 1 | 0.062 (**green**) |
| Action e2e p99 | ≤ 2000 ms | n/a — binary criterion, no amber band | above green | 146.7 ms (**green**) |
| Steady-state CPU (busiest process) | ≤ 80% | n/a — binary criterion, no amber band | above green | 32.9% (**green**) |
| Rejected + timed-out under sustained load | 0 | < 1.0% of attempted | otherwise | 0 / 10798 attempted, 0.00% (**green**) |
| RSS slope over 24 h soak | flat (≤ 18000 MiB/h) | red demoted to amber when soak < 24h (indicative) | clear leak (soak ≥ 24h) | -5783.616 MiB/h (**green**) |

**Overall: GREEN**

## Failure behaviour

Worker restart and Kernel restart are real kill+respawn drills against the same on-disk store/root (both processes' identity persists across a restart). Every restart time counts from the kill, and READY is reported separately from the first device read that succeeds again. The unreachable-device drill kills the mocks process: every device behind a worker shares one mock server, so this can only make the **whole fleet** unreachable at once. A killed mocks process refuses the connection immediately (ECONNREFUSED), so failed reads are fast. The drill then reads one device until a read fails (a failed live `snap` read counts) and until every channel fails (the other channels serve cached values until the miner's 5s device-data cache expires).

| Scenario | Metric | Value | Notes |
| --- | --- | --- | --- |
| Worker restart | Time to healthy / owning devices again | 4843 ms | bench-worker-0, 500 devices, recovered=true |
| Worker restart | Time to device reads served again | 6145 ms | from the kill; restored=true |
| Kernel restart | Time to READY | 8545 ms | recovered=true |
| Kernel restart | Time to device reads served again | 8918 ms | from the kill; restored=true |
| Unreachable device | Time until a read fails (measured) | 16 ms | from the kill; first failure `ERR_BENCH_SNAP_FAILED`, failed read took 2.3 ms (fast refusal); baseline read 215.7 ms |
| Unreachable device | Time until every channel fails (measured) | 4611 ms | from the kill; cached channels return the last values until then |
| Unreachable device | Time to reads served again after the mocks return | 318 ms | recovered=true |
| Unreachable device | Effect on cycle time (analytical, hung-device worst case) | 40000 ms | timeout (10000 ms) × ⌈2000 devices / 500 concurrency⌉ |
| Unreachable device | Timeout budget per device | 10000 ms | `thing.miner.timeout` (`MINER_DEVICE_TIMEOUT_MS` in lib/constants.js) — the real per-device RPC timeout; not `collectSnapTimeoutMs`, which only bounds periodic snap collection |
| 24 h soak | RSS slope (MiB / h) per process | mocks: 1102.3598 MiB/h, kernel: 5783.6163 MiB/h, gateway: -811.4359 MiB/h, worker-0: 3056.5992 MiB/h, worker-1: 3058.5853 MiB/h, worker-2: 2700.4068 MiB/h, worker-3: 2723.9593 MiB/h | leak detection — **indicative**, soak below 24h |
| 24 h soak | FD / socket slope (per hour) per process | mocks: 1534.4451 /h, kernel: 21.3081 /h, gateway: 85.2338 /h, worker-0: 42.6162 /h, worker-1: 42.6169 /h, worker-2: 42.6177 /h, worker-3: 42.6184 /h | sampled via `lsof -p <pid>` at start/stop only (more expensive than `ps`) — **indicative**, soak below 24h |
