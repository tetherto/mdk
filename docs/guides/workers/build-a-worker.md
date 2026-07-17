---
title: Build a third-party Worker
description: Integrate your own hardware, firmware, or data feed with MDK by shipping a Worker package from your own repo — no monorepo fork required
docs@tether_slug: guides/workers/build-a-worker
---

# Build a third-party Worker

This guide is for partners who want to integrate their own hardware, firmware, or data feed with MDK by shipping a
Worker plugin package from their own public or private repository — no fork of this monorepo and no PR into
`tetherto/mdk` required.

It walks through building a Worker from scratch, end to end: the device client, the `mdk-contract.json`, the handlers,
the mock, the tests, and finally how to depend on MDK's runtime from your own repo and register your Worker with a live
Kernel.

Everything below is a generalization of one real, runnable reference implementation already in this repo:
[`backend/workers/samples/demo-worker/`][demo-worker]. It proves this pattern works with **zero**
dependency on this monorepo's optional worker-infra services (provisioning stores, alert templates, stats
aggregation) — just `WorkerRuntime` and the Worker Plugin contract shape. Keep it open as the minimal reference while
you follow along. This guide links its corresponding files and adds production-oriented validation, recovery, and
security boundaries that the deliberately small sample does not implement.

> [!NOTE]
> This guide uses **partner integration** for the complete integration, **Worker plugin package** for the static
> contract and handlers, **host process** for the Node.js process that owns `WorkerRuntime`, and **device ID** for a
> runtime device identity. **Worker** is capitalized when it means the MDK component. Older APIs may still use
> `thing` for a device. For the broader architecture, read [How MDK works][architecture].
> Also read the [Worker install pattern][install-pattern] and
> [Worker discovery model][workers-concept].

## What you get

```
your-worker-repo/
  package.json
  index.js                     # exports { plugin } — the Worker Plugin, nothing more
  lib/
    device-client.js           # plain I/O against your vendor's native API — no MDK concepts
  plugin/
    index.js                   # the Worker Plugin: { contract, dir, connect, disconnect? }
    mdk-contract.json          # the engineering + AI-context contract
    src/
      telemetry/*.js           # one handler per telemetry field
      commands/*.js            # one handler per command
  mock/
    server.js                  # a standalone fake of the vendor's device API
  tests/
    unit/plugin.test.js        # drives plugin.connect() + handlers directly against the mock
                                # — no WorkerRuntime involved
```

This is exactly the shape of [`demo-worker`][demo-worker] with the vendor name genericized: a package
that can be fully built and tested with **zero** dependency on `WorkerRuntime`. Nothing about this layout is enforced
by the framework — `WorkerRuntime` only cares about the plugin object it receives
(`{ contract, dir, connect, disconnect? }`) — but matching it keeps your package legible to anyone who has read
another MDK Worker.

## Prerequisites

- Node.js `>=24` (all MDK core packages declare this `engines` constraint)
- A device or firmware API you can talk to from Node — HTTP, TCP, Modbus, MQTT, serial, whatever your hardware speaks
- Comfort with plain async JS — no MDK-specific framework knowledge is required to write the device client

<Steps>

<Step>

### Scaffold the package

Create your own repo (or a directory inside your existing one) with a `package.json`. Pick your own npm scope (as an external
Worker provider, you will publish under a different domain to `@tetherto`):

```json
{
  "name": "@your-org/mdk-worker-vendor",
  "version": "0.1.0",
  "description": "MDK Worker for Vendor firmware v1 devices",
  "license": "Apache-2.0",
  "engines": { "node": ">=24" },
  "type": "commonjs",
  "scripts": {
    "lint": "standard",
    "test": "npm run lint && npm run test:unit",
    "test:unit": "NODE_ENV=test brittle tests/unit/*.test.js"
  },
  "dependencies": {
    "debug": "^4.4.1"
  },
  "devDependencies": {
    "brittle": "^3.16.0",
    "standard": "^17.1.2"
  }
}
```

The examples and current plugin loader use CommonJS: plugin and handler files are loaded with `require()`. Set
`"type": "commonjs"` or use `.cjs` files. An ESM-only package (`"type": "module"` with `.js` handlers) is not a
supported plugin-loader path today. `WorkerRuntime` brings its own transport dependencies (`@hyperswarm/rpc`,
`hyperswarm`, `hyperdht`) — you don't redeclare them. `brittle` and `standard` are the repository's test and lint
tools; substitute your own tooling if you prefer.

</Step>

<Step>

### Write the device client

This is the part that's actually yours: plain I/O against your vendor's native API. No MDK concepts, no base classes —
just a function that returns an object with methods your handlers will call.

`lib/device-client.js`, modeled on
[`demo-worker/plugin/lib/device-client.js`][demo-worker-client]:

```js
"use strict";

function createClient({ host, port, timeoutMs = 5000 }) {
  const base = `http://${host || "127.0.0.1"}:${port}`;

  const call = async (path, opts = {}) => {
    try {
      const res = await fetch(base + path, {
        ...opts,
        signal: opts.signal || AbortSignal.timeout(timeoutMs),
      });
      const body = await res.json();
      if (!res.ok || body.ok === false) {
        throw new Error(body.error || `ERR_DEVICE_CALL_FAILED: ${res.status}`);
      }
      return body;
    } catch (err) {
      if (err.name === "TimeoutError")
        throw new Error(`ERR_DEVICE_TIMEOUT: ${path}`);
      throw err;
    }
  };

  return {
    getSummary: () => call("/api/v1/summary"),
    reboot: () => call("/api/v1/reboot", { method: "POST" }),
    setPowerMode: (mode) =>
      call("/api/v1/power-mode", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode }),
      }),
  };
}

module.exports = { createClient };
```

Whatever your device speaks — HTTP+digest auth, Modbus TCP, MQTT, a binary serial protocol — it lives entirely in this
one file. Everything downstream only ever calls the methods this returns.

Use a finite timeout for every device operation and propagate cancellation when the underlying client supports it.
Retry idempotent telemetry reads only when the device protocol makes that safe, with bounded exponential backoff and
structured logging owned by the host process. Do **not** automatically retry physical commands: a timeout can mean
the command succeeded but its response was lost, so retrying can duplicate the operation.

</Step>

<Step>

### Declare the contract

`mdk-contract.json` is the static source of truth for what telemetry your Worker reports, what commands it accepts,
and the semantic context an AI agent or human operator needs to use it safely. The
[formal JSON Schema][contract-schema] describes this handler-bearing source contract.
Runtime device IDs and connection config belong to the host process and are reported dynamically during identity
registration; they are deliberately not embedded in the plugin contract.

`plugin/mdk-contract.json`:

```json
{
  "metadata": {
    "provider": "vendor",
    "deviceFamily": "miner",
    "brand": "Vendor",
    "modelsSupported": ["VENDOR_Q1"],
    "overview": "Controls Vendor miners running firmware v1's HTTP JSON API. Operations affect physical hardware — prioritize thermal safety."
  },
  "capabilities": {
    "telemetry": [
      {
        "name": "hashrate_rt",
        "unit": "TH/s",
        "type": "number",
        "handler": "src/telemetry/hashrate-rt.js",
        "description": "Real-time hashrate from /api/v1/summary."
      },
      {
        "name": "power",
        "unit": "W",
        "type": "number",
        "handler": "src/telemetry/power.js",
        "description": "Current power draw."
      },
      {
        "name": "temperature",
        "unit": "C",
        "type": "number",
        "handler": "src/telemetry/temperature.js",
        "description": "Hash board temperature. Above 85C requires intervention."
      }
    ],
    "commands": [
      {
        "name": "reboot",
        "handler": "src/commands/reboot.js",
        "description": "Restarts the miner controller.",
        "constraints": "Do not call more than once per 5 minutes.",
        "params": []
      },
      {
        "name": "setPowerMode",
        "handler": "src/commands/set-power-mode.js",
        "description": "Changes the power mode.",
        "params": [
          {
            "name": "mode",
            "type": "string",
            "required": true,
            "enum": ["eco", "normal", "high"]
          }
        ]
      }
    ],
    "health": {
      "supportedStates": ["OK", "DEGRADED", "OFFLINE"],
      "alerts": ["alert.overheat"],
      "troubleshooting": [
        "If alert.overheat, verify fan speeds and ambient temperature before rebooting."
      ]
    },
    "errors": {
      "ERR_MODE_REQUIRED": "The requesting client omitted the required power mode.",
      "ERR_MODE_TYPE": "The supplied power mode was not a string.",
      "ERR_BAD_POWER_MODE": "The supplied power mode is not allowed or the firmware rejected it.",
      "ERR_COMMAND_COOLDOWN": "The command was issued before its declared cooldown elapsed.",
      "ERR_COMMAND_IN_PROGRESS": "A command of this type is already running for the device.",
      "ERR_DEVICE_TIMEOUT": "The device operation exceeded its configured timeout.",
      "ERR_DEVICE_CALL_FAILED": "The v1 HTTP API call failed or returned an error."
    }
  }
}
```

A few fields worth calling out because they aren't just documentation:

- `description` is read by AI agents as the semantic boundary for that field — put the actual constraint in it (e.g.
  _"Above 85C requires intervention"_), not just a label.
- `params`, `enum`, numeric ranges, and `constraints` are published metadata; `WorkerRuntime` normalizes positional
  parameters but does not validate or enforce them. The command handler must reject missing, wrong-type, out-of-range,
  or disallowed values with stable `ERR_*` failures and enforce every declared cooldown.
- `errors` maps your device's error codes to human-readable text; throw `Error` messages that contain these codes so
  operators and agents can look them up.
- `health.alerts` is optional because a plugin without an alerting layer must not invent alerts. `metadata`,
  `capabilities.telemetry`, `capabilities.commands`, `capabilities.health.supportedStates`, and
  `capabilities.errors` are publication/catalogue requirements. At runtime, the current loader's minimum is looser:
  it requires `metadata` and `capabilities` objects plus valid handler entries. Treat the schema as the partner
  publication contract and the loader checks as fail-fast runtime validation, not two alternative formats.

</Step>

<Step>

### Write the telemetry and command handlers

Every `handler` path in the contract resolves (relative to the plugin's directory) to a function with a fixed
signature. The plugin loader `require()`s every declared handler eagerly at construction time — a missing file, a
non-function export, or a duplicate name throws immediately, before your Worker ever starts
(`ERR_PLUGIN_HANDLER_NOT_FOUND`). **Every entry in `capabilities.telemetry` and `capabilities.commands` needs a
matching file** — declaring `power` / `temperature` / `reboot` in the contract without writing those handlers will
fail as soon as the host process constructs `WorkerRuntime`.

**Telemetry handler** — `async (ctx, params) => value`. `ctx` is `{ deviceId, device, config, services }`. The context
object is shallow-frozen: handlers cannot replace its four top-level properties, but nested objects are not made
immutable. The host owns `services`, the plugin's `connect()` result owns `device`, and the host owns `config`;
handlers should treat `config` as read-only and mutate device state only through the device client's explicit
methods. One file per telemetry field from Step 3:

`plugin/src/telemetry/hashrate-rt.js`:

```js
"use strict";

module.exports = async (ctx) => (await ctx.device.getSummary()).hashrate_ths;
```

`plugin/src/telemetry/power.js`:

```js
"use strict";

module.exports = async (ctx) => (await ctx.device.getSummary()).power_w;
```

`plugin/src/telemetry/temperature.js`:

```js
"use strict";

module.exports = async (ctx) => (await ctx.device.getSummary()).board_temp_c;
```

**Command handler** — `async (ctx, params) => result`. Return value becomes `payload.result`; a thrown `Error` becomes
`{ status: 'FAILED', error: err.message }` in the response — this is how your `errors` map in the contract actually
reaches the requesting client. One file per command from Step 3:

`plugin/src/commands/reboot.js`:

```js
"use strict";

const COOLDOWN_MS = 5 * 60 * 1000;
const policyByDevice = new Map();

function audit(ctx, outcome, errorCode) {
  console.info(
    JSON.stringify({
      event: "physical_command",
      command: "reboot",
      deviceId: ctx.deviceId,
      outcome,
      ...(errorCode ? { errorCode } : {}),
    }),
  );
}

function stableErrorCode(err) {
  const match = /ERR_[A-Z0-9_]+/.exec(err && err.message);
  return match ? match[0] : "ERR_DEVICE_CALL_FAILED";
}

module.exports = async (ctx) => {
  const now = Date.now();
  const policy = policyByDevice.get(ctx.deviceId) || {
    lastAttemptAt: 0,
    running: false,
  };

  if (policy.running) {
    audit(ctx, "rejected", "ERR_COMMAND_IN_PROGRESS");
    throw new Error("ERR_COMMAND_IN_PROGRESS: reboot");
  }

  const remaining = COOLDOWN_MS - (now - policy.lastAttemptAt);
  if (remaining > 0) {
    audit(ctx, "rejected", "ERR_COMMAND_COOLDOWN");
    throw new Error(`ERR_COMMAND_COOLDOWN: reboot ${remaining}ms`);
  }

  // Record the attempt before device I/O. A failed or timed-out reboot still
  // consumes the cooldown because the device may have accepted the command.
  policy.lastAttemptAt = now;
  policy.running = true;
  policyByDevice.set(ctx.deviceId, policy);
  audit(ctx, "started");
  try {
    const result = await ctx.device.reboot();
    audit(ctx, "succeeded");
    return result;
  } catch (err) {
    audit(ctx, "failed", stableErrorCode(err));
    throw err;
  } finally {
    policy.running = false;
  }
};
```

`plugin/src/commands/set-power-mode.js`:

```js
"use strict";

const ALLOWED_MODES = new Set(["eco", "normal", "high"]);

function audit(ctx, outcome, errorCode) {
  console.info(
    JSON.stringify({
      event: "physical_command",
      command: "setPowerMode",
      deviceId: ctx.deviceId,
      outcome,
      ...(errorCode ? { errorCode } : {}),
    }),
  );
}

function stableErrorCode(err) {
  const match = /ERR_[A-Z0-9_]+/.exec(err && err.message);
  return match ? match[0] : "ERR_DEVICE_CALL_FAILED";
}

function reject(ctx, code) {
  audit(ctx, "rejected", code);
  throw new Error(code);
}

module.exports = async (ctx, params) => {
  if (!params || params.mode === undefined) reject(ctx, "ERR_MODE_REQUIRED");
  if (typeof params.mode !== "string") reject(ctx, "ERR_MODE_TYPE");
  if (!ALLOWED_MODES.has(params.mode)) reject(ctx, "ERR_BAD_POWER_MODE");

  audit(ctx, "started");
  try {
    const result = await ctx.device.setPowerMode(params.mode);
    audit(ctx, "succeeded");
    return result;
  } catch (err) {
    audit(ctx, "failed", stableErrorCode(err));
    throw err;
  }
};
```

For a numeric parameter declared with `"min": 0, "max": 100`, enforce both type and range explicitly and add both
codes to `capabilities.errors`:

```js
if (typeof params.percent !== "number" || !Number.isFinite(params.percent)) {
  throw new Error("ERR_PERCENT_TYPE");
}
if (params.percent < 0 || params.percent > 100)
  throw new Error("ERR_PERCENT_RANGE");
```

The maps above are deliberately process-local teaching state. If a physical cooldown must survive restarts or multiple
Worker hosts, store `lastAttemptAt` in process-owned persistent storage and update it atomically before device I/O.
The JSON audit lines demonstrate the minimum event shape, including rejected and failed outcomes; production hosts
must send these events to a durable audit sink. Actor identity and request correlation are owned by the authenticated
Gateway/control plane because they are not currently present in the handler context. Never include credentials or raw
device responses in audit events.

> [!IMPORTANT]
> Telemetry routing uses `query.type`, not the contract entry's return `type`. A request with
> `{ query: { type: "metrics" } }` invokes **every** telemetry handler and returns
> `{ metrics: { hashrate_rt: value, history: value, ... } }`; each handler error is isolated as
> `{ error: "..." }` under that key. A request with `{ query: { type: "history", limit: 20 } }` invokes only the
> telemetry entry named `history` and returns `{ name: "history", value }` or `{ error }`. The contract's
> `"type": "array"` describes the handler's returned value; it does not create the channel. A history-like handler is
> still included in the default `metrics` loop under the current runtime, so keep it bounded and inexpensive or
> change the runtime contract before relying on different behavior. Keep named-channel handlers defensive as callers
> can invoke them directly with untrusted query fields.

</Step>

<Step>

### Assemble the Worker plugin

The [plugin][plugins-readme] is the object `WorkerRuntime` is constructed with: the contract, the plugin's own directory (so handler
paths resolve), and a `connect` function that turns one device's config into the `device` object every handler sees.
An optional `disconnect` runs on `stop()`.

`plugin/index.js`, modeled on [`demo-worker/plugin/index.js`][demo-worker-plugin]:

```js
"use strict";

const { createClient } = require("../lib/device-client");

module.exports = {
  contract: require("./mdk-contract.json"),
  dir: __dirname,

  connect: async (config, { deviceId }) => {
    const device = createClient(config);
    // Probe once so an unreachable device is held offline from boot rather
    // than surfacing a connection error on every telemetry pull.
    await device.getSummary();
    return device;
  },

  // disconnect: async (device, { deviceId }) => { /* optional cleanup */ }
  // If you uncomment disconnect, put a comma after the connect function above.
};
```

A device whose `connect()` throws is held `offline` — requests to it return `ERR_DEVICE_UNAVAILABLE` — without taking
down the runtime or its sibling devices. The current runtime has no reconnect loop: it calls `connect()` during
`runtime.start()` only. The host process owns backoff, logging, and recovery policy; today, bringing an initially
offline device online requires stopping and restarting that Worker host after restoring connectivity.

</Step>

<Step>

### Build a mock device

Ship a standalone fake of your vendor's native API so anyone (including your own CI) can develop and test against your
Worker without real hardware. It should know nothing about MDK — it's the same surface a real device on the LAN would
present.

`mock/server.js`, modeled on [`demo-worker/mock/server.js`][demo-worker-mock]:

```js
"use strict";

const http = require("http");

function createServer({ host, port, hashrateThs, powerW }) {
  const state = {
    hashrateThs: hashrateThs || 180,
    powerW: powerW || 3400,
    boardTempC: 62,
    powerMode: "normal",
  };

  const server = http.createServer((req, res) => {
    const reply = (code, body) => {
      res.writeHead(code, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    };

    if (req.method === "GET" && req.url === "/api/v1/summary") {
      return reply(200, {
        hashrate_ths: state.hashrateThs,
        power_w: state.powerW,
        board_temp_c: state.boardTempC,
        power_mode: state.powerMode,
      });
    }
    if (req.method === "POST" && req.url === "/api/v1/reboot") {
      return reply(200, { ok: true, rebooting: true });
    }
    if (req.method === "POST" && req.url === "/api/v1/power-mode") {
      let buf = "";
      req.on("data", (c) => {
        buf += c;
      });
      req.on("end", () => {
        const { mode } = JSON.parse(buf || "{}");
        state.powerMode = mode;
        reply(200, { ok: true, power_mode: mode });
      });
      return;
    }
    reply(404, { ok: false, error: "ERR_NOT_FOUND" });
  });

  server.listen(port, host || "127.0.0.1");
  return {
    server,
    state,
    exit() {
      server.close();
    },
  };
}

module.exports = { createServer };
```

The mock must cover every device-client path your handlers call — summary fields for each telemetry handler, plus
`/api/v1/reboot` for the reboot command (Step 2's `createClient` already defines that method).

</Step>

<Step>

### Test the plugin against the mock

Drive `plugin.connect()` and the handler modules directly against the mock — this exercises your whole plugin
(connection probing, telemetry translation, command dispatch, error mapping) with **no** `WorkerRuntime` in the loop,
so it needs nothing beyond what you've already written in Steps 1–7. `demo-worker`'s own
[`tests/unit/plugin.test.js`][demo-worker-plugin-test] is the complete worked example of
this style.

```js
"use strict";

const test = require("brittle");
const plugin = require("../../plugin");
const hashrateRt = require("../../plugin/src/telemetry/hashrate-rt");
const reboot = require("../../plugin/src/commands/reboot");
const setPowerMode = require("../../plugin/src/commands/set-power-mode");
const vendorMock = require("../../mock/server");

test("telemetry and commands work against the mock", async (t) => {
  const auditEvents = [];
  const originalInfo = console.info;
  console.info = (line) => auditEvents.push(JSON.parse(line));
  t.teardown(() => {
    console.info = originalInfo;
  });

  const mock = vendorMock.createServer({ port: 9001, hashrateThs: 200 });
  t.teardown(() => mock.exit());

  const device = await plugin.connect(
    { host: "127.0.0.1", port: 9001 },
    { deviceId: "vendor-0" },
  );
  const ctx = Object.freeze({
    deviceId: "vendor-0",
    device,
    config: {},
    services: null,
  });

  t.is(await hashrateRt(ctx), 200, "hashrate_rt reads the mock");

  const result = await setPowerMode(ctx, { mode: "eco" });
  t.is(result.power_mode, "eco", "command reaches the mock");
  await t.exception(() => setPowerMode(ctx, {}), /ERR_MODE_REQUIRED/);
  await t.exception(() => setPowerMode(ctx, { mode: 1 }), /ERR_MODE_TYPE/);
  await t.exception(
    () => setPowerMode(ctx, { mode: "turbo" }),
    /ERR_BAD_POWER_MODE/,
  );

  const failingCtx = Object.freeze({
    ...ctx,
    deviceId: "vendor-command-failure",
    device: {
      setPowerMode: async () => {
        throw new Error("ERR_DEVICE_CALL_FAILED");
      },
    },
  });
  await t.exception(
    () => setPowerMode(failingCtx, { mode: "eco" }),
    /ERR_DEVICE_CALL_FAILED/,
  );

  t.ok(
    auditEvents.some(
      (e) => e.command === "setPowerMode" && e.outcome === "rejected",
    ),
  );
  t.ok(
    auditEvents.some(
      (e) => e.command === "setPowerMode" && e.outcome === "failed",
    ),
  );
});

test("reboot enforces concurrency and cooldown after every attempt", async (t) => {
  let release;
  const pending = new Promise((resolve) => {
    release = resolve;
  });
  const concurrentCtx = Object.freeze({
    deviceId: "vendor-concurrent",
    device: { reboot: () => pending },
    config: {},
    services: null,
  });

  const first = reboot(concurrentCtx);
  await t.exception(() => reboot(concurrentCtx), /ERR_COMMAND_IN_PROGRESS/);
  release({ ok: true });
  await first;
  await t.exception(() => reboot(concurrentCtx), /ERR_COMMAND_COOLDOWN/);

  const failingCtx = Object.freeze({
    deviceId: "vendor-failing",
    device: {
      reboot: async () => {
        throw new Error("ERR_DEVICE_CALL_FAILED");
      },
    },
    config: {},
    services: null,
  });
  await t.exception(() => reboot(failingCtx), /ERR_DEVICE_CALL_FAILED/);
  await t.exception(() => reboot(failingCtx), /ERR_COMMAND_COOLDOWN/);
});
```

Cover at minimum: a telemetry handler reading a live value from the mock, a command reaching the mock and returning a
result, required/type/range/enum validation, concurrent-command rejection, cooldown after successful and failed
attempts, `connect()` throwing when the mock is unreachable, a firmware-side error surfacing with your contract's
error code, and structured audit events containing rejected and failed outcomes. Production integration tests should
also verify that the host forwards those events to its durable audit sink.

</Step>

<Step>

### Write a README

Document, for your own package's users: what hardware/firmware it targets, how to run the bundled mock, and a link to
your `mdk-contract.json` as the field reference. You don't need to follow this monorepo's internal `USAGE.md` +
`examples/` documentation-catalogue convention
([described here][agent-ready-sdk]) — that exists to feed this repo's own
generated hardware catalogue and docs-sync tooling, and doesn't apply to a package living outside it.

</Step>

</Steps>

## Conformance checklist

Before calling your Worker done:

- [ ] `mdk-contract.json` validates against
      [`mdk-contract.schema.json`][contract-schema]; every telemetry/command entry has
      a unique name and a CommonJS handler path that resolves to a function
- [ ] Every `description` states the actual semantic boundary, not just a label — this is AI-reasoning surface, not
      decoration
- [ ] Every device I/O operation has a finite timeout; safe read retries are bounded; physical writes are not
      automatically retried
- [ ] Every command validates required values, types, ranges/enums, and declared cooldowns in the handler and maps
      failures to stable codes in `capabilities.errors`
- [ ] Production command paths authenticate, authorize, rate-limit, optionally approve, and audit physical writes
- [ ] Offline-at-start behavior and the host's restart/recovery policy are documented
- [ ] The mock lets a new partner developer run the Worker with zero real hardware
- [ ] Tests cover: a telemetry pull, a command that targets one device without touching its siblings, and a
      validation/device error surfacing as `status: 'FAILED'`
- [ ] A [Kernel-mediated test][test-a-worker] asserts the Worker reaches `READY`, exposes its device IDs, and serves
      telemetry through `createMdkClient`
- [ ] `npm run lint` and your test suite are wired into your own CI

## Troubleshooting

Plugin loading may fail synchronously during `new WorkerRuntime(plugin, opts)`:

| Error                                                                             | Diagnostic and remediation                                      |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `ERR_PLUGIN_REQUIRED`                                                             | The first argument is absent or not an object; pass the exported Worker Plugin |
| `ERR_PLUGIN_CONNECT_NOT_FUNCTION`                                                 | Export `connect(config, { deviceId })` as a function            |
| `ERR_PLUGIN_DISCONNECT_NOT_FUNCTION`                                              | Remove `disconnect` or export it as a function                  |
| `ERR_PLUGIN_DIR_MISSING`                                                          | Set `plugin.dir` to a non-empty absolute directory such as `__dirname` |
| `ERR_PLUGIN_CONTRACT_MISSING`                                                     | Export the parsed `mdk-contract.json` as `plugin.contract`      |
| `ERR_PLUGIN_CONTRACT_METADATA_MISSING`                                            | `contract.metadata` is missing or not an object                 |
| `ERR_PLUGIN_CONTRACT_CAPABILITIES_MISSING`                                        | `contract.capabilities` is missing or not an object             |
| `ERR_PLUGIN_SECTION_NOT_ARRAY: <section>`                                         | `capabilities.telemetry` or `capabilities.commands` must be an array |
| `ERR_PLUGIN_ENTRY_NAME_MISSING: <section>`                                        | Give every telemetry/command entry a non-empty string `name` |
| `ERR_PLUGIN_HANDLER_MISSING: <section>.<name>`                                    | Add that entry's relative `handler` path |
| `ERR_PLUGIN_HANDLER_NOT_FOUND: <section>.<name>: <resolved path>: <nested error>` | Verify the displayed resolved path is relative to `plugin.dir`. Preserve and inspect the nested module error: the file may exist while one of its own imports is missing or incompatible |
| `ERR_PLUGIN_HANDLER_NOT_FUNCTION: <section>.<name>: <resolved path>`              | The CommonJS module must assign a function to `module.exports`  |
| `ERR_PLUGIN_DUPLICATE_NAME: <section>.<name>`                                     | Rename or remove the duplicate entry in that section            |

These fire only once a host process constructs `WorkerRuntime` with your plugin — for errors from that point on
(runtime construction, Kernel registration, live requests), see [Troubleshooting][test-a-worker] in Test a Worker with MDK.

## Next steps

- Test your new [Worker's integration with MDK][test-a-worker]
- Understand the [security boundaries][security-boundaries]

Understand the end-user experience of controlling and monitoring your device via the Worker:

- Build a [minimal dashboard][minimal-dashboard] around one Worker
- Run the [full-site example][full-site] with the supported Worker fleet
- Connect an [AI agent via the MCP server][mcp-server] to query and command your Workers

## Links

[demo-worker]: ../../../backend/workers/samples/demo-worker/index.js
<!-- docs@tether.io: demo-worker → https://github.com/tetherto/mdk/blob/main/backend/workers/samples/demo-worker/index.js -->

[architecture]: ../../concepts/architecture.md
<!-- docs@tether.io: architecture → concepts/architecture -->

[install-pattern]: ../../../backend/workers/docs/install-pattern.md
<!-- docs@tether.io: install-pattern → https://github.com/tetherto/mdk/blob/main/backend/workers/docs/install-pattern.md -->

[workers-concept]: ../../concepts/stack/workers.md#discovery-model
<!-- docs@tether.io: workers-concept → concepts/stack/workers -->

[demo-worker-client]: ../../../backend/workers/samples/demo-worker/plugin/lib/device-client.js
<!-- docs@tether.io: demo-worker-client → https://github.com/tetherto/mdk/blob/main/backend/workers/samples/demo-worker/plugin/lib/device-client.js -->

[contract-schema]: ../../../backend/core/mdk-worker/mdk-contract.schema.json
<!-- docs@tether.io: contract-schema → https://github.com/tetherto/mdk/blob/main/backend/core/mdk-worker/mdk-contract.schema.json -->

[plugins-readme]: ../../../backend/core/plugins/README.md
<!-- docs@tether.io: plugins-readme → https://github.com/tetherto/mdk/blob/main/backend/core/plugins/README.md -->

[demo-worker-plugin]: ../../../backend/workers/samples/demo-worker/plugin/index.js
<!-- docs@tether.io: demo-worker-plugin → https://github.com/tetherto/mdk/blob/main/backend/workers/samples/demo-worker/plugin/index.js -->

[demo-worker-mock]: ../../../backend/workers/samples/demo-worker/mock/server.js
<!-- docs@tether.io: demo-worker-mock → https://github.com/tetherto/mdk/blob/main/backend/workers/samples/demo-worker/mock/server.js -->

[demo-worker-plugin-test]: ../../../backend/workers/samples/demo-worker/tests/unit/plugin.test.js
<!-- docs@tether.io: demo-worker-plugin-test → https://github.com/tetherto/mdk/blob/main/backend/workers/samples/demo-worker/tests/unit/plugin.test.js -->

[agent-ready-sdk]: ../../reference/maintainers/agent-ready-sdk.md
<!-- docs@tether.io: no parity link -->

[security-boundaries]: ../../concepts/security-boundaries.md
<!-- docs@tether.io: security-boundaries → concepts/security-boundaries -->

[test-a-worker]: test-a-worker.md
<!-- docs@tether.io: test-a-worker → guides/workers/test-a-worker -->

[minimal-dashboard]: ../../tutorials/quickstart/build-a-dashboard.md
<!-- docs@tether.io: minimal-dashboard → tutorials/quickstart/build-a-dashboard -->

[full-site]: ../../../examples/full-site/README.md
<!-- docs@tether.io: full-site → https://github.com/tetherto/mdk/blob/main/examples/full-site/README.md -->

[mcp-server]: ../../../examples/full-site/docs/mcp-server.md
<!-- docs@tether.io: mcp-server → https://github.com/tetherto/mdk/blob/main/examples/full-site/docs/mcp-server.md -->
