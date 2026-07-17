---
title: Test a new Worker with MDK
description: Test a third party Worker package
docs@tether_slug: guides/workers/test-a-worker
---

This guide is for users of third-party worker packages or such partners who have integrated their own hardware, firmware, 
or data feed with MDK by shipping a [Worker plugin package][build-a-worker].

## Overview

Worker packages are the contract between the hardware and the Kernel, before relying on such a contract you will want to 
test its integration. To seed devices and register with Kernel, host the plugin on `WorkerRuntime` in a Node.js host process. The host module
may live in the Worker plugin package itself; a second npm package is **not required**. A separate host directory is
recommended when independent plugin publication and plugin-only tests are useful:

```
your-worker-host/
  index.js                      # host module: WorkerRuntime, devices, lifecycle
  run-live.js                   # live Kernel registration and compatibility check
```

This mirrors [`examples/backend/demo-worker-caller/`][demo-worker-caller], which is an
example directory containing one host module, not a standalone npm package.

## Prerequisites

- Node.js `>=24` (all MDK core packages declare this `engines` constraint)
- A completed [Worker Plugin package][build-a-worker], including its bundled mock device
- Comfort with plain async JS — no additional MDK framework knowledge is required beyond what building the package already covered

<Steps>

<Step>

### Install MDK

`@tetherto/mdk-worker` (the package that ships `WorkerRuntime`) is **not yet published to the npm registry** — MDK is
pre-1.0 and still distributed as this monorepo. Until it is, the working path from an external repo is a git
dependency plus a deep `require()` into the checked-out repo, exactly mirroring how every in-repo Worker already
resolves it (by relative path, not through `node_modules` package resolution):

```bash
npm install github:tetherto/mdk#main
```

This installs the whole monorepo under `node_modules/@tetherto/mdk` (its root `package.json` name). It does **not**
auto-install the nested package's own dependencies — this repo's install is a federated set of scripts, not a single
root dependency graph — so run its installer once after adding it:

```bash
(cd node_modules/@tetherto/mdk/backend/core && ./install-packages.sh)
```

The same deep-path pattern also gets you `getKernel`, `startGateway`, and `waitForDiscovery` from
`require('@tetherto/mdk/backend/core/mdk')`, used in Step 3 below.

</Step>

<Step>

### Write the host module

`host/index.js`, modeled on
[`examples/backend/demo-worker-caller/index.js`][demo-worker-caller]:

```js
"use strict";

const { WorkerRuntime } = require("@tetherto/mdk/backend/core/mdk-worker");
const plugin = require("../your-worker-repo/plugin");

async function startVendorWorker({ workerId, kernelTopic, seedDevices }) {
  const runtime = new WorkerRuntime(plugin, {
    workerId,
    kernelTopic: kernelTopic || null,
    devices: (seedDevices || []).map((d) => ({
      deviceId: d.id,
      config: d.opts,
    })),
  });
  await runtime.start();

  return {
    runtime,
    stop: () => runtime.stop(),
  };
}

module.exports = { startVendorWorker };
```

Required `WorkerRuntime` options are `workerId` and a non-empty `devices` array. Each `config` object is passed to the
plugin's `connect()`. `kernelTopic` is needed only for DHT discovery.

Without a `store`, `WorkerRuntime` generates a new RPC keypair on restart. Pass a process-owned store if deployment
requires stable identity. The host process also owns persistence, sampling loops, retries, secrets, and shutdown.
See the [demo host module][demo-worker-caller] for a SQLite sampler example.

`WorkerRuntime` also exposes two read accessors for the host process: `getPublicKey()` returns the runtime's RPC
public key (used to register with Kernel, shown in the next step), and `getDeviceContext(deviceId)` returns the same
frozen `ctx` a handler receives (`{ deviceId, device, config, services }`) for a device that is currently `online`,
or `null` otherwise — useful for wiring an external service (for example, a snapshot collector) to a live device
outside the request/response cycle.

</Step>

<Step>

### Register directly with a live Kernel

When Kernel and the Worker host share a process, register the runtime's public key directly. This complete
`host/run-live.js` proves that Kernel accepted the Worker, that it reached `READY`, and that telemetry traverses the
real client → Kernel → Worker path:

```js
"use strict";

const os = require("os");
const path = require("path");
const {
  getKernel,
  waitForDiscovery,
  shutdown,
} = require("@tetherto/mdk/backend/core/mdk");
const { createMdkClient } = require("@tetherto/mdk/backend/core/client");
const { startVendorWorker } = require("./index");
const vendorMock = require("../your-worker-repo/mock/server");

const ROOT = path.join(os.tmpdir(), `vendor-worker-${process.pid}`);

function onceListening(mock) {
  if (mock.server.listening) return Promise.resolve();
  return new Promise((resolve) => mock.server.once("listening", resolve));
}

function withTimeout(promise, timeoutMs, code) {
  let timer;
  const timeout = new Promise((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(code)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function main() {
  let mock;
  let worker;
  let kernel;
  let client;

  try {
    mock = vendorMock.createServer({
      host: "127.0.0.1",
      port: 9001,
      hashrateThs: 200,
    });
    await onceListening(mock);

    kernel = await getKernel({ root: ROOT });
    worker = await startVendorWorker({
      workerId: "vendor-demo",
      seedDevices: [
        { id: "vendor-0", opts: { host: "127.0.0.1", port: 9001 } },
      ],
    });

    await kernel.registerWorker(worker.runtime.getPublicKey());
    const workers = await waitForDiscovery(kernel, {
      minWorkers: 1,
      timeoutMs: 30000,
    });
    const ready = workers.find(
      (w) => w.workerId === "vendor-demo" && w.state === "READY",
    );
    if (!ready || !ready.deviceIds.includes("vendor-0")) {
      throw new Error("ERR_WORKER_NOT_READY");
    }

    client = createMdkClient({ hrpc: { key: kernel.getPublicKey() } });
    await client.connect();
    const telemetry = await withTimeout(
      client.pullTelemetry("vendor-0", "metrics"),
      8000,
      "ERR_TELEMETRY_TIMEOUT",
    );
    if (typeof telemetry.metrics?.hashrate_rt !== "number") {
      throw new Error("ERR_TELEMETRY_INVALID");
    }

    console.log(`READY ${ready.workerId}: ${ready.deviceIds.join(", ")}`);
    console.log(`hashrate_rt=${telemetry.metrics.hashrate_rt}`);
  } finally {
    if (client) await client.close();
    if (kernel) await shutdown(kernel);
    if (worker) await worker.stop();
    if (mock) mock.exit();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
```

Expected output:

```text
READY vendor-demo: vendor-0
hashrate_rt=200
```

The timeout wrapper bounds the client's wait but cannot cancel the current HRPC request. Always close the client
during shutdown. Device-protocol cancellation is separately owned by the device client from Step 2.

</Step>

<Step>

### Use DHT discovery across processes or hosts

For DHT discovery, generate and securely distribute one 32-byte hex topic, start the Worker first with
`kernelTopic`, then start Kernel with the same `topic`. Do **not** also call `registerWorker()`:

```js
"use strict";

const crypto = require("crypto");
const os = require("os");
const path = require("path");
const {
  getKernel,
  waitForDiscovery,
  shutdown,
} = require("@tetherto/mdk/backend/core/mdk");
const { startVendorWorker } = require("./index");

const ROOT = path.join(os.tmpdir(), `vendor-worker-dht-${process.pid}`);

async function main() {
  const topic = process.env.MDK_TOPIC || crypto.randomBytes(32).toString("hex");
  let worker;
  let kernel;

  try {
    worker = await startVendorWorker({
      workerId: "vendor-demo",
      kernelTopic: topic,
      seedDevices: [
        { id: "vendor-0", opts: { host: "10.0.0.20", port: 9001 } },
      ],
    });
    kernel = await getKernel({ root: ROOT, topic });

    const workers = await waitForDiscovery(kernel, {
      minWorkers: 1,
      timeoutMs: 45000,
    });
    const ready = workers.find(
      (w) => w.workerId === "vendor-demo" && w.state === "READY",
    );
    if (!ready) throw new Error("ERR_WORKER_NOT_READY");
    console.log(`READY ${ready.workerId}: ${ready.deviceIds.join(", ")}`);
  } finally {
    if (kernel) await shutdown(kernel);
    if (worker) await worker.stop();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
```

For separate production processes, each process must install signal handlers and close every handle it owns. DHT
topics enable rendezvous; they are not authentication secrets or command-authorization tokens. See the
[discovery model][workers-concept] for DHT, Local, and Same-process trade-offs.

</Step>

</Steps>

## Troubleshooting

### Runtime construction

| Error                             | Diagnostic and remediation                                                                                        |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `ERR_WORKER_ID_REQUIRED`          | Pass a non-empty string `workerId`                                                                                |
| `ERR_DEVICES_REQUIRED`            | Pass a non-empty `devices` array, unless this is an intentional provisioning-first host using `allowEmptyDevices` |
| `ERR_DEVICE_ID_MISSING`           | Every device spec needs a non-empty string `deviceId`                                                             |
| `ERR_DEVICE_ID_DUPLICATE: <id>`   | Device IDs must be unique within one runtime                                                                      |
| `ERR_DEVICE_CONFIG_INVALID: <id>` | `config`, when supplied, must be a non-null object                                                                |

`allowEmptyDevices` opts a host into a provisioning-first bootstrap: the runtime constructs with zero devices instead
of throwing `ERR_DEVICES_REQUIRED`, then takes `registerThing` writes (a built-in command — see
[Worker Runtime legacy services][worker-runtime-legacy]) that persist new device configs to the store. Those writes
only take effect once the host is stopped and restarted with the provisioned set — there is no hot-add. It is off by
default; every shipped miner Worker in this monorepo sets it to `true` in its boot function.

### Startup and discovery

| Symptom                                        | Diagnostic and remediation                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Device remains offline after `runtime.start()` | `connect()` failed. Check the device timeout, credentials, address, protocol, and redacted host logs. The current runtime does not reconnect; restore reachability and restart the Worker host  |
| `waitForDiscovery()` returns no `READY` Worker | For direct registration, await `runtime.start()` and `kernel.registerWorker(runtime.getPublicKey())`. For DHT, start the Worker first and verify both processes use the same 32-byte hex topic and can reach the DHT network |
| Worker is present but never `READY`            | Inspect identity and capability failures. Confirm at least one device ID is reported and the contract has valid `metadata` and `capabilities`  |

### Request time

| Error                              | Diagnostic and remediation                                                                                                                               |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ERR_DEVICE_UNAVAILABLE: <id>`     | The device was held offline because `connect()` failed; follow the documented restart/recovery path                                                      |
| `ERR_DEVICE_NOT_FOUND: <id>`       | The request targeted an ID not seeded in this runtime; compare it with the Kernel registry's `deviceIds`                                                 |
| `ERR_DEVICE_ID_REQUIRED: <type>`   | A named telemetry pull or command omitted its target device ID                                                                                           |
| `ERR_UNKNOWN_QUERY_TYPE: <type>`   | Use `metrics` or the exact `name` of a telemetry entry; the entry's return `type` is not its channel name                                                |
| `ERR_UNKNOWN_COMMAND: <name>`      | Use the exact declared command name and confirm its handler loaded                                                                                       |
| `ERR_UNKNOWN_ACTION: <action>`     | Use a public MDK client helper instead of constructing protocol actions manually                                                                         |
| Command returns `status: 'FAILED'` | Read the stable `ERR_*` value, check validation/cooldown/device logs, and do not retry a timed-out physical write until its actual device state is known |

## Next steps

- Understand the [security boundaries][security-boundaries]

Understand the end-user experience of controlling and monitoring your device via the Worker:

- Build a [minimal dashboard][minimal-dashboard] around one Worker
- Run the [full-site example][full-site] with the supported Worker fleet
- Connect an [AI agent via the MCP server][mcp-server] to query and command your Workers

## Links

[build-a-worker]: build-a-worker.md
<!-- docs@tether.io: build-a-worker → guides/workers/build-a-worker -->

[demo-worker-caller]: ../../../examples/backend/demo-worker-caller/index.js
<!-- docs@tether.io: demo-worker-caller → https://github.com/tetherto/mdk/blob/main/examples/backend/demo-worker-caller/index.js -->

[workers-concept]: ../../concepts/stack/workers.md#discovery-model
<!-- docs@tether.io: workers-concept → concepts/stack/workers -->

[security-boundaries]: ../../concepts/security-boundaries.md
<!-- docs@tether.io: security-boundaries → concepts/security-boundaries -->

[worker-runtime-legacy]: ../../reference/maintainers/worker-runtime-legacy-services.md
<!-- docs@tether.io: worker-runtime-legacy → https://github.com/tetherto/mdk/blob/main/docs/reference/maintainers/worker-runtime-legacy-services.md -->

[minimal-dashboard]: ../../tutorials/quickstart/build-a-dashboard.md
<!-- docs@tether.io: minimal-dashboard → tutorials/quickstart/build-a-dashboard -->

[full-site]: ../../../examples/full-site/README.md
<!-- docs@tether.io: full-site → https://github.com/tetherto/mdk/blob/main/examples/full-site/README.md -->

[mcp-server]: ../../../examples/full-site/docs/mcp-server.md
<!-- docs@tether.io: mcp-server → https://github.com/tetherto/mdk/blob/main/examples/full-site/docs/mcp-server.md -->
