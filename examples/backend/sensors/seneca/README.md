# MDK Seneca Sensor Example

A small, self-contained **Seneca** temperature-sensor example you can clone and run with **no real
hardware**. It starts a mock Seneca sensor, brings up an Kernel, registers the sensor as a thing, and
stays running. It prints a ready-to-paste `hp-rpc-cli` command for pulling the sensor's live
telemetry over HRPC.

Self-contained: everything for this example lives in this folder — no shared example helpers. It's
the temperature-sensor counterpart of
[`examples/backend/minerpools/ocean`](../../minerpools/ocean/README.md) and
[`examples/backend/miners/antminer`](../../miners/antminer/README.md).

## What it demonstrates

- Bringing up an Kernel and one Seneca Worker in a single process.
- Starting a **mock** Seneca sensor (Modbus TCP) and **registering** it as a thing.
- Pulling live temperature telemetry through the Kernel over the MDK Protocol — no hardware.

## Prerequisites

- **Node.js >= 24**
- Worker dependencies installed (from the repo root):

```bash
npm run setup:workers   # backend/workers packages (includes temperature-seneca + its mock)
```

## Quickstart

```bash
node examples/backend/sensors/seneca/index.js     # from the repo root
# or: cd examples/backend/sensors/seneca && npm start
```

You'll see the registered device id and `Press Ctrl+C to stop`. To customise the port, serial or
Modbus register, edit the constants at the top of `index.js`.

## Inspect over HRPC with `hp-rpc-cli`

`index.js` prints the Kernel key, device ID, and a ready-to-paste telemetry command. The shared
[`hp-rpc-cli` inspection guide](../../inspect-over-hrpc.md) covers Worker listing, telemetry pulls,
other actions, and troubleshooting.

## How it works

`index.js`:

1. Starts the mock Seneca sensor (`backend/workers/temperature/seneca/mock/server`).
2. Brings up an Kernel (HRPC only) pinned to its own store root (`$TMPDIR/mdk-site-seneca/kernel/`).
3. `startWorker(SENECA, { kernel })` and `manager.registerThing({ info, opts })`.
4. Prints an `hp-rpc-cli` command and stays running until `Ctrl+C`, which tears down the Worker and
   Kernel (the mock exits with the process).

## Directory layout

### Committed (source)

```
examples/backend/sensors/seneca/
├── README.md
├── package.json
├── index.js                      # Kernel + Seneca Worker + mock + registration
└── .gitignore
```

### Generated (ignored)

```
$TMPDIR/mdk-site-seneca/kernel/      # Kernel Corestore
```

## Troubleshooting

| Issue | Fix |
|---|---|
| `Cannot find module ...` | Run `npm run setup:workers` from the repo root. |
| `EADDRINUSE :::5050` | A previous run is still bound. `Ctrl+C` it, or change `PORT` in `index.js`. |
| `Corruption: ... MANIFEST-*` | Stale store from a `kill -9`. Delete `$TMPDIR/mdk-site-seneca/` and retry. |

## Related

| Path | Purpose |
|---|---|
| [`backend/workers/temperature/seneca`](../../../../backend/workers/temperature/seneca/README.md) | Seneca `SENECA` manager, mock server, `mdk-contract.json`. |
| [`examples/backend/sensors/mdk.client.sensor.js`](../mdk.client.sensor.js) | The minimal single-file version of this example. |
