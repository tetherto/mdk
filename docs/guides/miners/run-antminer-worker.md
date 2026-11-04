---
title: Run an Antminer Worker
description: Host the external antminer-mdk-worker contract plugin on WorkerRuntimeV2, against a mock or a real device.
docs@tether_slug: guides/miners/run-antminer-worker
---

## Overview

Antminer support ships as the external [`antminer-mdk-worker`][antminer-mdk-worker] contract plugin, maintained by
Bitmain. It's a plain `mdk-contract.json` plus handler files, with no `startAntminerWorker` export, no provisioning
store, no alerts/stats templates, and no model allowlist: compatibility comes from the firmware capabilities each miner
reports. You host it yourself on [`WorkerRuntimeV2`][worker-runtime-v2] through a small adapter; this repo ships a
working one to copy from ([`examples/mvp-site/backend/antminer-adapter.js`][mvp-site-adapter]).

## Prerequisites

Review the [common deployment prerequisites][miner-guide-assumptions] before you start.

Deployment-specific requirements:

- The [`antminer-mdk-worker`][antminer-mdk-worker] package added as a dependency (it's distributed as a git
  dependency, not on the npm registry — see [its own README][antminer-mdk-worker] for the exact version/ref to pin)
- A Node.js service or script in your deployment that constructs the adapter below and registers the resulting Worker
- An Antminer running stock firmware, reachable from the machine or container running the Worker
- The miner's HTTP CGI API reachable, port `80` by default
- HTTP Digest credentials for the miner. The factory default is `root`/`root`; use your site's configured credentials

<Steps>

<Step>

### Development

<details>
<summary>Run against a mock</summary>

The plugin ships its own stateful mock at `antminer-mdk-worker/mock/cgi-server`. It enforces real digest
authentication, serves every CGI endpoint the Worker uses, and applies command writes to its state:

```js
const amMock = require('antminer-mdk-worker/mock/cgi-server')

const main = async () => {
  const mock = amMock.createServer({ port: 14080, host: '127.0.0.1', username: 'root', password: 'root' })
  await mock.ready
  // ...
  await mock.close()
}

main().catch((err) => { console.error(err); process.exit(1) })
```

[`examples/mvp-site`][mvp-site-adapter] boots one mock per seed device listed under `antminers` in
`config/devices.json` and points the adapter's devices at them. Read `startAntminerMocks` alongside
`bootAntminerWorker` in that example's `backend/site.js` for the full wiring. `cd examples/mvp-site && npm run
setup:example && npm start` boots the whole stack — Kernel, mocks, and the Antminer Worker included.

</details>

</Step>

<Step>

### Connect a miner

#### 2.1 Write the adapter

`antminer-mdk-worker` has no boot helper of its own. Construct a [`WorkerRuntimeV2`][worker-runtime-v2] pointed at
the package directory, translating your seed device list into the `{ deviceId, config }` shape it expects:

```js
const path = require('path')
const { WorkerRuntimeV2 } = require('@tetherto/mdk-worker')

const PKG_DIR = path.dirname(require.resolve('antminer-mdk-worker/package.json'))

async function startAntminerWorker (opts) {
  const devices = (opts.seedDevices || []).map((seed) => ({
    deviceId: seed.info?.serialNum || seed.id,
    config: { ...(opts.type ? { type: opts.type } : {}), ...seed.opts }
  }))

  const runtime = new WorkerRuntimeV2(PKG_DIR, {
    workerId: opts.workerId,
    kernelTopic: opts.kernelTopic || null,
    storeDir: opts.storeDir,
    allowedKeys: opts.allowedKeys || [],
    devices
  })

  await runtime.start()
  return { runtime, seeded: devices.length, stop: () => runtime.stop() }
}

module.exports = { startAntminerWorker }
```

This is the adapter [`examples/mvp-site/backend/antminer-adapter.js`][mvp-site-adapter] ships, trimmed of its input
validation and debug logging — copy the real file rather than this excerpt for a production deployment.

#### 2.2 Register your miner

Add this to the Node.js service or script that runs your Worker. The snippet seeds one Antminer device; replace the
example IP address and credentials with your miner's values:

```js
const { getKernel } = require('@tetherto/mdk-core')
const { startAntminerWorker } = require('./antminer-adapter')

const main = async () => {
  const kernel = await getKernel()

  const worker = await startAntminerWorker({
    workerId: 'antminer-rack-1',
    storeDir: './store/antminer-rack-1',
    allowedKeys: [kernel.getClientPublicKey()],
    type: 'miner-am-s21',
    seedDevices: [{
      info: { serialNum: 'AM-001' },
      opts: { address: '192.168.1.10', port: 80, username: 'root', password: process.env.ANTMINER_PASSWORD }
    }]
  })
  await kernel.registerWorker(worker.runtime.getPublicKey())
}

main().catch((err) => { console.error(err); process.exit(1) })
```

`allowedKeys` lists the RPC callers the Worker accepts. The Worker refuses to start without it
(`ERR_WORKER_ALLOWED_KEYS_REQUIRED`), so pass the Kernel's client key.

Device `config` fields the plugin reads:

| Field | Required | Description |
| --- | --- | --- |
| `address` | Yes | Miner IPv4 address or hostname. `host` is accepted as an alias |
| `username` | No | HTTP Digest username. Defaults to `root` |
| `password` | No | HTTP Digest password. Defaults to `root` — override with the real credentials |
| `port` | No | HTTP API port. Defaults to `80` |
| `timeout` | No | Per-request timeout in milliseconds. Defaults to `10000` |
| `type` | No | Device type tag such as `miner-am-s21xp_hyd`. Resolves the rated J/TH reported in `snap` |
| `nominalEfficiencyWThs` | No | Overrides the nominal efficiency table for `snap` |
| `conf` | No | Configured pools (`conf.pools`, max 3), timeouts and size limits |

> [!WARNING]
> Make sure each miner's IP is reachable from the machine or container running the Worker before registering.
> Commands act on physical hardware. Prioritize thermal safety.

> [!IMPORTANT]
> The device list is fixed at construction — there is no `registerThing`/`updateThing`/`forgetThings` equivalent.
> Adding, updating, or removing a device means editing `seedDevices` and restarting the Worker.

The [`antminer-mdk-worker`][antminer-mdk-worker] README and USAGE document the plugin's telemetry channels, commands,
failure semantics, and live-device test scripts in full; the shared [install pattern][install-pattern] covers the
broader deployment mechanics.

</Step>

</Steps>

## Troubleshooting

The reference deployment is [`examples/mvp-site`][mvp-site-adapter]'s full stack. `npm start` launches it under PM2 and
returns; the Antminer Worker's process log shows `MDK_READY worker-antminer devices=<n>` once the Worker is up
(`pm2 logs worker-antminer`).

An unreachable miner doesn't fail at load time: the Worker reports the device online and the failure surfaces inside
the telemetry channel or command response that touched the network. If the Worker doesn't come up, or a mock port is
already in use, follow [miner troubleshooting][miner-troubleshooting].

## Next steps

- Understand the [deployment topologies][deployment-topologies] for running the Worker service
- Review [`antminer-mdk-worker`][antminer-mdk-worker]'s own [`mdk-contract.json`][antminer-contract] for telemetry
  units, command shapes, and error codes — it isn't vendored into this repo

## Links

[miner-guide-assumptions]: index.md#prerequisites
<!-- docs@tether.io: miner-guide-assumptions → guides/miners#prerequisites -->

[antminer-mdk-worker]: https://github.com/bitmain-official/antminer-mdk-worker
<!-- docs@tether.io: external link — preserve URL -->

[antminer-contract]: https://github.com/bitmain-official/antminer-mdk-worker/blob/4fd776b4a048a1bc8284ec2eceed82b4631f960c/mdk-contract.json
<!-- docs@tether.io: external link — preserve URL -->

[worker-runtime-v2]: ../../../backend/core/mdk-worker/lib/worker-runtime-v2.js
<!-- docs@tether.io: worker-runtime-v2 → https://github.com/tetherto/mdk/blob/main/backend/core/mdk-worker/lib/worker-runtime-v2.js -->

[mvp-site-adapter]: ../../../examples/mvp-site/backend/antminer-adapter.js
<!-- docs@tether.io: mvp-site-adapter → https://github.com/tetherto/mdk/blob/main/examples/mvp-site/backend/antminer-adapter.js -->

[install-pattern]: ../../../backend/workers/docs/install-pattern.md
<!-- docs@tether.io: install-pattern → https://github.com/tetherto/mdk/blob/main/backend/workers/docs/install-pattern.md -->

[deployment-topologies]: ../../concepts/deployment-topologies.md
<!-- docs@tether.io: deployment-topologies → https://github.com/tetherto/mdk/blob/main/docs/concepts/deployment-topologies.md -->

[miner-troubleshooting]: troubleshooting.md
<!-- docs@tether.io: miner-troubleshooting → guides/miners/troubleshooting -->
