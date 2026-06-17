# MDK Schneider Power Meter Example

A small, self-contained **Schneider PM5340** power-meter example you can clone and run with **no real
hardware**. It starts a mock Schneider meter, brings up an ORK, registers the meter as a thing, and
stays running. It prints a ready-to-paste `hp-rpc-cli` command for pulling the meter's live telemetry
over HRPC.

Self-contained: everything for this example lives in this folder — no shared example helpers. It's
the Schneider counterpart of [`examples/backend/miners/antminer`](../../miners/antminer/README.md).

## What it demonstrates

- Bringing up an ORK and one Schneider power-meter worker in a single process.
- Starting a **mock** Schneider meter (Modbus TCP) and **registering** it as a thing.
- Pulling live telemetry (voltage, current, power) through the ORK over HRPC — no hardware.

## Prerequisites

- **Node.js >= 22**
- Worker dependencies installed (from the repo root):

```bash
npm run setup:workers   # backend/workers packages (includes power-meter-schneider + its mock)
```

## Quickstart

```bash
node examples/backend/powermeters/schneider/index.js     # from the repo root
# or: cd examples/backend/powermeters/schneider && npm start
```

You'll see the registered device id and `Press Ctrl+C to stop`. To customise the port, serial or
model, edit the constants at the top of `index.js` — the worker also exports `SCHNEIDER_P3U30`
(mock `type: 'p3u30'`).

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
# → {"deviceId":"...","metrics":{"stats":{"power_w":...,"tension_v":...,"powermeter_specific":{"instantaneous_values":{...}}}},...}
```

`action` also accepts `device.capabilities`, `state.pull` and `command.request` (see the worker's
`mdk-contract.json` for the available commands and telemetry query types).

## How it works

`index.js`:

1. Starts the mock Schneider meter (`backend/workers/power-meter/schneider/mock/server`).
2. Brings up an ORK (HRPC only) pinned to its own store root (`$TMPDIR/mdk-site-schneider/ork/`).
3. `startWorker(SCHNEIDER_PM5340, { ork })` and `manager.registerThing({ info, opts })`.
4. Prints an `hp-rpc-cli` command and stays running until `Ctrl+C`, which tears down the worker and
   ORK (the mock exits with the process).

## Directory layout

### Committed (source)

```
examples/backend/powermeters/schneider/
├── README.md
├── package.json
├── index.js                      # ORK + Schneider worker + mock + registration
└── .gitignore
```

### Generated (ignored)

```
$TMPDIR/mdk-site-schneider/ork/    # ORK Corestore
```

## Troubleshooting

| Issue | Fix |
|---|---|
| `Cannot find module ...` | Run `npm run setup:workers` from the repo root. |
| `hp-rpc-cli: command not found` | Install the Hyperswarm RPC CLI, or use the key/envelope from the printed line with your own HRPC client. |
| `EADDRINUSE :::5062` | A previous run is still bound. `Ctrl+C` it, or change `PORT` in `index.js`. |
| `Corruption: ... MANIFEST-*` | Stale store from a `kill -9`. Delete `$TMPDIR/mdk-site-schneider/` and retry. |

## Related

| Path | Purpose |
|---|---|
| [`backend/workers/power-meter/schneider`](../../../../backend/workers/power-meter/schneider/README.md) | Schneider `SCHNEIDER_PM5340` / `SCHNEIDER_P3U30` managers, mock server, `mdk-contract.json`. |
| [`examples/backend/powermeters/mdk.client.powermeter.js`](../mdk.client.powermeter.js) | The minimal single-file power-meter example (ABB B23). |
