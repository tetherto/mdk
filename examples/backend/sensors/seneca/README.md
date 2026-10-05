# MDK Seneca sensor example

A small, self-contained **Seneca** temperature-sensor example you can clone and run with **no real
hardware**. It starts a mock Seneca sensor, brings up a Kernel, registers the sensor as a thing, and
stays running. It prints a ready-to-paste `hp-rpc-cli` command for pulling the sensor's live
telemetry over HRPC.

Self-contained: everything for this example lives in this folder — no shared example helpers. It's
the temperature-sensor counterpart of
[`examples/backend/minerpools/ocean`](../../minerpools/ocean/README.md) and
[`examples/backend/miners/antminer`](../../miners/antminer/README.md).

## What it demonstrates

- Bringing up a Kernel and one Seneca Worker in a single process.
- Starting a **mock** Seneca sensor (Modbus TCP) and **registering** it as a thing.
- Pulling live temperature telemetry through the Kernel over the MDK Protocol — no hardware.

## Prerequisites

- **Node.js >= 24**
- Worker dependencies installed (from the repo root):

```bash
npm install   # backend/workers packages (including temperature-seneca + its mock) are root workspace members
```

## Quickstart

```bash
node examples/backend/sensors/seneca/index.js     # from the repo root
# or: cd examples/backend/sensors/seneca && npm start
```

You'll see the registered device id and `Press Ctrl+C to stop`. To customise the port, serial or
Modbus register, edit the constants at the top of [`index.js`](./index.js).

## Inspect over HRPC with `hp-rpc-cli`

[`index.js`](./index.js) prints the Kernel key, device ID, and a ready-to-paste telemetry command. The shared
[`hp-rpc-cli` inspection guide](../../inspect-over-hrpc.md) covers Worker listing, telemetry pulls,
other actions, and troubleshooting.

## How it works

[`index.js`](./index.js):

1. Starts the mock Seneca sensor ([`backend/workers/temperature/seneca/mock/server.js`](../../../../backend/workers/temperature/seneca/mock/server.js)).
2. Brings up a Kernel (HRPC only) pinned to its own store root (`$TMPDIR/mdk-site-seneca/kernel/`).
3. `startSenecaWorker({ workerId, storeDir, seedDevices })`, then `kernel.registerWorker(worker.runtime.getPublicKey())`.
4. Prints an `hp-rpc-cli` command and stays running until `Ctrl+C`, which tears down the Worker and
   Kernel (the mock exits with the process).

## Directory layout

### Committed (source)

```text
examples/backend/sensors/seneca/
├── README.md
├── index.js                      # Kernel + Seneca Worker + mock + registration
└── .gitignore
```

### Generated (ignored)

```text
$TMPDIR/mdk-site-seneca/kernel/      # Kernel Corestore
```

## Troubleshooting

| Issue | Fix |
|---|---|
| `Cannot find module ...` | Run `npm install` from the repo root. |
| `EADDRINUSE :::5050` | A previous run is still bound. `Ctrl+C` it, or change `PORT` in `index.js`. |
| `Corruption: ... MANIFEST-*` | Stale store from a `kill -9`. Delete `$TMPDIR/mdk-site-seneca/` and retry. |

## Related

| Path | Purpose |
|---|---|
| [`backend/workers/temperature/seneca`](../../../../backend/workers/temperature/seneca/README.md) | Seneca `SENECA` manager, mock server, `mdk-contract.json`. |
