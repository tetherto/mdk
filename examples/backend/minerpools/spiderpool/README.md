# MDK SpiderPool Minerpool Example (standalone)

A small, self-contained **SpiderPool** minerpool example you can clone and run with **no real hardware,
no SpiderPool account, and no network access**. It starts a mock SpiderPool API (which verifies the
real MD5withRSA request signing against a bundled test keypair), drives the `SPIDER_POOL` Worker
against it, prints a pool snapshot (hashrate, Workers, balance, transactions), and exits.

## Why this one is standalone (no Kernel / gateway)

The miner and container examples (e.g. [`examples/backend/miners/antminer`](../../miners/antminer/README.md))
bring up a Kernel + gateway and boot their Worker via `WorkerRuntime`. `@tetherto/mdk-worker-spiderpool`
does ship a Kernel-integrated boot function, `startSpiderpoolWorker`, documented in the
[worker package README](../../../../backend/workers/minerpools/spiderpool/README.md). This example drives
the manager directly, for a minimal demo with no Kernel/gateway dependency:

- `SpiderMinerpoolManager` extends [`PoolService`](../../../../backend/core/mdk/lib/services/pool.service.js)
  from `@tetherto/mdk-core`. Pool workers are not devices in the Worker Plugin sense.
- It's **config-driven**: the subaccounts, access key, RSA private key and API URL come from
  `{ spiderpool: { accounts, accessKey, privateKey, apiUrl } }` at construction, and data is pulled
  with `fetchStats` / `fetchWorkers` / `fetchTransactions`.

## What it demonstrates

- Running the `SPIDER_POOL` Worker against a mock SpiderPool REST API — zero hardware/account.
- The real SpiderPool request envelope (`{ dataJson, accessKey, timestamp, sign }` with MD5withRSA
  signing) exercised end-to-end, verified by the mock.
- Pulling pool **stats**, per-worker **hashrate** and **payment records** into the Worker store, and
  reading them back via `getWrkExtData()` / `getWorkers()`.

## Prerequisites

- **Node.js >= 24**
- Worker dependencies installed (from the repo root):

```bash
npm run setup:workers   # backend/workers packages (includes minerpool-spiderpool + its mock)
```

> Without this you'll get `Cannot find module ...` on first run.

## Quickstart

Clone-and-run — no config copy needed (falls back to [`config/mdk.config.json.example`](./config/mdk.config.json.example)):

```bash
node examples/backend/minerpools/spiderpool/index.js     # from the repo root
```

You'll see a pool snapshot like:

```
[mdk-spiderpool] SpiderPool mock @ http://127.0.0.1:5064 — accounts: spider-test
[mdk-spiderpool] Pool snapshot:
[mdk-spiderpool]   hashrate:    512.33 TH/s
[mdk-spiderpool]   workers:     11 total, 6 online
[mdk-spiderpool]   balance:     0.00042 BTC
[mdk-spiderpool]   est. today:  0.00051 BTC
[mdk-spiderpool]   transactions (today): 1
```

(The mock returns randomised values per run, so exact numbers vary.)

To customise (port, accounts), copy the example and edit your own copy — it takes precedence:

```bash
cd examples/backend/minerpools/spiderpool
cp config/mdk.config.json.example config/mdk.config.json
```

## Testing against a real SpiderPool account

[`verify-live.js`](./verify-live.js) runs the same Worker against the **real** API at
`api.spiderpool.com`. It probes each endpoint separately first, so a failure names one specific
call instead of the whole poll cycle.

You need an access key and the RSA private key whose public half is registered under the SpiderPool
website's **Account Management** section (see the
[API docs](https://support.spiderpool.com/spiderpool-api/miningpool-api)):

```bash
export SPIDERPOOL_ACCESS_KEY=your-access-key
export SPIDERPOOL_PRIVATE_KEY_FILE=/path/to/spiderpool_key.txt
export SPIDERPOOL_ACCOUNTS=your-subaccount
node examples/backend/minerpools/spiderpool/verify-live.js
```

Optional: `SPIDERPOOL_API_URL` (default `https://api.spiderpool.com`), `SPIDERPOOL_COIN`
(default `btc`), `SPIDERPOOL_PRIVATE_KEY` (inline key instead of the file).

### Private key format

The SpiderPool console issues the private key as a **bare base64 body with no PEM header** (the
shape Java's `PKCS8EncodedKeySpec` takes). Save it verbatim — no conversion needed. The Worker
normalizes all of these:

| What you have | Supported |
|---|---|
| Bare base64 from the console, one long line | yes |
| Bare base64 wrapped across several lines | yes |
| PEM block (`-----BEGIN PRIVATE KEY-----`, PKCS#8) | yes |
| PEM block (`-----BEGIN RSA PRIVATE KEY-----`, PKCS#1) | yes |
| PEM with literal `\n` escapes (from JSON config or an env var) | yes |

If the key is rejected, the error names the reason — the most common one is pasting the **public**
key by mistake.

Output on success:

```
Endpoint probes for "your-subaccount":
  getSubaccountProfitInfo    ... ok
  fullHashRate               ... ok
  worker/list                ... ok
  getSubaccountPaymentRecord ... ok

Manager fetch cycle:
  fetchWorkers       ... ok
  fetchStats         ... ok
  fetchTransactions  ... ok

OK — SpiderPool worker is fetching live data from the real API.
```

Common failures are translated into a next step — for example a `SIGN_INVALID` code reports that
the registered public key doesn't match your private key, and `PERMISSION_DENIED` reports that the
access key doesn't cover the requested subaccount.

To wire the same credentials into your own code:

```js
const pool = new SPIDER_POOL(
  {
    spiderpool: {
      accounts: ['your-subaccount'],
      accessKey: 'your-access-key',
      privateKey: fs.readFileSync('./spiderpool_rsa.pem', 'utf8'),
      apiUrl: 'https://api.spiderpool.com'
    }
  },
  { rack: 'site-1', storeDir: './store/spiderpool', root: './store/spiderpool' }
)
```

> Keep the private key out of the repo and out of shell history — prefer the `*_FILE` form with a
> `chmod 600` key file.

## Configuration reference

[`config/mdk.config.json`](./config/mdk.config.json.example) (copied from the `.example`):

| Field | Description |
|---|---|
| `mock.host` | Interface the mock SpiderPool API binds (default `127.0.0.1`). |
| `mock.port` | Port for the mock API (default `5064`). Also the URL the pool fetches from. |
| `accounts` | SpiderPool subaccount names to query (default `["spider-test"]`). |

## Related

| Path | Purpose |
|---|---|
| [`backend/workers/minerpools/spiderpool`](../../../../backend/workers/minerpools/spiderpool/README.md) | SpiderPool `SPIDER_POOL` manager, mock server, `mdk-contract.json`. |
| [`examples/backend/minerpools/ocean`](../ocean/README.md) | The Ocean minerpool example (long-running variant with `verify.js`). |
