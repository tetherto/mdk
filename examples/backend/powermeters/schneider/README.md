# MDK Schneider power meter example

A small, self-contained **Schneider PM5340** power-meter example you can clone and run with **no real
hardware**. It starts a mock Schneider meter, brings up a Kernel, registers the meter as a thing, and
stays running. It prints a ready-to-paste `hp-rpc-cli` command for pulling the meter's live telemetry
over HRPC.

Self-contained: everything for this example lives in this folder — no shared example helpers. It's
the Schneider counterpart of [`examples/backend/miners/antminer`](../../miners/antminer/README.md).

## What it demonstrates

- Bringing up a Kernel and one Schneider power-meter Worker in a single process.
- Starting a **mock** Schneider meter (Modbus TCP) and **registering** it as a thing.
- Pulling live telemetry (voltage, current, power) through the Kernel over HRPC — no hardware.

## Prerequisites

- **Node.js >= 22**
- Worker dependencies installed (from the repo root):

```bash
npm install   # backend/workers packages (including power-meter-schneider + its mock) are root workspace members
```

## Quickstart

```bash
node examples/backend/powermeters/schneider/index.js     # from the repo root
# or: cd examples/backend/powermeters/schneider && npm start
```

You'll see the registered device id and `Press Ctrl+C to stop`. To customise the port, serial or
model, edit the constants at the top of [`index.js`](./index.js) — the Worker also exports `SCHNEIDER_P3U30`
(mock `type: 'p3u30'`).

## Inspect over HRPC with `hp-rpc-cli`

[`index.js`](./index.js) prints the Kernel key, device ID, and a ready-to-paste telemetry command. The shared
[`hp-rpc-cli` inspection guide](../../inspect-over-hrpc.md) covers Worker listing, telemetry pulls,
other actions, and troubleshooting.

## How it works

[`index.js`](./index.js):

1. Starts the mock Schneider meter ([`backend/workers/power-meter/schneider/mock/server.js`](../../../../backend/workers/power-meter/schneider/mock/server.js)).
2. Brings up a Kernel (HRPC only) pinned to its own store root (`$TMPDIR/mdk-site-schneider/kernel/`).
3. `startSchneiderWorker({ workerId, storeDir, seedDevices })`, then `kernel.registerWorker(worker.runtime.getPublicKey())`.
4. Prints an `hp-rpc-cli` command and stays running until `Ctrl+C`, which tears down the Worker and
   Kernel (the mock exits with the process).

## Directory layout

### Committed (source)

```text
examples/backend/powermeters/schneider/
├── README.md
├── index.js                      # Kernel + Schneider Worker + mock + registration
└── .gitignore
```

### Generated (ignored)

```text
$TMPDIR/mdk-site-schneider/kernel/    # Kernel Corestore
```

## Troubleshooting

| Issue | Fix |
|---|---|
| `Cannot find module ...` | Run `npm install` from the repo root. |
| `EADDRINUSE :::5062` | A previous run is still bound. `Ctrl+C` it, or change `PORT` in `index.js`. |
| `Corruption: ... MANIFEST-*` | Stale store from a `kill -9`. Delete `$TMPDIR/mdk-site-schneider/` and retry. |

## Related

| Path | Purpose |
|---|---|
| [`backend/workers/power-meter/schneider`](../../../../backend/workers/power-meter/schneider/README.md) | Schneider `SCHNEIDER_PM5340` / `SCHNEIDER_P3U30` managers, mock server, `mdk-contract.json`. |
