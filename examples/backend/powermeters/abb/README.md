# MDK ABB Power Meter Example

A small, self-contained **ABB B23** power-meter example you can clone and run with **no real
hardware**. It starts a mock ABB meter, brings up an ORK, registers the meter as a thing, and stays
running. It prints a ready-to-paste `hp-rpc-cli` command for pulling the meter's live telemetry over
HRPC.

Self-contained: everything for this example lives in this folder — no shared example helpers. It's
the power-meter counterpart of
[`examples/backend/containers/microbt`](../../containers/microbt/README.md) and
[`examples/backend/miners/antminer`](../../miners/antminer/README.md).

## What it demonstrates

- Bringing up an ORK and one ABB power-meter worker in a single process.
- Starting a **mock** ABB meter (Modbus TCP) and **registering** it as a thing.
- Pulling live telemetry (voltage, current, active/reactive power) through the ORK over HRPC — no hardware.

## Prerequisites

- **Node.js >= 22**
- Worker dependencies installed (from the repo root):

```bash
npm run setup:workers   # backend/workers packages (includes power-meter-abb + its mock)
```

## Quickstart

```bash
node examples/backend/powermeters/abb/index.js     # from the repo root
# or: cd examples/backend/powermeters/abb && npm start
```

You'll see the registered device id and `Press Ctrl+C to stop`. To customise the port, serial or
meter model, edit the constants at the top of `index.js` (the `ABB_*` exports cover B23, B24, M1M20,
M4M20 and REU615).

## Inspect over HRPC with `hp-rpc-cli`

`index.js` prints the ORK's HRPC key, the device id, and a ready-to-paste `hp-rpc-cli` command. In a
second terminal you can query the running ORK directly over HRPC — every request targets the MDK
protocol's single `mdk` method and carries an envelope whose `action` selects the operation.

List the workers the ORK has discovered:

```bash
hp-rpc-cli -s <ORK_HRPC_KEY> -m mdk -d '{"id":"1","version":"0.1.0","type":"request","action":"worker.list","sender":"cli","timestamp":1700000000000,"payload":{}}'
```

Pull live telemetry for the meter (this is the line `index.js` prints, with the real key/device filled in):

```bash
hp-rpc-cli -s <ORK_HRPC_KEY> -m mdk -d '{"id":"2","version":"0.1.0","type":"request","action":"telemetry.pull","sender":"cli","deviceId":"<DEVICE_ID>","timestamp":1700000000000,"payload":{"query":{"type":"metrics"}}}'
# → {"deviceId":"...","metrics":{"stats":{"power_w":12.34,"tension_v":123.4,"powermeter_specific":{...}}},...}
```

`action` also accepts `device.capabilities`, `state.pull` and `command.request` (see the worker's
`mdk-contract.json` for the available commands and telemetry query types).

## How it works

`index.js`:

1. Starts the mock ABB meter (`backend/workers/power-meter/abb/mock/server`).
2. Brings up an ORK (HRPC only) pinned to its own store root (`$TMPDIR/mdk-site-abb/ork/`).
3. `startWorker(ABB_B23, { ork })` and `manager.registerThing({ info, opts })`.
4. Prints an `hp-rpc-cli` command and stays running until `Ctrl+C`, which tears down the worker and
   ORK (the mock exits with the process).

## Directory layout

### Committed (source)

```
examples/backend/powermeters/abb/
├── README.md
├── package.json
├── index.js                      # ORK + ABB worker + mock + registration
└── .gitignore
```

### Generated (ignored)

```
$TMPDIR/mdk-site-abb/ork/         # ORK Corestore
```

## Troubleshooting

| Issue | Fix |
|---|---|
| `Cannot find module ...` | Run `npm run setup:workers` from the repo root. |
| `hp-rpc-cli: command not found` | Install the Hyperswarm RPC CLI, or use the key/envelope from the printed line with your own HRPC client. |
| `EADDRINUSE :::5060` | A previous run is still bound. `Ctrl+C` it, or change `PORT` in `index.js`. |
| `Corruption: ... MANIFEST-*` | Stale store from a `kill -9`. Delete `$TMPDIR/mdk-site-abb/` and retry. |

## Related

| Path | Purpose |
|---|---|
| [`backend/workers/power-meter/abb`](../../../../backend/workers/power-meter/abb/README.md) | ABB `ABB_B23` (+B24/M1M20/M4M20/REU615) managers, mock server, `mdk-contract.json`. |
| [`examples/backend/powermeters/mdk.client.powermeter.js`](../mdk.client.powermeter.js) | The minimal single-file version of this example. |
