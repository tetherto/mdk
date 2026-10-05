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

```bash
# fast correctness check (5 devices, ~seconds) — wired into `npm test`
npm test

# the one benchmark run: boots every family in config.workers
# simultaneously and sweeps the Cartesian product of every family's own
# device-count range, lowest total device count first, stopping at the
# first combination that goes red (the fleet's breaking point — see
# capacity-metrics-template.md "Ceiling profiles")
npm run benchmark
```

Every combination step writes `results/<profileId>.json` and `.md`, named by that step's total device count and Worker
  count (e.g. `cap-150devices-2workers` for 100 Antminers + 50 Avalons on 2 Workers).

The filename encodes only those two numbers, not the per-family split, so two combinations that reach the same
total device count and Worker count collide: the later one's report overwrites the earlier one's. The run
as a whole additionally writes one combined `results/sweep-benchmark-matrix.md` (generated under gitignored `results/` —
not committed) across every combination tried. Commit the specific reports you want to keep alongside a sizing decision,
not the whole directory.

## The config file

[`config/benchmark.config.json`][benchmark-config-example] (copy from the linked `.example`) is the only file
you edit to change what gets measured:

| Section    | Feeds                                                                                                           |
| ---------- | --------------------------------------------------------------------------------------------------------------- |
| `hardware` | The template's "Reference hardware" block. Fill this in manually per host: the harness can't detect vendor/tier |
| `workers`  | One entry per device family, all booted simultaneously and swept together                                       |

Each `workers` entry is `{ type, model, simulateMocks, ceiling: { startDeviceCount, stepDeviceCount, maxDeviceCount } }`,
for example, one entry from [`config/benchmark.config.json.example`][benchmark-config-example]:

```json
{
  "type": "mdk-worker-antminer",
  "model": "s21",
  "simulateMocks": true,
  "ceiling": { "startDeviceCount": 10, "stepDeviceCount": 10, "maxDeviceCount": 30 }
}
```

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
- Worker operating intervals/timeouts/concurrency
- `allowDuplicateIPs`
- Mock port/auth password
- Alert-induction thresholds
- Failure-drill toggles
- Run-reproducibility shape (`n`, soak duration, resource-sample interval, read/action load)
- Pass/fail thresholds (headroom, action submit p99, steady CPU, rejects+timeouts, RSS slope)

all this lives in [`lib/constants.js`][benchmark-constants].

Workers always boot on their own package defaults (plus `ALERT_INDUCTION`'s threshold override, the one intentional
exception: see [`lib/site.js`][benchmark-site-lib]). `allowDuplicateIPs` is always on (every mock lives on `127.0.0.1`,
one server per Worker; its devices share it, differentiated only by port). Mock ports are picked randomly per run
(one per Worker, not per device), each Worker's password is read from its Worker type's own mock default, and
`RUN_REPRODUCIBILITY`/`THRESHOLDS` are recorded verbatim into every report.

### Run a real leak-detection soak

`RUN_REPRODUCIBILITY.soakMs` defaults to a short 60s so sweeps and CI stay fast.

The template requires **≥ 24h** of soak before an RSS slope means anything as a real growth or leak signal rather
than noise. To get that signal, bump `soakMs` to 24h or more in [`lib/constants.js`][benchmark-constants] and run
a single profile, not a full sweep: a sweep repeats the soak once per combination it tries, so a 24h soak across
a whole sweep would take days. Any run shorter than 24h still produces an RSS slope, but reports label it
**indicative** rather than a confirmed signal.

## What's measured vs. left blank

Measured automatically:

- **Read path**: single-device telemetry both through the Gateway
  (`GET /api/fleet/device/{id}/telemetry`, a plugin route this harness
  adds) and bypassing it (Client → Kernel → Worker directly); the aggregate
  fleet-wide read (Gateway → Kernel → every Worker, through the harness's
  own generic [`plugin/fleet-summary`][benchmark-fleet-summary-plugin] plugin); device list/registry read.
- **Write/action path**: submit through the Gateway
  (`POST /api/fleet/device/{id}/action`, another plugin route this harness
  adds) and the direct Client → Kernel path — both real HTTP/RPC round
  trips, not simulated. Submit and execute collapse into one measured step;
  see "Action-approval workflow steps" under Left blank for why.
- **Cycle headroom** (worst Worker) and **sustained read/action throughput**
  (reads/s, actions/s, rejected, timed-out, peak queue depth).
- **Per-process CPU/RSS** (sampled every tick via `ps -o rss,pcpu -p <pid>`)
  and **open file descriptors** (sampled at profile start and end via
  `lsof -p <pid>` — more expensive than `ps`, so not sampled every tick),
  each with a real slope across the run (`ResourceSampler` in
  [`lib/metrics.js`][benchmark-metrics-lib]) — **indicative** below a 24h soak, same as everywhere
  else growth/leak claims show up in this harness.
- An **approximate** device-only baseline (raw TCP connect to the mock's
  port — a floor, not the full vendor-protocol round trip).
- **Alerts path**: every device's temperature-warning threshold is forced
  below any real reading (see `ALERT_INDUCTION` in [`lib/constants.js`][benchmark-constants]), so
  the family's own alert genuinely trips on the first snap the Worker
  collects at its own (never-overridden) cadence. The harness measures how
  long after it starts watching that alert first becomes visible both via
  the Kernel directly (`pollAlerts` in [`lib/load.js`][benchmark-load-lib]) and via the Gateway
  (`pollAlertsViaGateway`, hitting `GET /api/fleet/device/{id}/alerts` — a
  third plugin route this harness adds, since the Gateway had no way to
  surface `last.alerts` before) — `n = 0` on either just means the Worker's
  own snap interval (default 60s) didn't complete a cycle within this run's
  soak, not that induction failed.
- **Storage breakdown**: real on-disk size per Worker store, plus a real
  growth/day computed from size at profile start vs. now, divided by the
  run's own elapsed time (same short-soak "indicative" caveat).
- **Failure behaviour** (`runFailureDrills` in [`processes/run-process.js`][benchmark-run-process],
  toggled by `RUN_REPRODUCIBILITY.runFailureDrills`, on by default): real
  kill+respawn drills for Worker restart and Kernel restart (both
  processes' identity persists across a restart against the same on-disk
  root, confirmed empirically, so the existing client reconnects on its
  own), plus a device-outage drill. The outage drill can only make the
  **whole fleet** unreachable, not one device — every device behind a
  Worker shares one mock server — so it reports both the measured
  (fast-refusal, since a closed port is refused immediately rather than
  timing out) and an analytical hung-device worst case
  (`timeout × ⌈device count / concurrency⌉`) from already-known operating
  parameters. Runs once, after the steady-state checklist finishes, never
  during (so it can't contaminate the capacity numbers above).

Left blank, with a note in the generated report:

- **Action-approval workflow steps**: the full push → vote → execute workflow as distinct submit/approve/exec/e2e
  rows, vote/approve as its own step, and batch actions across N devices in one call. All three shipped Workers
  allowlist their write actions at a single required vote, and this harness only ever submits via `sendCommand`
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
                                 RUN_REPRODUCIBILITY.runFailureDrills/*TimeoutMs/deviceOutageMs
lib/site.js                    boot primitives (bootKernel/bootWorker/bootGateway/startMocks) — one
                                 mock server per Worker, and bootWorker wires ALERT_INDUCTION in
lib/metrics.js                 per-process CPU/RSS sampler (ps -o rss,pcpu -p <pid>, every tick) +
                                 open-FD sampler (lsof -p <pid>, start/stop only) + dirSizeBytes
lib/latency.js                 per-operation latency recorder (p50/p95/p99/max/n/errors)
lib/load.js                    read/action load generators, cycle headroom, device baseline,
                                 pollAlerts/pollAlertsViaGateway (alert-visibility latency pollers)
lib/report.js                  pass/fail evaluation + Markdown/JSON report + comparison matrix
lib/sweep-runner.js            spawns one child process per profile, folds results into entries
plugin/fleet-summary/          Gateway plugin every profile run loads: fleet-wide aggregate
                                 (listWorkers→pullTelemetry) plus per-device telemetry/action/alerts
                                 routes (controllers/device-telemetry.js, device-action.js, device-alerts.js)
processes/run-process.js       --role mocks|kernel|worker|gateway|profile (defaults to profile);
                                profile spawns the other four roles as child processes, coordinates
                                the checklist, then (unless disabled) runs runFailureDrills
scenarios/benchmark.js         sweeps the Cartesian product of every config.workers entry's device range, writes one comparison matrix
tests/benchmark.smoke.test.js  fast correctness check (not a capacity claim; skips failure drills for speed)
results/                       generated reports (gitignored)
```

## Add a device family

[`lib/constants.js`][benchmark-constants]'s `WORKER_REGISTRY` covers every package under
[`backend/workers/miners/`][workers-miners-readme] (Antminer, Avalon) — any of them can be
used in `config.workers[].type`. To benchmark a family outside that
directory (container, power meter, ...), add an entry to the registry's
`WORKER_PACKAGES` map pointing at the target package's `start<Type>Worker`
export; everything else (config, load generators, metrics, reporting) is
device-family agnostic because it only talks to the family through
`createMdkClient`.

## Next steps

- Fill in the [capacity and metrics template](../../../docs/guides/deployment/capacity-metrics-template.md) by hand for a topology this harness doesn't cover yet
- Run [a multi-Worker site](../../../docs/guides/deployment/run-all-workers-site.md) or [a single-process site](../../../docs/guides/deployment/run-single-process-site.md) to reproduce a profile's topology before benchmarking it

## Links

[benchmark-config-example]: ./config/benchmark.config.json.example
<!-- docs@tether.io: benchmark-config-example → https://github.com/tetherto/mdk/blob/main/backend/tests/benchmark/config/benchmark.config.json.example -->

[benchmark-constants]: ./lib/constants.js
<!-- docs@tether.io: benchmark-constants → https://github.com/tetherto/mdk/blob/main/backend/tests/benchmark/lib/constants.js -->

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
