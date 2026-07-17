# MDK F2Pool Minerpool Example (standalone)

A small, self-contained **F2Pool** minerpool example you can clone and run with **no real hardware,
no F2Pool account, and no network access**. It starts a mock F2Pool API, drives the `F2_POOL` Worker
against it, and prints a pool snapshot (hashrate, Workers, balance, transactions) before exiting.

## Why this one is standalone (no Kernel / gateway)

Like [`examples/backend/minerpools/ocean`](../ocean/README.md), this runs **standalone**. Minerpools
are **not yet wired into the Kernel/MDK thing model**: `F2PoolMinerpoolManager` extends `MinerpoolManager`
(an `EventEmitter`), **not** `ThingManager` — it has no `registerThing`/`mem.things`, and is
config-driven (accounts + apiUrl + apiSecret). So this example drives the pool manager **directly**,
exactly as it runs inside a Worker process. Wiring minerpools into the Kernel is tracked separately.

## What it demonstrates

- Running the `F2_POOL` Worker against a mock F2Pool REST API — zero hardware/account.
- Pulling pool **stats**, **Workers** and **transactions** into the Worker store and reading them back
  via `getWrkExtData()` / `getWorkers()`.

## Prerequisites

- **Node.js >= 24**
- Worker dependencies installed (from the repo root):

```bash
npm run setup:workers   # backend/workers packages (includes minerpool-f2pool + its mock)
```

## Quickstart

```bash
node examples/backend/minerpools/f2pool/index.js     # from the repo root
# or: cd examples/backend/minerpools/f2pool && npm start
```

It prints a snapshot like:

```
[mdk-f2pool] Pool snapshot:
[mdk-f2pool]   hashrate:    667.00 TH/s
[mdk-f2pool]   workers:     11 total, 5 online
[mdk-f2pool]   balance:     0.0001 BTC
[mdk-f2pool]   transactions (today): 0
```

then exits (the mock returns randomised values per run, so exact numbers vary). To customise the
account or port, edit the constants at the top of `index.js`.

## How it works

`index.js`:

1. Starts the mock F2Pool API (`backend/workers/minerpools/f2pool/mock/server`).
2. Constructs `new F2_POOL({ f2pool: { accounts, apiUrl, apiSecret } }, { rack, storeDir, root })` and `init()`s it.
3. Pulls data: `fetchWorkers` → `fetchStats` → `fetchTransactions` (stored in a local Hyperbee).
4. Reads it back: `getWrkExtData({ key: 'stats' | 'transactions' })` and `getWorkers()`, prints a summary, and exits.

## Directory layout

```
examples/backend/minerpools/f2pool/
├── README.md
├── package.json
├── index.js                      # mock + F2_POOL + fetch/print, then exits
└── .gitignore
```

The Worker's Hyperbee store is written to a fresh `$TMPDIR/mdk-f2pool-*` dir and removed on exit.

## Troubleshooting

| Issue | Fix |
|---|---|
| `Cannot find module ...` | Run `npm run setup:workers` from the repo root. |
| `EADDRINUSE :::5063` | A previous run is still bound. Free the port, or change `PORT` in `index.js`. |
| All metrics `n/a`/`0` | The mock randomises data; re-run. If persistent, confirm nothing else holds port `5063`. |

## Related

| Path | Purpose |
|---|---|
| [`backend/workers/minerpools/f2pool`](../../../../backend/workers/minerpools/f2pool/README.md) | F2Pool `F2_POOL` manager, mock server, `mdk-contract.json`. |
| [`examples/backend/minerpools/ocean`](../ocean/README.md) | The Ocean minerpool example (same standalone pattern). |
