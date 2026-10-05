---
title: Build a third-party Worker
description: Integrate your own hardware, firmware, or data feed with MDK by shipping a Worker package from your own repo — no monorepo fork required
docs@tether_slug: guides/workers/build-a-worker
---

## TL;DR

A Worker plugin package is:

- [`mdk-contract.json`][contract-schema] at the package root
- A file at the path each contract entry's `handler` field names

## Overview

This guide is for partners who want to integrate their own hardware, firmware, or data feed with MDK by shipping a
Worker plugin package from their own public or private repository — no fork of this monorepo and no PR into
`tetherto/mdk` required.

It walks through building a Worker from scratch, end to end:

- The [device client][demo-worker-client]
- The [`mdk-contract.json`][contract-schema]
- The [handlers][worker-runtime-v2]
- The [mock][demo-worker-mock]
- The [tests][demo-worker-plugin-test]

> [!NOTE]
> Hosting the finished package (pointing [`WorkerRuntimeV2`][worker-runtime-v2] at it and registering with a live
> Kernel) is a separate concern, covered in [Test a Worker with MDK][test-a-worker]. [`demo-worker-caller`][demo-worker-caller]
> shows one host doing exactly that for this guide's own reference implementation.

A Worker plugin package is **loaded from its own directory**: [`mdk-contract.json`][contract-schema] declares each handler by path, `src/`
holds the handler modules, and the host points `WorkerRuntimeV2` at the directory. The package ships only its contract
and handler files; `WorkerRuntimeV2` loads them directly rather than requiring an exported module. Handlers are plain
`(params)` functions that read their device from the ambient `@tetherto/mdk-worker/device` module. See
[`worker-runtime-v2.js`][worker-runtime-v2] for the full shape of that module.

This guide generalizes one real, runnable reference implementation already in this repo:
[`backend/workers/samples/demo-worker/`][demo-worker]. It proves this pattern works with **zero**
dependency on this monorepo's optional worker-infra services (provisioning stores, alert templates, stats
aggregation), just [`WorkerRuntimeV2`][worker-runtime-v2] and the directory-loaded Worker plugin shape.
This guide adds production-oriented validation, recovery, and security boundaries that the deliberately small sample does not implement.

> [!NOTE]
> This guide uses **partner integration** for the complete integration, **Worker plugin package** for the static
> contract and handlers, **host process** for the Node.js process that owns [`WorkerRuntimeV2`][worker-runtime-v2], and **device ID** for a
> runtime device identity.

## What you get

```text
your-worker-repo/
  package.json
  mdk-contract.json        # the engineering + AI-context contract
  src/
    client.js              # plain I/O against your vendor's native API, no MDK concepts
    telemetry/*.js         # one handler per telemetry field
    commands/*.js          # one handler per command
  mock/
    server.js              # a standalone fake of the vendor's device API
  tests/
    unit/handlers.test.js  # drives loadContract() + createInstance() against the mock
                            # (no WorkerRuntimeV2 involved)
```

This tree is [`demo-worker`][demo-worker]'s own layout with its vendor name replaced by the placeholder `vendor`:
`demo-worker` itself builds and tests with **zero** dependency on `WorkerRuntimeV2`, and your package does too.

> [!NOTE]
> The `src/telemetry/`, `src/commands/`, and `client.js` naming above is a convention, **not** a requirement.
> [`WorkerRuntimeV2`][worker-runtime-v2] only requires two things: [`mdk-contract.json`][contract-schema] at the
> package root, and a real file at whatever path each contract entry's `handler` field names. Following the same
> layout as `demo-worker` just keeps your package legible to anyone who has read another MDK Worker.

## Prerequisites

- Node.js `>=24` (all MDK core packages declare this `engines` constraint)
- npm 11 [(< 12)][npm-version]
- A device or firmware API you can talk to from Node — HTTP, TCP, Modbus, MQTT, serial, whatever your hardware speaks
- Comfort with plain async JS — no MDK-specific framework knowledge is required to write the device client
- A basic understanding of [how MDK works][architecture], the [Worker install pattern][install-pattern], and the
  [Worker discovery model][workers-concept]

<Steps>

<Step>

### Scaffold the package

Create your own repo (or a directory inside your existing one) with a `package.json`. Pick your own npm scope (as an external
Worker provider, you publish under your own domain (not `@tetherto`)):

```json
{
  "name": "@your-org/mdk-worker-vendor",
  "version": "0.1.0",
  "description": "MDK Worker plugin for Vendor firmware v1 devices",
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

Handler files are loaded with `require()`, so set `"type": "commonjs"` or use `.cjs` files. An ESM-only package
(`"type": "module"` with `.js` handlers) is not a supported handler-loading path today. `brittle` and `standard` are
the repository's test and lint tools; substitute your own tooling if you prefer.

Your own contract-level tests (`loadContract`, `createInstance`, see Step 7) need `@tetherto/mdk-worker` too, but it
is **not yet published to the npm registry**. Install it the same way [Test a Worker with MDK][test-a-worker]'s
[Install MDK step][test-a-worker-install] does:

```bash
npm install github:tetherto/mdk#main
(cd node_modules/@tetherto/mdk && npm install)
```

This adds `"@tetherto/mdk": "github:tetherto/mdk#main"` to your `dependencies` and installs the whole monorepo under
`node_modules/@tetherto/mdk` (its own root `package.json` name); there is no package literally named
`@tetherto/mdk-worker` in `node_modules`. Step 7's test file accounts for this: it requires
`@tetherto/mdk/backend/core/mdk-worker`, the same deep path every in-repo Worker already uses. The host process that
constructs `WorkerRuntimeV2` and brings its transport dependencies (`@hyperswarm/rpc`, `hyperswarm`, `hyperdht`) is a
separate package, not this one.

> [!NOTE]
> The ambient `@tetherto/mdk-worker/device` import your handler files use (Step 2 onward) is unaffected by any of
> this: `WorkerRuntimeV2` intercepts that exact string before Node resolves it, so it works whether or not
> `@tetherto/mdk-worker` exists anywhere in `node_modules`. Only the plain `require("@tetherto/mdk-worker")` calls in
> your own test/verification scripts need the deep path above.

</Step>

<Step>

### Write the device client

This is the part that's actually yours: plain I/O against your vendor's native API. No MDK concepts, no base classes.

`WorkerRuntimeV2` loads every file your handlers require into a private module registry per device (see
[`worker-runtime-v2.js`][worker-runtime-v2]), so a client module that binds directly to its device at load time
already gets one instance per device, with no factory function and no explicit construction. It reads its device's
connection details from the ambient `@tetherto/mdk-worker/device` module: `{ id, opts, env, config, logger }`, where
`opts` is this device's own connection config and `env` is the plugin-wide block the host passed when constructing
the runtime.

> [!NOTE]
> [`createModuleContext`][create-module-context] is the primitive behind that registry: it gives each plugin instance
> its own `require` cache, so module-level state — a client constructed at load time, say — belongs to that one
> instance alone. `WorkerRuntimeV2`, the Gateway, and the MCP server each build one per plugin. `WorkerRuntime` v1 has
> no notion of per-device isolation and does not use it, which is why a v1 plugin needs an explicit `connect()`.

`src/client.js`, modeled on [`demo-worker`'s own `client.js`][demo-worker-client]:

```js
'use strict'

const { opts, env, logger } = require('@tetherto/mdk-worker/device')

logger('config received: opts=%o', opts)

const TIMEOUT_MS = opts.timeoutMs || 5000
const base = `http://${opts.host || '127.0.0.1'}:${opts.port}`
const auth = env.DEVICE_TOKEN
  ? { authorization: `Bearer ${env.DEVICE_TOKEN}` }
  : {}

const call = async (path, callOpts = {}) => {
  try {
    const res = await fetch(base + path, {
      ...callOpts,
      headers: { ...auth, ...callOpts.headers },
      signal: callOpts.signal || AbortSignal.timeout(TIMEOUT_MS)
    })
    const body = await res.json()
    if (!res.ok || body.ok === false) {
      throw new Error(body.error || `ERR_DEVICE_CALL_FAILED: ${res.status}`)
    }
    return body
  } catch (err) {
    if (err.name === 'TimeoutError') { throw new Error(`ERR_DEVICE_TIMEOUT: ${path}`) }
    throw err
  }
}

module.exports = {
  getSummary: () => call('/api/v1/summary'),
  reboot: () => call('/api/v1/reboot', { method: 'POST' }),
  setPowerMode: (mode) =>
    call('/api/v1/power-mode', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mode })
    })
}
```

Whatever your device speaks — HTTP + digest auth, Modbus TCP, MQTT, a binary serial protocol — it lives entirely in this
one file. Everything downstream only ever calls the methods this returns.

Use a finite timeout for every device operation and propagate cancellation when the underlying client supports it.
Retry idempotent telemetry reads only when the device protocol makes that safe, with bounded exponential backoff and
structured logging owned by the host process. Do **not** automatically retry physical commands: a timeout can mean
the command succeeded but its response was lost, so retrying can duplicate the operation.

> [!NOTE]
> This module loads once, when `WorkerRuntimeV2` opens this device's context, and stays loaded for the life of the
> process; nothing probes the device up front. An unreachable device does not fail at load time; the failure
> surfaces from the first handler call that actually reaches the network (see Step 4).

</Step>

<Step>

### Declare the contract

`mdk-contract.json` is the static source of truth for what telemetry your Worker reports, what commands it accepts,
and the semantic context an AI agent or human operator needs to use it safely. The
[formal JSON Schema][contract-schema] describes this handler-bearing source contract.
Runtime device IDs and connection config belong to the host process and are reported dynamically during identity
registration; they are deliberately not embedded in the plugin contract.

`mdk-contract.json`, at your package root:

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
  _"Above 85C requires intervention"_), not just a label
- `params`, `enum`, numeric ranges, and `constraints` are published metadata; `WorkerRuntimeV2` normalizes positional
  parameters but does not validate or enforce them. The command handler must reject missing, wrong-type, out-of-range,
  or disallowed values with stable `ERR_*` failures and enforce every declared cooldown.
- `errors` maps your device's error codes to human-readable text; throw `Error` messages that contain these codes so
  operators and agents can look them up
- `health.alerts` is optional because a plugin without an alerting layer must not invent alerts. `metadata`,
  `capabilities.telemetry`, `capabilities.commands`, `capabilities.health.supportedStates`, and
  `capabilities.errors` are publication/catalogue requirements. At runtime, the current loader's minimum is looser:
  it requires `metadata` and `capabilities` objects plus valid handler entries. Treat the schema as the partner
  publication contract and the loader checks as fail-fast runtime validation, not two alternative formats.

</Step>

<Step>

### Write the telemetry and command handlers

Every `handler` path in the contract resolves (relative to your package root) to a function with a fixed signature.
`WorkerRuntimeV2` resolves every declared handler path when it loads the contract, and `require()`s it per device the
first time that device's context opens. A missing file, a non-function export, or a duplicate name throws before
your Worker serves a request (see Troubleshooting). **Every entry in `capabilities.telemetry` and
`capabilities.commands` needs a matching file**: declaring `power` / `temperature` / `reboot` in the contract without
writing those handlers fails.

#### 4.1 Telemetry handler

A telemetry handler is `async (params) => value`. The handler reads its own device straight from the ambient
`@tetherto/mdk-worker/device` module, the same way `src/client.js` does in Step 2. Devices
are isolated by construction: `WorkerRuntimeV2` loads your package's files into a private module registry per
device, so `require("../client")` inside one device's handlers always resolves to that device's own client instance,
never a sibling's. One file per telemetry field from Step 3, delegating to `src/client.js`:

`src/telemetry/hashrate-rt.js`:

```js
'use strict'

const client = require('../client')

module.exports = async () => (await client.getSummary()).hashrate_ths
```

`src/telemetry/power.js`:

```js
'use strict'

const client = require('../client')

module.exports = async () => (await client.getSummary()).power_w
```

`src/telemetry/temperature.js`:

```js
'use strict'

const client = require('../client')

module.exports = async () => (await client.getSummary()).board_temp_c
```

#### 4.2 Command handler

A command handler is `async (params) => result`. Return value becomes `payload.result`; a thrown `Error` becomes
`{ status: 'FAILED', error: err.message }` in the response, which is how your `errors` map in the contract actually
reaches the requesting client. One file per command from Step 3:

`src/commands/reboot.js`:

```js
'use strict'

const { id } = require('@tetherto/mdk-worker/device')
const client = require('../client')

const COOLDOWN_MS = 5 * 60 * 1000

// Module-level, not keyed by device: WorkerRuntimeV2 loads this file into a
// private registry per device, so this state is already scoped to the one
// device this instance was built for.
let lastAttemptAt = 0
let running = false

function audit (outcome, errorCode) {
  console.info(
    JSON.stringify({
      event: 'physical_command',
      command: 'reboot',
      deviceId: id,
      outcome,
      ...(errorCode ? { errorCode } : {})
    })
  )
}

function stableErrorCode (err) {
  const match = /ERR_[A-Z0-9_]+/.exec(err && err.message)
  return match ? match[0] : 'ERR_DEVICE_CALL_FAILED'
}

module.exports = async () => {
  const now = Date.now()

  if (running) {
    audit('rejected', 'ERR_COMMAND_IN_PROGRESS')
    throw new Error('ERR_COMMAND_IN_PROGRESS: reboot')
  }

  const remaining = COOLDOWN_MS - (now - lastAttemptAt)
  if (remaining > 0) {
    audit('rejected', 'ERR_COMMAND_COOLDOWN')
    throw new Error(`ERR_COMMAND_COOLDOWN: reboot ${remaining}ms`)
  }

  // Record the attempt before device I/O. A failed or timed-out reboot still
  // consumes the cooldown because the device may have accepted the command.
  lastAttemptAt = now
  running = true
  audit('started')
  try {
    const result = await client.reboot()
    audit('succeeded')
    return result
  } catch (err) {
    audit('failed', stableErrorCode(err))
    throw err
  } finally {
    running = false
  }
}
```

`src/commands/set-power-mode.js`:

```js
'use strict'

const { id } = require('@tetherto/mdk-worker/device')
const client = require('../client')

const ALLOWED_MODES = new Set(['eco', 'normal', 'high'])

function audit (outcome, errorCode) {
  console.info(
    JSON.stringify({
      event: 'physical_command',
      command: 'setPowerMode',
      deviceId: id,
      outcome,
      ...(errorCode ? { errorCode } : {})
    })
  )
}

function stableErrorCode (err) {
  const match = /ERR_[A-Z0-9_]+/.exec(err && err.message)
  return match ? match[0] : 'ERR_DEVICE_CALL_FAILED'
}

function reject (code) {
  audit('rejected', code)
  throw new Error(code)
}

module.exports = async (params) => {
  if (!params || params.mode === undefined) reject('ERR_MODE_REQUIRED')
  if (typeof params.mode !== 'string') reject('ERR_MODE_TYPE')
  if (!ALLOWED_MODES.has(params.mode)) reject('ERR_BAD_POWER_MODE')

  audit('started')
  try {
    const result = await client.setPowerMode(params.mode)
    audit('succeeded')
    return result
  } catch (err) {
    audit('failed', stableErrorCode(err))
    throw err
  }
}
```

For a numeric parameter declared with `"min": 0, "max": 100`, enforce both type and range explicitly and add both
codes to `capabilities.errors`:

```js
if (typeof params.percent !== 'number' || !Number.isFinite(params.percent)) {
  throw new Error('ERR_PERCENT_TYPE')
}
if (params.percent < 0 || params.percent > 100) throw new Error('ERR_PERCENT_RANGE')
```

`lastAttemptAt` and `running` above are deliberately process-local teaching state, scoped to one device by the
runtime's per-device module registry rather than by a `Map` keyed on device ID. If a physical cooldown must survive
restarts or multiple Worker hosts, store `lastAttemptAt` in process-owned persistent storage and update it atomically
before device I/O; [`demo-worker`'s own `db.js`][demo-worker-db] shows the same per-device-instance pattern applied
to a local SQLite file. The JSON audit lines demonstrate the minimum event shape, including rejected and
failed outcomes; production hosts must send these events to a durable audit sink. Actor identity and request
correlation are owned by the authenticated Gateway/control plane because they are not currently present in the
handler arguments. Never include credentials or raw device responses in audit events.

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

[`WorkerRuntimeV2`][worker-runtime-v2] also auto-registers a builtin `health` channel on every device, with no contract
entry required: a plugin that doesn't declare its own `health` telemetry handler still answers
`{ query: { type: "health" } }` with `{ status: "OK", id, opts, env, config, workerId }`. Declaring a `health` entry in
[`capabilities.telemetry`][contract-schema] yourself overrides the builtin with your own handler.

```js
await mdkClient.pullTelemetry(deviceId, 'health')
// → { status: 'OK', id: 'wm-001', opts: {...}, env: {...}, config: {...}, workerId: '...' }
```

</Step>

<Step>

### Verify the plugin loads

There is nothing left to assemble: `mdk-contract.json` at your package root, together with the handler files it
declares under `src/`, is the complete, loadable Worker plugin. No index file exports it, and nothing turns it into
an object for a runtime to consume; a host points `WorkerRuntimeV2` straight at your package directory.

That does mean a broken handler wiring has nowhere to surface until something tries to load the directory. Catch it
yourself with [`loadContract`][mdk-worker-index], the same function `WorkerRuntimeV2` calls internally:

```js
'use strict'

const { loadContract } = require('@tetherto/mdk/backend/core/mdk-worker')

const loaded = loadContract(__dirname)
console.log(loaded.publishedContract) // handler paths stripped, the shape Kernel receives
```

`loadContract` resolves every declared `handler` path on disk but never executes it. A missing file, a missing
`handler` field, or a duplicate name throws immediately (see Troubleshooting). It cannot yet catch a handler file
that exists but fails to load or does not export a function: that only happens once a device instance is built from
it, which is what Step 7's tests exercise per handler.

> [!NOTE]
> Every declared device reports `online` immediately; an unreachable one surfaces as an error inside the telemetry
> payload rather than holding the device `offline`. Whatever a handler module opens at load time (a socket, a file
> handle) lives until the process exits; nothing closes it automatically.

</Step>

<Step>

### Build a mock device

Ship a standalone fake of your vendor's native API so anyone (including your own CI) can develop and test against your
Worker without real hardware. It should know nothing about MDK; it's the same surface a real device on the LAN would
present.

`mock/server.js`, modeled on [`demo-worker/mock/server.js`][demo-worker-mock]:

```js
'use strict'

const http = require('http')

function createServer ({ host, port, hashrateThs, powerW }) {
  const state = {
    hashrateThs: hashrateThs || 180,
    powerW: powerW || 3400,
    boardTempC: 62,
    powerMode: 'normal'
  }

  const server = http.createServer((req, res) => {
    const reply = (code, body) => {
      res.writeHead(code, { 'content-type': 'application/json' })
      res.end(JSON.stringify(body))
    }

    if (req.method === 'GET' && req.url === '/api/v1/summary') {
      return reply(200, {
        hashrate_ths: state.hashrateThs,
        power_w: state.powerW,
        board_temp_c: state.boardTempC,
        power_mode: state.powerMode
      })
    }
    if (req.method === 'POST' && req.url === '/api/v1/reboot') {
      return reply(200, { ok: true, rebooting: true })
    }
    if (req.method === 'POST' && req.url === '/api/v1/power-mode') {
      let buf = ''
      req.on('data', (c) => {
        buf += c
      })
      req.on('end', () => {
        const { mode } = JSON.parse(buf || '{}')
        state.powerMode = mode
        reply(200, { ok: true, power_mode: mode })
      })
      return
    }
    reply(404, { ok: false, error: 'ERR_NOT_FOUND' })
  })

  server.listen(port, host || '127.0.0.1')
  return {
    server,
    state,
    exit () {
      server.close()
    }
  }
}

module.exports = { createServer }
```

The mock must cover every device-client path your handlers call: summary fields for each telemetry handler, plus
`/api/v1/reboot` for the reboot command (Step 2's `src/client.js` already defines that method).

</Step>

<Step>

### Test the plugin against the mock

Drive [`loadContract`][mdk-worker-index] and [`createInstance`][mdk-worker-index] directly against the mock. This
exercises your whole plugin (telemetry translation, command dispatch, error mapping) with **no** `WorkerRuntimeV2`
in the loop, so it needs nothing beyond what you've already written in Steps 1–6. `demo-worker`'s own
[`tests/unit/handlers.test.js`][demo-worker-plugin-test] is the complete worked example of this style; the harness
below is the same pattern trimmed to this guide's contract.

```js
'use strict'

const path = require('path')
const test = require('brittle')
const { loadContract, createInstance } = require('@tetherto/mdk/backend/core/mdk-worker')
const vendorMock = require('../../mock/server')

const PKG_DIR = path.join(__dirname, '..', '..')

function buildInstance ({ port, deviceId }) {
  return createInstance({
    dir: PKG_DIR,
    entries: loadContract(PKG_DIR).entries,
    device: { id: deviceId, opts: { host: '127.0.0.1', port }, env: {}, config: {} }
  })
}

test('directory-loaded plugin: every contract entry has a working handler module', (t) => {
  const loaded = loadContract(PKG_DIR)
  t.is(loaded.entries.telemetry.size, 3)
  t.is(loaded.entries.commands.size, 2)
  for (const entry of loaded.publishedContract.capabilities.telemetry) {
    t.is(entry.handler, undefined, `${entry.name} handler path stripped from published contract`)
  }

  // The boot rule proves out per instance: every resolved handler path
  // loads to a function once bound to a device.
  const instance = createInstance({
    dir: PKG_DIR,
    entries: loaded.entries,
    device: { id: 'vendor-boot', opts: { host: '127.0.0.1', port: 1 }, env: {}, config: {} }
  })
  for (const fn of instance.telemetry.values()) t.is(typeof fn, 'function')
  for (const fn of instance.commands.values()) t.is(typeof fn, 'function')
})

test('telemetry and commands work against the mock', async (t) => {
  const auditEvents = []
  const originalInfo = console.info
  console.info = (line) => auditEvents.push(JSON.parse(line))
  t.teardown(() => {
    console.info = originalInfo
  })

  const mock = vendorMock.createServer({ port: 9001, hashrateThs: 200 })
  t.teardown(() => mock.exit())

  const instance = buildInstance({ port: 9001, deviceId: 'vendor-0' })

  t.is(await instance.telemetry.get('hashrate_rt')(), 200, 'hashrate_rt reads the mock')

  const result = await instance.commands.get('setPowerMode')({ mode: 'eco' })
  t.is(result.power_mode, 'eco', 'command reaches the mock')
  await t.exception(() => instance.commands.get('setPowerMode')({}), /ERR_MODE_REQUIRED/)
  await t.exception(() => instance.commands.get('setPowerMode')({ mode: 1 }), /ERR_MODE_TYPE/)
  await t.exception(
    () => instance.commands.get('setPowerMode')({ mode: 'turbo' }),
    /ERR_BAD_POWER_MODE/
  )

  t.ok(
    auditEvents.some(
      (e) => e.command === 'setPowerMode' && e.outcome === 'rejected'
    )
  )
})

test('a telemetry handler rejects when the device is unreachable', async (t) => {
  // Nothing is listening on this port. With no boot-time connect probe (see
  // Step 5), the instance itself builds fine; the failure moves to call time.
  const instance = buildInstance({ port: 9099, deviceId: 'vendor-offline' })

  // fetch's connection-refused rejection is a TypeError, which plain
  // t.exception treats as an uncaught bug rather than an expected rejection.
  await t.exception.all(instance.telemetry.get('hashrate_rt')())
})

test('reboot enforces concurrency and cooldown after every attempt', async (t) => {
  const mock = vendorMock.createServer({ port: 9003 })
  t.teardown(() => mock.exit())
  const instance = buildInstance({ port: 9003, deviceId: 'vendor-concurrent' })

  const first = instance.commands.get('reboot')()
  await t.exception(() => instance.commands.get('reboot')(), /ERR_COMMAND_IN_PROGRESS/)
  await first
  await t.exception(() => instance.commands.get('reboot')(), /ERR_COMMAND_COOLDOWN/)
})
```

> [!TIP]
> `createInstance` builds one plugin instance for one device: the same call [`WorkerRuntimeV2`][worker-runtime-v2] makes per configured
> device at `runtime.start()`. Building two instances against
> distinct mocks and distinct `deviceId`s (as `demo-worker`'s own test file does) proves device isolation: a command
> against one instance never reaches the other's client, because each device's `src/client.js` was loaded into its
> own private module registry.

Cover at minimum: a telemetry handler reading a live value from the mock, a command reaching the mock and returning a
result, required/type/range/enum validation surfacing your contract's `ERR_*` codes, concurrent-command rejection,
cooldown after successful and failed attempts, an unreachable device surfacing an error from the handler call rather
than failing to build, and structured audit events containing rejected and failed outcomes. Production integration
tests should also verify that the host forwards those events to its durable audit sink.

Run it:

```bash
npm install
npm test
```

Expected output ends with:

```text
# tests = 4/4 pass
# asserts = 20/20 pass

# ok
```

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
- [ ] Unreachable-device behavior (an error from the handler call, not a boot-time failure) and the host's
      recovery policy are documented
- [ ] The mock lets a new partner developer run the Worker with zero real hardware
- [ ] Tests cover: a telemetry pull, a command that targets one device without touching its siblings, and a
      validation/device error surfacing as `status: 'FAILED'`
- [ ] A [Kernel-mediated test][test-a-worker] asserts the Worker reaches `READY`, exposes its device IDs, and serves
      telemetry through `createMdkClient`
- [ ] `npm run lint` and your test suite are wired into your own CI

## Troubleshooting

Two distinct phases can fail, and telling them apart matters: contract loading validates your `mdk-contract.json` and
resolves every handler path once, for the whole package; device instantiation `require()`s those handler files, once
per device, the first time that device's context opens.

**Contract loading**: `new WorkerRuntimeV2(dir, opts)` runs this synchronously before any device opens, and
[`loadContract(dir)`][mdk-worker-index] (Step 5) runs the identical check on its own:

| Error                                                                        | Diagnostic and remediation                                       |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `ERR_WORKER_DIR_REQUIRED`                                                    | `WorkerRuntimeV2`'s first argument must be a non-empty directory string |
| `ERR_CONTRACT_DIR_REQUIRED`                                                  | `loadContract`'s argument must be a non-empty directory string   |
| `ERR_CONTRACT_NOT_FOUND: <file>: <message>`                                  | No `mdk-contract.json` at the package root; check the path       |
| `ERR_CONTRACT_INVALID_JSON: <file>: <message>`                               | `mdk-contract.json` does not parse; fix the JSON syntax           |
| `ERR_PLUGIN_CONTRACT_METADATA_MISSING`                                       | `metadata` is missing or not an object                            |
| `ERR_PLUGIN_CONTRACT_CAPABILITIES_MISSING`                                   | `capabilities` is missing or not an object                        |
| `ERR_PLUGIN_SECTION_NOT_ARRAY: <section>`                                    | `capabilities.telemetry` or `capabilities.commands` must be an array |
| `ERR_PLUGIN_ENTRY_NAME_MISSING: <section>`                                   | Give every telemetry/command entry a non-empty string `name`      |
| `ERR_PLUGIN_HANDLER_MISSING: <section>.<name>`                               | Add that entry's relative `handler` path                          |
| `ERR_PLUGIN_HANDLER_NOT_FOUND: <section>.<name>: <resolved path>: <message>` | No file resolves at that path relative to the package root        |
| `ERR_PLUGIN_DUPLICATE_NAME: <section>.<name>`                                | Rename or remove the duplicate entry in that section               |

**Device instantiation**: `runtime.start()` runs this per configured device (see
[`worker-runtime-v2.js`][worker-runtime-v2]), and [`createInstance`][mdk-worker-index] (Step 7) runs the identical
check for one device at a time in tests:

| Error                                                                     | Diagnostic and remediation                                       |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `ERR_INSTANCE_HANDLER_NOT_FOUND: <device>: <section>.<name>: <handler path>` | The path that resolved fine at contract-load time no longer resolves inside this device's module context; check for a typo |
| `ERR_INSTANCE_HANDLER_LOAD_FAILED: <device>: <section>.<name>: <message>` | The handler file exists but throws while loading; the nested error names the real failure (a missing import, a syntax error) |
| `ERR_INSTANCE_HANDLER_NOT_FUNCTION: <device>: <section>.<name>`           | The module must assign a function to `module.exports`             |

For errors from a live Kernel registration or requests once your Worker is actually hosted, see
[Troubleshooting][test-a-worker] in Test a Worker with MDK.

## Next steps

- Test your new [Worker's integration with MDK][test-a-worker]
- Understand the [security boundaries][security-boundaries]
- See the end-user experience of controlling and monitoring your device via the Worker in [Test a Worker's next steps][test-a-worker-next-steps]

## Links

[npm-version]: ../../reference/environment.md#why-npm-stays-below-12
<!-- docs@tether.io: npm-version → reference/environment -->

[demo-worker]: ../../../backend/workers/samples/demo-worker/package.json
<!-- docs@tether.io: demo-worker → https://github.com/tetherto/mdk/blob/main/backend/workers/samples/demo-worker/package.json -->

[demo-worker-caller]: ../../../examples/backend/demo-worker-caller/index.js
<!-- docs@tether.io: demo-worker-caller → https://github.com/tetherto/mdk/blob/main/examples/backend/demo-worker-caller/index.js -->

[architecture]: ../../concepts/architecture.md
<!-- docs@tether.io: architecture → concepts/architecture -->

[install-pattern]: ../../../backend/workers/docs/install-pattern.md
<!-- docs@tether.io: install-pattern → https://github.com/tetherto/mdk/blob/main/backend/workers/docs/install-pattern.md -->

[workers-concept]: ../../../backend/workers/README.md
<!-- docs@tether.io: workers-concept → https://github.com/tetherto/mdk/blob/main/backend/workers/README.md -->

[demo-worker-client]: ../../../backend/workers/samples/demo-worker/src/client.js
<!-- docs@tether.io: demo-worker-client → https://github.com/tetherto/mdk/blob/main/backend/workers/samples/demo-worker/src/client.js -->

[demo-worker-db]: ../../../backend/workers/samples/demo-worker/src/db.js
<!-- docs@tether.io: demo-worker-db → https://github.com/tetherto/mdk/blob/main/backend/workers/samples/demo-worker/src/db.js -->

[contract-schema]: ../../../backend/core/mdk-worker/mdk-contract.schema.json
<!-- docs@tether.io: contract-schema → https://github.com/tetherto/mdk/blob/main/backend/core/mdk-worker/mdk-contract.schema.json -->

[demo-worker-mock]: ../../../backend/workers/samples/demo-worker/mock/server.js
<!-- docs@tether.io: demo-worker-mock → https://github.com/tetherto/mdk/blob/main/backend/workers/samples/demo-worker/mock/server.js -->

[demo-worker-plugin-test]: ../../../backend/workers/samples/demo-worker/tests/unit/handlers.test.js
<!-- docs@tether.io: demo-worker-plugin-test → https://github.com/tetherto/mdk/blob/main/backend/workers/samples/demo-worker/tests/unit/handlers.test.js -->

[mdk-worker-index]: ../../../backend/core/mdk-worker/index.js
<!-- docs@tether.io: mdk-worker-index → https://github.com/tetherto/mdk/blob/main/backend/core/mdk-worker/index.js -->

[worker-runtime-v2]: ../../../backend/core/mdk-worker/lib/worker-runtime-v2.js
<!-- docs@tether.io: worker-runtime-v2 → https://github.com/tetherto/mdk/blob/main/backend/core/mdk-worker/lib/worker-runtime-v2.js -->

[create-module-context]: ../../../backend/core/mdk-worker/lib/module-context.js
<!-- docs@tether.io: create-module-context → https://github.com/tetherto/mdk/blob/main/backend/core/mdk-worker/lib/module-context.js -->

[agent-ready-sdk]: ../../reference/maintainers/agent-ready-sdk.md
<!-- docs@tether.io: agent-ready-sdk → https://github.com/tetherto/mdk/blob/main/backend/core/README.md -->

[security-boundaries]: ../../concepts/security-boundaries.md
<!-- docs@tether.io: security-boundaries → concepts/security-boundaries -->

[test-a-worker]: test-a-worker.md
<!-- docs@tether.io: test-a-worker → guides/workers/test-a-worker -->

[test-a-worker-install]: test-a-worker.md#install-mdk
<!-- docs@tether.io: test-a-worker-install → guides/workers/test-a-worker -->

[test-a-worker-next-steps]: test-a-worker.md#next-steps
<!-- docs@tether.io: test-a-worker-next-steps → guides/workers/test-a-worker -->
