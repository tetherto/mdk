# EMCD pool example

From the repository root, install the workers and run the example:

```bash
npm run setup:workers
node examples/backend/minerpools/emcd/index.js
```

The script starts a mock EMCD API on `127.0.0.1:5065`, polls it with signed
requests and prints four metrics as JSON. Then it closes the mock and deletes
its temporary store. The fixture has one active worker, a hashrate of
`150000000000000` H/s, a balance of `0.00125` BTC and `0.00012` BTC of
earnings for yesterday.

## Live verification

Put a real key in `EMCD_API_KEY` and `EMCD_API_SECRET`, then run:

```bash
node examples/backend/minerpools/emcd/verify-live.js
```

Set `EMCD_SUBACCOUNT_ID` to check a subaccount you own instead of the master
account. The script polls the production API once, checks that all four
metrics are finite numbers and prints `OK` per metric. It exits with a
nonzero status if any metric is unavailable, balance included, so a key
without `master:read:balance` fails here on purpose. It only reads. Nothing
on the account changes.

Configuration, permissions and metric definitions are in the
[worker README](../../../../backend/workers/minerpools/emcd/README.md).
[`config/mdk.config.json.example`](./config/mdk.config.json.example) shows
the `conf` object `startEmcdWorker` expects. The two scripts above do not read
it, they take everything from the mock or from the environment.
