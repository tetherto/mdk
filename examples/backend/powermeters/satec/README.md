# MDK Satec Power Meter Example

A small, self-contained **Satec PM180** power-meter example you can clone and run with **no real
hardware**. It starts a mock Satec meter, brings up an Kernel, registers the meter as a thing, and stays
running. It prints a ready-to-paste `hp-rpc-cli` command for pulling the meter's live telemetry over
HRPC.

Self-contained: everything for this example lives in this folder — no shared example helpers. It's
the Satec counterpart of [`examples/backend/miners/antminer`](../../miners/antminer/README.md).

## What it demonstrates

- Bringing up an Kernel and one Satec power-meter Worker in a single process.
- Starting a **mock** Satec meter (Modbus TCP) and **registering** it as a thing.
- Pulling live telemetry (voltage, current, power) through the Kernel over HRPC — no hardware.

## Prerequisites

- **Node.js >= 22**
- Worker dependencies installed (from the repo root):

```bash
npm run setup:workers   # backend/workers packages (includes power-meter-satec + its mock)
```

## Quickstart

```bash
node examples/backend/powermeters/satec/index.js     # from the repo root
# or: cd examples/backend/powermeters/satec && npm start
```

You'll see the registered device id and `Press Ctrl+C to stop`. To customise the port or serial, edit
the constants at the top of `index.js`.

## Inspect over HRPC with `hp-rpc-cli`

`index.js` prints the Kernel key, device ID, and a ready-to-paste telemetry command. The shared
[`hp-rpc-cli` inspection guide](../../inspect-over-hrpc.md) covers Worker listing, telemetry pulls,
other actions, and troubleshooting.

## How it works

`index.js`:

1. Starts the mock Satec meter (`backend/workers/power-meter/satec/mock/server`).
2. Brings up an Kernel (HRPC only) pinned to its own store root (`$TMPDIR/mdk-site-satec/kernel/`).
3. `startWorker(SATEC, { kernel })` and `manager.registerThing({ info, opts })`.
4. Prints an `hp-rpc-cli` command and stays running until `Ctrl+C`, which tears down the Worker and
   Kernel (the mock exits with the process).

## Directory layout

### Committed (source)

```
examples/backend/powermeters/satec/
├── README.md
├── package.json
├── index.js                      # Kernel + Satec Worker + mock + registration
└── .gitignore
```

### Generated (ignored)

```
$TMPDIR/mdk-site-satec/kernel/        # Kernel Corestore
```

## Troubleshooting

| Issue | Fix |
|---|---|
| `Cannot find module ...` | Run `npm run setup:workers` from the repo root. |
| `EADDRINUSE :::5061` | A previous run is still bound. `Ctrl+C` it, or change `PORT` in `index.js`. |
| `Corruption: ... MANIFEST-*` | Stale store from a `kill -9`. Delete `$TMPDIR/mdk-site-satec/` and retry. |

## Related

| Path | Purpose |
|---|---|
| [`backend/workers/power-meter/satec`](../../../../backend/workers/power-meter/satec/README.md) | Satec `SATEC` manager, mock server, `mdk-contract.json`. |
| [`examples/backend/powermeters/mdk.client.powermeter.js`](../mdk.client.powermeter.js) | The minimal single-file power-meter example (ABB B23). |
