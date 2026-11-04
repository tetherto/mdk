# Local testing — no site required

Load this when verifying a Worker. A Worker is site-agnostic, so the entire
loop below runs on your machine against the Worker's own device mock. Run the
steps in order; each catches a different failure class.

## 1. Contract validation (static, no runtime)

```
node <this-skill>/scripts/validate-contract.mjs <worker>/mdk-contract.json
```

Schema conformance + handler-file existence + duplicate names + the
numeric-bounds rule. Exit 0/1. Fix and re-run until clean — everything later
assumes a valid contract.

## 2. In-process smoke (plugin + mock, no Kernel, no DHT)

```
node <this-skill>/scripts/worker-smoke.mjs <worker-dir>
```

The harness loads `@tetherto/mdk-worker` as the worker dir resolves it (run
`npm install` there first). Only if that fails does it fall back to
`backend/core/mdk-worker` in the MDK checkout that contains the skill itself,
never above that repo's root. `MDK_WORKER_BASE=<dir>` overrides both.

The harness looks for `<worker-dir>/smoke.config.js` (the template ships one):
`setup()` boots the device mock and returns `{ config, commands?, teardown }`.
The harness then:

1. Loads the contract through the real `loadContract` (catching handler wiring
   errors exactly as `WorkerRuntimeV2` construction would).
2. Builds one device instance via `createInstance` and calls **every declared
   telemetry handler**, asserting each returns a defined value of the
   contract-declared type.
3. Replicates the Kernel dispatcher's param validation to assert that every
   bounded numeric param **rejects below-min / above-max** and accepts the
   bounds themselves.
4. Executes each command listed in `smoke.config.js` `commands` with its
   sample in-bounds params and asserts success.

Alternative to `smoke.config.js`: pass `--config '<json>'` (or a path to a
`.json`/`.js` config module) if the mock is already running.

## 3. Standalone protocol check (WorkerRuntimeV2, real envelopes, still no Kernel)

Host the package's directory on the runtime and drive envelopes through
`handleRequest` — this exercises envelope dispatch and multi-device routing.
Minimal caller (run the
body inside an `async function main ()` in a `.js` file, or as-is in an
`.mjs`):

```js
'use strict'
const path = require('path')
const WorkerRuntimeV2 = require('<repo>/backend/core/mdk-worker/lib/worker-runtime-v2')

const runtime = new WorkerRuntimeV2(path.resolve('<your-worker-dir>'), {
  workerId: 'standalone-check',
  devices: [{ deviceId: 'dev-0', config: { host: '127.0.0.1', port: MOCK_PORT } }],
  allowAll: true // local check only: logs a warning and accepts any caller
})
await runtime.start() // no kernelTopic → HRPC up, but nothing announced

const res = await runtime.handleRequest({
  id: 'req-1', version: '0.2.0', type: 'request', action: 'telemetry.pull',
  sender: 'standalone-check', target: null, deviceId: 'dev-0',
  timestamp: Date.now(), payload: { query: { type: 'metrics' } }
})
console.log(res.payload.metrics)
await runtime.stop()
```

`allowAll` stands in for `allowedKeys` here because no Kernel is involved; a Worker that will register with a Kernel
passes `allowedKeys: [kernel.getClientPublicKey()]` instead, or `start()` throws `ERR_WORKER_ALLOWED_KEYS_REQUIRED`.

Check here: `identity.request`, `capability.request` (handler paths must be
stripped), `telemetry.pull` per channel, `command.request` success and
`FAILED` paths, and behavior with the mock stopped (the affected channel's
handler call errors; siblings and other channels are unaffected — there is no
boot-time probe and no offline state to hold the device in).

## 4. Site integration (a real Kernel)

In a CLI-managed project (Worker scaffolded with `mdk create worker`, listed
under `mdk.yaml` → `spec.workers`), this step is just `mdk run worker <name>`
followed by `mdk run kernel` (or `mdk run` to boot both together) — see
`mdk-deployment`. `mdk status` then confirms registration.

Otherwise, your Worker package doesn't need to live in the MDK monorepo for
this step — a caller can require it from anywhere; you only need a local
Kernel to register against. In a checkout of the MDK monorepo, drop the Worker into the
mvp-site example: [`examples/mvp-site/deploy/run-process.js`](../../../../../../examples/mvp-site/deploy/run-process.js)
runs one PM2-supervised process per role (mocks, Kernel, each Worker, Gateway) — add a role that boots your Worker
and list it under `pm2.roles` in `config/site.deploy.json` (the `worker-antminer` role and
[`examples/mvp-site/backend/antminer-adapter.js`](../../../../../../examples/mvp-site/backend/antminer-adapter.js) show the
third-party-plugin shape, no worker-infra plumbing).
Confirm the Kernel registers it, telemetry flows, and commands round-trip.

## Unit tests (accompany every step)

Pattern (`tests/unit/handlers.test.js`): boot the mock on a free port, build one
device instance with `createInstance({ dir, entries: loadContract(dir).entries,
device })`, then call handlers directly off `instance.telemetry.get(name)` /
`instance.commands.get(name)` — plugin-level tests never need `WorkerRuntimeV2`
(loadContract/createInstance-level wiring is covered by [`worker-smoke.mjs`](../scripts/worker-smoke.mjs)
already, so these tests are free to focus on handler behavior):

```js
const { loadContract, createInstance } = require('<repo>/backend/core/mdk-worker')

const dir = path.resolve('<your-worker-dir>')
const instance = createInstance({
  dir,
  entries: loadContract(dir).entries,
  device: { id: 'test-0', opts: { host: '127.0.0.1', port: MOCK_PORT }, env: {}, config: {} }
})

const value = await instance.telemetry.get('hashrate_rt')({})
const result = await instance.commands.get('setPowerMode')({ mode: 'eco' })
```

[`backend/workers/miners/avalon/tests/unit/miner.test.js`](../../../../../../backend/workers/miners/avalon/tests/unit/miner.test.js)
is a worked example of brittle tests in this repo. Runner is **brittle** (no mocha, no
jest). It must be a `devDependency` of the worker, pinned like the rest of the
repo (`"brittle": "3.18.0"`); `--no-install` makes `npx` fail instead of
downloading an unpinned copy when it is missing:

```
npm install --save-dev --save-exact brittle@3.18.0   # once, if package.json lacks it
npx --no-install brittle tests/unit/*.test.js
```

Cover at minimum: every telemetry handler against mock values, every command's
effect on mock state, a telemetry handler's error when nothing listens (there
is no boot-time probe to hold the device offline instead), and one
firmware-error path surfacing its contract `ERR_*` code.
