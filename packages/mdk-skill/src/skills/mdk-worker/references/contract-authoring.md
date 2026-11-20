# Authoring `mdk-contract.json`

Load this when writing or reviewing a Worker contract. The machine-checkable
shape is [`mdk-contract.schema.json`](../../../../../../backend/core/mdk-worker/mdk-contract.schema.json) (bundled beside this file as
`references/mdk-contract.schema.json`); validate with
[`../scripts/validate-contract.mjs`](../scripts/validate-contract.mjs); this file covers the semantics the schema
can't express. Real contracts to imitate:
[`packages/cli/templates/worker/mdk-contract.json`](../../../../../cli/templates/worker/mdk-contract.json) (minimal scaffold / skill
template), [`backend/workers/miners/avalon/mdk-contract.json`](../../../../../../backend/workers/miners/avalon/mdk-contract.json)
(full-featured, with commands),
[`backend/workers/temperature/seneca/plugin/mdk-contract.json`](../../../../../../backend/workers/temperature/seneca/plugin/mdk-contract.json) (read-only
sensor; older `plugin/` layout).

The contract is dual-purpose: the Kernel validates commands against it, and AI
operator agents read it as context. Every prose field you write is
simultaneously documentation and agent instructions.

## `contractVersion`

Stamp `"contractVersion": "1"` at the top level. A stamped contract is held to
the full v1 requirements as errors — canonical units on numeric telemetry,
`min`/`max` on number params. Without the stamp the contract validates as
legacy: the same gaps are reported as warnings only.

## `metadata`

All five fields required:

```json
"metadata": {
  "provider": "microbt",            // vendor slug, lowercase
  "deviceFamily": "miner",          // miner | power-meter | sensor | container | minerpool
  "brand": "Whatsminer",            // human-readable
  "modelsSupported": ["M53S", "M56S"],
  "overview": "…"                   // what the worker controls + critical environmental constraints
}
```

`overview` is the agent's first impression — state what the device is, which
protocol the Worker wraps, and any site-level caution (e.g. hydro miners must
not run without coolant flow).

## `capabilities.telemetry`

One entry per channel:

```json
{ "name": "temperature", "unit": "°C", "type": "number",
  "handler": "src/telemetry/temperature.js",
  "description": "Hash board temperature. If 0, device is booting." }
```

- `name` is the wire name — consumers pull it via
  `telemetry.pull { query: { type: 'metrics' } }` (all channels) or
  `{ query: { type: 'temperature' } }` (just this one). `Snake_case` by
  convention (`hashrate_rt`, `power_mode`).
- `type` is one of `number | string | boolean | array | object` and is what
  the handler must return (the smoke harness asserts this).
- Channels that take params (e.g. a `history` channel with `{ limit }`)
  document them in `description` — extra `query` fields are passed to the
  handler as `params`.
- `unit` whenever numeric, from the schema's closed vocabulary: `TH/s`, `W`,
  `kW`, `J/TH`, `°C`, `%`, `rpm`, `V`, `A`, `Hz`, `s`, `count` (extended by PR
  to the schema). Dimensionless counters declare `count`.
- `description` must carry semantic boundaries an agent can reason over:
  sentinel values, staleness, validity ranges.
- `path` (optional) is a dotted keypath (`minerData.hashrate`, `boards.0.temp`)
  into the handler's return value. Entries that share a `handler` are served by
  one call per sweep; each takes its own value by `path`. Without `path` the
  return value is the metric.

## Telemetry polling (optional)

Root-level keys turn on the runtime's telemetry collector, which sweeps every
device on an interval, stores the results, and answers fleet reads
(`snapshot`, `aggregate`) with no device call:

```json
{
  "telemetryPollIntervalMs": 60000,
  "aggregateCacheTtlMs": 60000,
  "telemetryRetention": { "rawMs": 86400000, "rollupIntervalMs": 300000, "keepMs": 2592000000 }
}
```

- `telemetryPollIntervalMs` is the vendor default the device tolerates; an
  operator overrides it per instance in `mdk.yaml` `spec.workers[].config`
  (`null` turns polling off). Without it the Worker never polls or stores.
- `telemetryRetention` bounds the store: `rawMs` and `rollupIntervalMs` must
  not exceed `keepMs` (`ERR_CONTRACT_RETENTION_INVALID`). The defaults shown
  apply when omitted.
- `aggregateCacheTtlMs` is how long an identical `aggregate` query is answered
  from memory while no sweep stores a point. It is floored at one poll
  interval, which is also the default.
- `telemetryArchive: true` appends each rolled bucket to NDJSON day files
  before its raw points are deleted, and publishes the `restoreTelemetry`
  command. Default `false`.
- Every metric is readable live through `metrics` regardless.

## `capabilities.commands`

```json
{ "name": "setPowerPct",
  "description": "Set power percentage.",
  "constraints": "Do not call more than once per 5 minutes.",
  "handler": "src/commands/set-power-pct.js",
  "params": [ { "name": "pct", "type": "number", "min": 0, "max": 200 } ] }
```

- `name` is camelCase by convention (`reboot`, `setPowerMode`, `setupPools`).
- **Bounds rule:** every `number` param declares `min` and `max` — a schema
  requirement under `contractVersion` `"1"`. A `default`, when declared, must
  sit inside `[min, max]`. The Kernel's
  dispatcher rejects out-of-range values with `ERR_PARAM_RANGE` *only for
  declared bounds*
  ([`backend/core/kernel/lib/modules/command-dispatcher/index.js`](../../../../../../backend/core/kernel/lib/modules/command-dispatcher/index.js)); nothing
  else protects the hardware from `setLiquidSupplyTemperature(9000)`. The
  bundled validator treats a missing bound as an error.
- `constraints` is a strict semantic limit in prose — rate limits, approval
  requirements ("Requires two approvals."), ordering rules. Agents obey it;
  reviewers check it.
- `examples` (optional) — `{ intent, steps[] }` workflows teaching an agent
  the optimal use of a non-obvious command.
- Params arrive at your handler as a named object (`params.pct`). Positional
  legacy payloads (`{ value }` / `{ args: [] }`) are normalized onto declared
  names by the runtime — another reason to declare params accurately.
- Read-only devices: `"commands": []` (see the ABB / Seneca contracts).

## `capabilities.health`

```json
"health": {
  "supportedStates": ["OK", "OFFLINE"],
  "alerts": ["overheat", "fan_failure"],
  "troubleshooting": ["If temperature > 85 for 5m, reduce power mode before rebooting."]
}
```

`supportedStates` is required. `alerts` and `troubleshooting` are optional but
production contracts declare them — `troubleshooting` is an if-then
remediation list for agents.

## `capabilities.errors`

Every `ERR_*` code your handlers or device client can throw, mapped to a
human/AI-readable explanation:

```json
"errors": {
  "ERR_BAD_POWER_MODE": "The firmware rejected the requested power mode.",
  "ERR_DEVICE_CALL_FAILED": "The device API call failed or returned an error."
}
```

Errors thrown by handlers travel verbatim in `command.result`/telemetry
payloads — keeping this map complete is what makes them actionable downstream.

## What does NOT go in the contract

- **No device list.** Devices are supplied at runtime
  (`WorkerRuntime opts.devices`); the schema rejects a top-level `devices` key.
- **No secrets** (credentials live in per-device `config`).
- **No handler implementation detail** — `handler` paths are stripped before
  the contract leaves the process.

## Validation

```bash
node ../scripts/validate-contract.mjs <worker>/mdk-contract.json
```

Checks schema conformance, handler file existence (relative to the contract's
directory), duplicate telemetry/command names, and the numeric-bounds rule.
Exit 0 = clean. Pass `--schema-only` to skip the semantic checks and test shape
alone. The bundled schema is a verbatim copy of the runtime's
[`backend/core/mdk-worker/mdk-contract.schema.json`](../../../../../../backend/core/mdk-worker/mdk-contract.schema.json); the repo-wide catalogue
([`backend/workers/scripts/generate-catalogue.js`](../../../../../../backend/workers/scripts/generate-catalogue.js)) lints shipped
contracts against that same file.
