# MDK ABB power meter example

A small, self-contained **ABB B23** power-meter example you can clone and run with **no real
hardware**. It starts a mock ABB meter, brings up a Kernel, registers the meter as a thing, and stays
running. It prints a ready-to-paste `hp-rpc-cli` command for pulling the meter's live telemetry over
HRPC.

Self-contained: everything for this example lives in this folder — no shared example helpers. It's
the power-meter counterpart of
[`examples/backend/containers/bitdeer`](../../containers/bitdeer/README.md) and
[`examples/backend/miners/antminer`](../../miners/antminer/README.md).

## What it demonstrates

- Bringing up a Kernel and one ABB power-meter Worker in a single process.
- Starting a **mock** ABB meter (Modbus TCP) and **registering** it as a thing.
- Pulling live telemetry (voltage, current, active/reactive power) through the Kernel over HRPC — no hardware.

## Prerequisites

- **Node.js >= 22**
- Worker dependencies installed (from the repo root):

```bash
npm install   # backend/workers packages (including power-meter-abb + its mock) are root workspace members
```

## Quickstart

```bash
node examples/backend/powermeters/abb/index.js     # from the repo root
# or: cd examples/backend/powermeters/abb && npm start
```

You'll see the registered device id and `Press Ctrl+C to stop`. To customise the port, serial or
meter model, edit the constants at the top of [`index.js`](./index.js) (the `ABB_*` exports cover B23, B24, M1M20,
M4M20 and REU615).

## Inspect over HRPC with `hp-rpc-cli`

[`index.js`](./index.js) prints the Kernel key, device ID, and a ready-to-paste telemetry command. The shared
[`hp-rpc-cli` inspection guide](../../inspect-over-hrpc.md) covers Worker listing, telemetry pulls,
other actions, and troubleshooting.

## How it works

[`index.js`](./index.js):

1. Starts the mock ABB meter ([`backend/workers/power-meter/abb/mock/server.js`](../../../../backend/workers/power-meter/abb/mock/server.js)).
2. Brings up a Kernel (HRPC only) pinned to its own store root (`$TMPDIR/mdk-site-abb/kernel/`).
3. `startAbbWorker({ workerId, storeDir, seedDevices })`, then `kernel.registerWorker(worker.runtime.getPublicKey())`.
4. Prints an `hp-rpc-cli` command and stays running until `Ctrl+C`, which tears down the Worker and
   Kernel (the mock exits with the process).

## Directory layout

### Committed (source)

```text
examples/backend/powermeters/abb/
├── README.md
├── index.js                      # Kernel + ABB Worker + mock + registration
└── .gitignore
```

### Generated (ignored)

```text
$TMPDIR/mdk-site-abb/kernel/         # Kernel Corestore
```

## Troubleshooting

| Issue | Fix |
|---|---|
| `Cannot find module ...` | Run `npm install` from the repo root. |
| `EADDRINUSE :::5060` | A previous run is still bound. `Ctrl+C` it, or change `PORT` in `index.js`. |
| `Corruption: ... MANIFEST-*` | Stale store from a `kill -9`. Delete `$TMPDIR/mdk-site-abb/` and retry. |

## Related

| Path | Purpose |
|---|---|
| [`backend/workers/power-meter/abb`](../../../../backend/workers/power-meter/abb/README.md) | ABB `ABB_B23` (+B24/M1M20/M4M20/REU615) managers, mock server, `mdk-contract.json`. |
