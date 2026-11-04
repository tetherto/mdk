---
title: Benchmark harness
description: Real Kernel, Gateway, and Worker processes under real load, filling in the capacity and metrics template from measured runs
docs@tether_slug: guides/deployment/benchmark-your-site/readme
---

# Benchmark harness

The benchmark harness fills in the [capacity and metrics template](../../../docs/guides/deployment/capacity-metrics-template.md)
from measured runs. Every run uses the same process topology a real MDK deployment runs under PM2 — mocks, Kernel,
Gateway, and each Worker as their own OS process (never blended into one Node process).

## Overview

The benchmark harness boots real Kernel, Gateway, Worker, and mock-device processes (one mock
TCP/HTTP listener per **Worker** — every device that Worker owns shares it, real network round trips, not
in-memory fakes; any [Worker family][workers-miners-readme] can be mixed into a single run).

The harness:

- Drives read/action/Gateway-request loads
- Samples CPU/RSS/open-FDs per process
- Runs real failure drills (Worker restart, Kernel restart, a fleet-wide unreachable-device outage)
- Writes a filled profile (JSON + Markdown) per run plus a comparison matrix across a sweep.

The generated Markdown mirrors the template's own section headings and table shapes exactly — real measurements
where this harness has them, `_` (the template's own placeholder) everywhere it doesn't; see [What's measured vs. left blank](#whats-measured-vs-left-blank) for which is which.

A single JSON config is the source of truth for the fleet to boot; see [Layout](#layout) for what each file does
and [The config file](#the-config-file) for what it controls.

## When to use this

- You want a real sizing answer for your own hardware and device count, not published numbers from a different tier
- You need to confirm a configuration change still meets the pass/fail thresholds in
  [`capacity-metrics-template.md`](../../../docs/guides/deployment/capacity-metrics-template.md) before it reaches
  production
- You want failure-drill numbers (Worker restart, Kernel restart, a fleet-wide device outage) measured on your own
  hardware, not assumed from another run

## Quickstart

Run `npm install` once from the repository root, which installs this package as a workspace, then work from this
directory. `./setup-config.sh` copies [`config/benchmark.config.json.example`][benchmark-config-example] to
`config/benchmark.config.json`, the file every command here reads, so run it before the first test or benchmark:

```bash
cd backend/tests/benchmark
./setup-config.sh

# fast correctness check (5 devices, ~seconds) — wired into `npm test`
npm test

# the same suite with coverage — CI enforces >= 80% (lines, statements,
# functions, branches) on this package
npm run test:coverage

# the one benchmark run: boots every family in config.workers
# simultaneously and sweeps the Cartesian product of every family's own
# device-count range, lowest total device count first, stopping at the
# first combination that goes red (the fleet's breaking point — see
# capacity-metrics-template.md "Pass / fail thresholds")
npm run benchmark
```

Every combination step writes `results/<profileId>.json` and `.md`, named by that step's total device count and Worker
  count (e.g. `cap-150devices-2workers` for 150 Avalons across 2 Workers).

The filename encodes only those two numbers, not the per-family split, so two combinations that reach the same
total device count and Worker count collide: the later one's report overwrites the earlier one's. The run
as a whole additionally writes one combined `results/sweep-benchmark-matrix.md` (generated under gitignored `results/` —
not committed) across every combination tried. Commit the specific reports you want to keep alongside a sizing decision,
not the whole directory.

The harness never adds a run number to a filename. Repeat runs of the same profile, such as
`cap-100devices-1workers-r1` and `-r2` in [`published/`][benchmark-published], were renamed by hand with an `-r<n>` suffix
after each run, so a later run of the same profile would not overwrite the earlier one. Do the same before re-running a
profile whose reports you want to keep.

## The config file

[`config/benchmark.config.json`][benchmark-config-example] (copy from the linked `.example`) is the only file
you edit to change what gets measured:

| Section    | Feeds                                                                                                           |
| ---------- | --------------------------------------------------------------------------------------------------------------- |
| `hardware` | The template's "Reference hardware" block. Fill this in manually per host: the harness can't detect vendor/tier |
| `workers`  | One entry per device family, all booted simultaneously and swept together                                       |

Each `workers` entry is `{ type, model, simulateMocks, ceiling: { startDeviceCount, stepDeviceCount, maxDeviceCount } }`,
for example, the one entry in [`config/benchmark.config.json.example`][benchmark-config-example]:

```json
{
  "type": "mdk-worker-avalon",
  "model": "a1346",
  "simulateMocks": true,
  "ceiling": { "startDeviceCount": 10, "stepDeviceCount": 10, "maxDeviceCount": 10 }
}
```

As shipped, that range is a single 10-device step. Raise `maxDeviceCount` (for example to `30` for steps of 10, 20, and 30
devices) to sweep further.

Note that `type` must be one of `Object.keys(WORKER_REGISTRY)` in [`lib/constants.js`][benchmark-constants] (one entry per
package under [`backend/workers/miners/`][workers-miners-readme]), and `model` one of that `type`'s
supported models.

`ceiling.startDeviceCount` and `stepDeviceCount` must each be `>= 1`.

`maxDeviceCount` caps how far that entry's dimension of the sweep goes, and both other fields must additionally fall
within `[1, maxDeviceCount]`, unless there's only one entry in `workers`, in which case `maxDeviceCount` may be `0`
(uncapped: keep raising the device count until a step actually goes red). With more than one entry, every `maxDeviceCount`
must be a real number, since the sweep is the Cartesian product of every entry's range and an unbounded dimension can't
be combined into a finite product. All of this is validated eagerly when the config loads.

### Fixed operating defaults

Everything that isn't about sizing a run:

- Host/discovery/data root
- Kernel cadence
- Worker operating intervals/timeouts/concurrency (`WORKER_CONF_DEFAULTS`)
- `allowDuplicateIPs`
- Mock port/auth password
- Gateway rate limit (off for the harness) and the Gateway alert-poll sample size
- Alert-induction thresholds
- Failure-drill toggles
- Run-reproducibility shape (`n`, soak duration, resource-sample interval, read/action load)
- Pass/fail thresholds (headroom, action submit p99, steady CPU, rejects+timeouts, RSS slope)

all this lives in [`lib/constants.js`][benchmark-constants].

Workers do **not** boot on their package defaults. `bootWorker` in [`lib/site.js`][benchmark-site-lib] passes
`WORKER_CONF_DEFAULTS` from [`lib/constants.js`][benchmark-constants] as the Worker's `conf.thing`, which runs every Worker
faster than a production Worker so a short run still completes enough snap cycles to measure:

| Setting                 | Harness | Worker default |
| ----------------------- | ------- | -------------- |
| `collectSnapsItvMs`     | 10 s    | 60 s           |
| `thingQueryConcurrency` | 100     | 25             |
| `collectSnapTimeoutMs`  | 2 s     | 120 s          |
| `storeSnapItvMs`        | 20 s    | 300 s          |

The 60× shorter snap timeout changes which device reads are abandoned, and the 15× faster snap store raises the growth/day
in a report's Storage breakdown. `WORKER_CONF_DEFAULTS` also sets the log rotation, log cache refresh, and stats intervals,
and the log keep count. On top of it, `bootWorker` sets the per-device timeout `thing.miner.timeout` to 10 s and applies
`ALERT_INDUCTION`'s alert threshold override. Read every report's latency, CPU, headroom, and storage numbers as measured
at these settings, not at a default Worker's. `allowDuplicateIPs` is always on (every mock lives on `127.0.0.1`,
one server per Worker; its devices share it, differentiated only by port). Mock ports are picked randomly per run
(one per Worker, not per device), each Worker's password is read from its Worker type's own mock default, and
`RUN_REPRODUCIBILITY`/`THRESHOLDS` are recorded verbatim into every report.

The harness Gateway runs with its rate limit off (`GATEWAY_DEFAULTS.rateLimit`). The Gateway's default, 300 requests per
minute per client IP, limits one client, and the harness is a single loopback client driving deliberate load, so with the
limiter on it would measure the limiter rather than the Gateway. A production Gateway keeps its default.

### Device reachability and error payloads

A Worker answers a request for a device it holds offline (one whose `connect()` failed at boot) with a normal response
carrying `ERR_DEVICE_UNAVAILABLE`, not a rejected call. Two checks keep that from passing as a fast, successful round trip:

- Before measuring anything, every profile pulls metrics from every device and stops with `ERR_BENCH_DEVICES_UNREACHABLE`
  if any device fails
- Every timed call goes through `assertTelemetry` or `assertCommand` in [`lib/load.js`][benchmark-load-lib], so an
  error payload, a `FAILED` command result, a failed `snap` channel, or a metrics response where every channel failed
  counts as an error

`snap` is checked on its own because it is the only channel that always reads the device live, and it reports a failed
read as `{ success: false }` rather than `{ error }`. The other channels read through the miner's 5 s device-data cache
(`fetchDeviceData` in `backend/core/mdk/lib/things/miner.js`), so for up to 5 s after a device stops answering they
still return its last values.

### Run a real leak-detection soak

`RUN_REPRODUCIBILITY.soakMs` defaults to a short 60s so sweeps and CI stay fast.

The template requires **≥ 24h** of soak before an RSS slope means anything as a real growth or leak signal rather
than noise. To get that signal, bump `soakMs` to 24h or more in [`lib/constants.js`][benchmark-constants] and run
a single profile, not a full sweep: a sweep repeats the soak once per combination it tries, so a 24h soak across
a whole sweep would take days. Any run shorter than 24h still produces an RSS slope, but reports label it
**indicative** rather than a confirmed signal.

The two runs are held to different bars in `THRESHOLDS` ([`lib/constants.js`][benchmark-constants]). A run of 24h or more
fails when RSS grows faster than `rssSlopeLeakMiBPerHour` (10 MiB/h, about 240 MiB a day per process), the leak bar. A shorter run is held only
to `rssSlopeFlatMiBPerHour` (18000 MiB/h), which is calibrated to the in-flight load state a short run still accumulates.
It isn't a leak bar, and anything above it reads amber, never red. Tune `rssSlopeLeakMiBPerHour` from a soak of a known-good build.

## What's measured vs. left blank

Measured automatically:

- **Read path**: single-device telemetry both through the Gateway
  (`GET /api/fleet/device/{id}/telemetry`, a route of the harness's own
  app) and bypassing it (Client → Kernel → Worker directly); the aggregate
  fleet-wide read (Gateway → app runtime → Kernel → every Worker, through the harness's
  own generic [`plugin/fleet-summary`][benchmark-fleet-summary-plugin] app); device list/registry read.
  Every Gateway route takes one extra HRPC hop, Gateway → app runtime, that the
  direct Client path does not.
- **Write/action path**: submit through the Gateway
  (`POST /api/fleet/device/{id}/action`, another route of that app) and the direct Client → Kernel path — both real HTTP/RPC round
  trips, not simulated. Both stop the clock when the Kernel accepts the command
  (`status: 'QUEUED'`): nothing has reached the device at that point. Execution and
  end-to-end rows stay blank; see "Action-approval workflow steps" under Left blank.
- **Cycle headroom** (worst Worker) and **sustained read/action throughput**
  (reads/s, actions/s, rejected, timed-out, peak queue depth).
- **Per-process CPU/RSS** (sampled every tick via `ps -o rss,pcpu -p <pid>`)
  and **open file descriptors** (sampled at profile start and end via
  `lsof -p <pid>` — more expensive than `ps`, so not sampled every tick),
  each with a real slope across the run (`ResourceSampler` in
  [`lib/metrics.js`][benchmark-metrics-lib]) — **indicative** below a 24h soak, same as everywhere
  else growth/leak claims show up in this harness. The app runtime runs inside the
  `gateway` role's process, so the Gateway's samples include the app.
- An **approximate** device-only baseline (raw TCP connect to the mock's
  port — a floor, not the full vendor-protocol round trip).
- **Alerts path**: every device's temperature-warning threshold is forced
  below any real reading (see `ALERT_INDUCTION` in [`lib/constants.js`][benchmark-constants]), so
  the family's own alert genuinely trips on the first snap the Worker
  collects at the harness's snap cadence (`WORKER_CONF_DEFAULTS.collectSnapsItvMs`, 10 s). The harness measures how
  long after it starts watching that alert first becomes visible both via
  the Kernel directly (`pollAlerts` in [`lib/load.js`][benchmark-load-lib]) and via the Gateway
  (`pollAlertsViaGateway`, hitting `GET /api/fleet/device/{id}/alerts` — a
  third route of the harness's app, since the Gateway has no other way to
  surface `last.alerts`). The Gateway side polls an evenly spread sample of up to
  `GATEWAY_DEFAULTS.alertSampleSize` devices, not the whole fleet. `n = 0` on either just means the Worker's
  snap interval (10 s in the harness) didn't complete a cycle within this run's
  soak, not that induction failed.
- **Storage breakdown**: real on-disk size per Worker store, plus a real
  growth/day computed from size at profile start vs. now, divided by the
  run's own elapsed time (same short-soak "indicative" caveat).
- **Failure behaviour** (`runFailureDrills` in [`processes/run-process.js`][benchmark-run-process],
  toggled by `RUN_REPRODUCIBILITY.runFailureDrills`, on by default): real
  kill+respawn drills for Worker restart and Kernel restart (both
  processes' identity persists across a restart against the same on-disk
  root, confirmed empirically, so the existing client reconnects on its
  own), plus a device-outage drill. Both restart drills report two times from the kill: until
  the restarted process is READY and until a real device read succeeds again, since READY
  does not mean reads are being served yet. The outage drill can only make the
  **whole fleet** unreachable, not one device — every device behind a
  Worker shares one mock server. After killing the mocks it reads one device until a read
  fails and until every channel fails (the cached channels keep serving the last values
  until the cache expires), then restarts the mocks and times how long reads take to
  succeed again. It also reports an analytical hung-device worst case
  (`timeout × ⌈device count / concurrency⌉`) from already-known operating
  parameters, since a closed port is refused immediately rather than timing out.
  Runs once, after the steady-state checklist finishes, never
  during (so it can't contaminate the capacity numbers above).

Left blank, with a note in the generated report:

- **Action-approval workflow steps**: the full push → vote → execute workflow as distinct submit/approve/exec/e2e
  rows, vote/approve as its own step, and batch actions across N devices in one call. The Avalon Worker this harness
  drives allowlists every write action at a single required vote (its `plugin/boot.js` declares the pairs); the
  Antspace and Bitdeer container Workers allowlist 2-vote actions (`resetCoolingSystem` and
  `setLiquidSupplyTemperature`; `setTemperatureSettings`) whose real approval round this harness never exercises —
  it only ever submits via `sendCommand`
  and its Gateway-mirrored route, never the Kernel's separate `pushAction`/`voteAction`/`queryActions` pipeline
- **Alert generation latency in isolation**: synchronous inside the Worker process, the same reason heap/external
  memory is blank, needs in-process instrumentation this harness doesn't have
- **Alert fan-out to N subscribers and historical alert queries**: need Gateway capabilities, a push/subscription
  mechanism and a history store, beyond a single request/response endpoint
- **Kernel-internal scheduled telemetry pull and health ping**: no client-observable start/end signal distinct
  from the reads already measured

## Layout

```text
config/benchmark.config.json   the one input file
lib/constants.js               Worker-type registry + fixed defaults (never edited to size a run) +
                                 ALERT_INDUCTION (per-family threshold used to trip a real alert) +
                                 RUN_REPRODUCIBILITY.runFailureDrills/*TimeoutMs
lib/site.js                    boot primitives (bootKernel/bootWorker/bootGateway/startMocks) — one
                                 mock server per Worker, bootWorker wires ALERT_INDUCTION in, and
                                 bootGateway starts the fleet-summary app runtime before the Gateway;
                                 RBAC: per-root service accounts (bench-harness, mdk-gateway, app:fleet)
                                 bound to one full-access role, applied by bootKernel
lib/metrics.js                 per-process CPU/RSS sampler (ps -o rss,pcpu -p <pid>, every tick) +
                                 open-FD sampler (lsof -p <pid>, start/stop only) + dirSizeBytes
lib/latency.js                 per-operation latency recorder (p50/p95/p99/max/n/errors)
lib/load.js                    read/action load generators, cycle headroom, device baseline,
                                 pollAlerts/pollAlertsViaGateway (alert-visibility latency pollers)
lib/report.js                  pass/fail evaluation + Markdown/JSON report + comparison matrix
lib/sweep-runner.js            spawns one child process per profile, folds results into entries
plugin/fleet-summary/          app (mdk-app.yaml + mdk-plugin.json) every profile run mounts at `/`, run in an
                                 app runtime inside the gateway role's process: fleet-wide aggregate
                                 (listWorkers→pullTelemetry) plus per-device telemetry/action/alerts
                                 routes (controllers/device-telemetry.js, device-action.js, device-alerts.js)
processes/run-process.js       --role mocks|kernel|worker|gateway|profile (defaults to profile);
                                profile spawns the other four roles as child processes, coordinates
                                the checklist, then (unless disabled) runs runFailureDrills
scenarios/benchmark.js         sweeps the Cartesian product of every config.workers entry's device range, writes one comparison matrix
tests/benchmark.smoke.test.js  fast correctness check (not a capacity claim; skips failure drills for speed)
tests/*.test.js                unit tests for lib/, the checklist and the sweep (fake client + Gateway, no real stack)
results/                       generated reports (gitignored)
```

## Add a device family

[`lib/constants.js`][benchmark-constants]'s `WORKER_REGISTRY` covers every package under
[`backend/workers/miners/`][workers-miners-readme] (Avalon) — any of them can be
used in `config.workers[].type`. To benchmark a family outside that
directory (container, power meter, ...), add an entry to the registry's
`WORKER_PACKAGES` map pointing at the target package's `start<Type>Worker`
export; everything else (config, load generators, metrics, reporting) is
device-family agnostic because it only talks to the family through
`createMdkClient`.

## Next steps

- Fill in the [capacity and metrics template](../../../docs/guides/deployment/capacity-metrics-template.md) by hand for a topology this harness doesn't cover yet
- Run [a multi-Worker site](../../../docs/guides/deployment/run-all-workers-site.md) to reproduce a profile's topology before benchmarking it

## Links

[benchmark-config-example]: ./config/benchmark.config.json.example
<!-- docs@tether.io: benchmark-config-example → https://github.com/tetherto/mdk/blob/main/backend/tests/benchmark/config/benchmark.config.json.example -->

[benchmark-constants]: ./lib/constants.js
<!-- docs@tether.io: benchmark-constants → https://github.com/tetherto/mdk/blob/main/backend/tests/benchmark/lib/constants.js -->

[benchmark-published]: ./published/
<!-- docs@tether.io: benchmark-published → https://github.com/tetherto/mdk/tree/main/backend/tests/benchmark/published -->

[benchmark-site-lib]: ./lib/site.js
<!-- docs@tether.io: benchmark-site-lib → https://github.com/tetherto/mdk/blob/main/backend/tests/benchmark/lib/site.js -->

[benchmark-fleet-summary-plugin]: ./plugin/fleet-summary/
<!-- docs@tether.io: benchmark-fleet-summary-plugin → https://github.com/tetherto/mdk/tree/main/backend/tests/benchmark/plugin/fleet-summary -->

[benchmark-metrics-lib]: ./lib/metrics.js
<!-- docs@tether.io: benchmark-metrics-lib → https://github.com/tetherto/mdk/blob/main/backend/tests/benchmark/lib/metrics.js -->

[benchmark-load-lib]: ./lib/load.js
<!-- docs@tether.io: benchmark-load-lib → https://github.com/tetherto/mdk/blob/main/backend/tests/benchmark/lib/load.js -->

[benchmark-run-process]: ./processes/run-process.js
<!-- docs@tether.io: benchmark-run-process → https://github.com/tetherto/mdk/blob/main/backend/tests/benchmark/processes/run-process.js -->

[workers-miners-readme]: ../../workers/miners/README.md
<!-- docs@tether.io: workers-miners-readme → https://github.com/tetherto/mdk/blob/main/backend/workers/miners/README.md -->
