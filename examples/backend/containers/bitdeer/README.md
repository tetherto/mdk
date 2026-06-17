# MDK Bitdeer Container Example

A small, self-contained **Bitdeer D40** container example you can clone and run with **no real
hardware**. It brings up an ORK and one Bitdeer worker, points a mock MQTT device at the worker's
broker, and registers the container as a thing. It prints a ready-to-paste `hp-rpc-cli` command for
pulling the container's live telemetry over HRPC.

Self-contained: everything for this example lives in this folder. It's the Bitdeer counterpart of
[`examples/backend/containers/microbt`](../microbt/README.md) and
[`examples/backend/miners/antminer`](../../miners/antminer/README.md).

## What it demonstrates

- Bringing up an ORK and one Bitdeer D40 (M56) container worker in a single process.
- The Bitdeer **MQTT** model: the worker hosts an embedded broker; a **mock** MQTT client publishes
  container telemetry to it.
- Registering the container by `containerId` and pulling live telemetry over the MDK Protocol — no hardware.

## How Bitdeer differs from the other examples

Bitdeer communicates over **MQTT**, not HTTP/Modbus:

- The **worker embeds the MQTT broker** (`mqtt_m0`, on `DEFAULT_MQTT_PORT` = 10883). So the worker is
  started **first**, and the mock connects to the broker it exposes.
- The **mock is an MQTT client** — it connects to the broker and publishes canned container status on
  a 5s cycle (so telemetry takes a few seconds to populate).
- Registration keys on **`containerId`** (matching the mock's `id`), not `address`/`port`.

> The Bitdeer mock resolves its canned payloads relative to `process.cwd()`, so `index.js` switches
> cwd to the worker package directory before starting it (all other paths are absolute).

## Prerequisites

- **Node.js >= 22**
- Worker dependencies installed (from the repo root):

```bash
npm run setup:workers   # backend/workers packages (includes container-bitdeer + its mock)
```

## Quickstart

```bash
node examples/backend/containers/bitdeer/index.js     # from the repo root
# or: cd examples/backend/containers/bitdeer && npm start
```

You'll see the registered device id and `Press Ctrl+C to stop`. To customise the container id, serial
or model, edit the constants at the top of `index.js` (e.g. set `TYPE = 'd40_s19xp'` and import
`BD_D40_S19XP`).

## Inspect over HRPC with `hp-rpc-cli`

`index.js` prints the ORK's HRPC key, the device id, and a ready-to-paste `hp-rpc-cli` command. In a
second terminal you can query the running ORK directly over HRPC — every request targets the MDK
protocol's single `mdk` method and carries an envelope whose `action` selects the operation.

List the workers the ORK has discovered:

```bash
hp-rpc-cli -s <ORK_HRPC_KEY> -m mdk -d '{"id":"1","version":"0.1.0","type":"request","action":"worker.list","sender":"cli","timestamp":1700000000000,"payload":{}}'
```

Pull live telemetry for the container (this is the line `index.js` prints, with the real key/device filled in):

```bash
hp-rpc-cli -s <ORK_HRPC_KEY> -m mdk -d '{"id":"2","version":"0.1.0","type":"request","action":"telemetry.pull","sender":"cli","deviceId":"<DEVICE_ID>","timestamp":1700000000000,"payload":{"query":{"type":"metrics"}}}'
# → {"deviceId":"...","metrics":{"stats":{"status":"running","power_w":7480100,"ambient_temp_c":28.8,...}},...}
```

The mock publishes on a 5s cycle, so give telemetry a few seconds to populate. `action` also accepts
`device.capabilities`, `state.pull` and `command.request` (see the worker's `mdk-contract.json`).

## Directory layout

### Committed (source)

```
examples/backend/containers/bitdeer/
├── README.md
├── package.json
├── index.js                      # ORK + Bitdeer worker + MQTT mock + registration
└── .gitignore
```

### Generated (ignored)

```
$TMPDIR/mdk-site-bitdeer/ork/     # ORK Corestore
```

## Troubleshooting

| Issue | Fix |
|---|---|
| `Cannot find module ...` | Run `npm run setup:workers` from the repo root. |
| `hp-rpc-cli: command not found` | Install the Hyperswarm RPC CLI, or use the key/envelope from the printed line with your own HRPC client. |
| `EADDRINUSE :::10883` | A previous run's MQTT broker is still bound. `Ctrl+C` it, or free the port. |
| Telemetry all `n/a` | Give it a few seconds — the mock publishes on a 5s cycle. |
| `Corruption: ... MANIFEST-*` | Stale store from a `kill -9`. Delete `$TMPDIR/mdk-site-bitdeer/` and retry. |

## Related

| Path | Purpose |
|---|---|
| [`backend/workers/containers/bitdeer`](../../../../backend/workers/containers/bitdeer/README.md) | Bitdeer D40 managers, MQTT mock, `mdk-contract.json`. |
| [`examples/backend/containers/mdk.client.container.js`](../mdk.client.container.js) | The minimal single-file container example (Antspace HK3). |
