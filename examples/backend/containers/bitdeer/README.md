# MDK Bitdeer container example

A small, self-contained **Bitdeer D40** container example you can clone and run with **no real
hardware**. It brings up a Kernel and one Bitdeer Worker, points a mock MQTT device at the Worker's
broker, and registers the container as a thing. It prints a ready-to-paste `hp-rpc-cli` command for
pulling the container's live telemetry over HRPC.

Self-contained: everything for this example lives in this folder. It's the Bitdeer counterpart of
[`examples/backend/miners/antminer`](../../miners/antminer/README.md).

## What it demonstrates

- Bringing up a Kernel and one Bitdeer D40 (M56) container Worker in a single process.
- The Bitdeer **MQTT** model: the Worker hosts an embedded broker; a **mock** MQTT client publishes
  container telemetry to it.
- Registering the container by `containerId` and pulling live telemetry over the MDK Protocol — no hardware.

## How Bitdeer differs from the other examples

Bitdeer communicates over **MQTT**, not HTTP/Modbus:

- The **Worker embeds the MQTT broker** (`mqtt_m0`, on `DEFAULT_MQTT_PORT` = 10883). The Worker is therefore
  started **first**, and the mock connects to the broker it exposes.
- The **mock is an MQTT client** — it connects to the broker and publishes canned container status on
  a five-second cycle (so telemetry takes a few seconds to populate).
- Registration keys on **`containerId`** (matching the mock device's `id`), not `address`/`port`.

> The Bitdeer mock resolves its canned payloads relative to `process.cwd()`, so [`index.js`](./index.js) switches
> the working directory to the Worker package directory before starting it (all other paths are absolute).

## Prerequisites

- **Node.js >= 22**
- Worker dependencies installed (from the repo root):

```bash
npm install   # backend/workers packages (including container-bitdeer + its mock) are root workspace members
```

## Quickstart

```bash
node examples/backend/containers/bitdeer/index.js     # from the repo root
# or: cd examples/backend/containers/bitdeer && npm start
```

You'll see the registered device id and `Press Ctrl+C to stop`. To customise the container id, serial
or model, edit the constants at the top of [`index.js`](./index.js) (e.g. set `TYPE = 'd40_s19xp'` and import
`BD_D40_S19XP`).

## Inspect over HRPC with `hp-rpc-cli`

[`index.js`](./index.js) prints the Kernel key, device ID, and a ready-to-paste telemetry command. The shared
[`hp-rpc-cli` inspection guide](../../inspect-over-hrpc.md) covers Worker listing, telemetry pulls,
other actions, and troubleshooting. The mock publishes every five seconds, so give telemetry a few seconds
to populate before pulling it.

## Directory layout

### Committed (source)

```text
examples/backend/containers/bitdeer/
├── README.md
└── index.js                      # Kernel + Bitdeer Worker + MQTT mock + registration
```

### Generated (ignored)

```text
$TMPDIR/mdk-site-bitdeer/kernel/     # Kernel Corestore
```

## Troubleshooting

| Issue | Fix |
|---|---|
| `Cannot find module ...` | Run `npm install` from the repo root. |
| `EADDRINUSE :::10883` | A previous run's MQTT broker is still bound. `Ctrl+C` it, or free the port. |
| Telemetry all `n/a` | Give it a few seconds — the mock publishes every five seconds. |
| `Corruption: ... MANIFEST-*` | Stale store from a `kill -9`. Delete `$TMPDIR/mdk-site-bitdeer/` and retry. |

## Related

| Path | Purpose |
|---|---|
| [`backend/workers/containers/bitdeer`](../../../../backend/workers/containers/bitdeer/README.md) | Bitdeer D40 managers, MQTT mock, `mdk-contract.json`. |
| [`examples/backend/containers/antspace/index.js`](../antspace/index.js) | The minimal single-file container example (Antspace HK3). |
