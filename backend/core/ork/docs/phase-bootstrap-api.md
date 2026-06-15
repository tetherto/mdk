# Bootstrap API Improvements

> **Status:** DONE

## Goals

Eliminate boilerplate from examples and user code:
- One call to get a running ORK: `getOrk()`
- `startWorker()` derives everything it can from the ManagerClass
- No more manual topic creation, ROOT paths, PKG paths, rack strings, or `wtype` strings
- ORK is optional — `startWorker()` without an ORK works for direct peer connections

## Changes Required

### 1. Add `getOrk(opts = {})` to `mdk.js`

- Generates a random 32-byte DHT topic internally
- Starts OrkManager with that topic
- Attaches `ork.topic` (hex string) so it can be passed to `startWorker`
- All opts optional: `root`, `storeDir`, `hrpc`, `ipc`, `telemetryPullMs`, `healthPingMs`
- Returns the ORK instance (with `.topic` property)

```js
const ork = await getOrk()
// ork.topic — auto-generated hex topic
// ork.getPublicKey() — HRPC public key
```

### 2. Add `_findWorkerPackagePath(ManagerClass)` helper

- Walks `require.cache` to find the module that exported `ManagerClass`
- From that file's directory, walks up (max 6 levels) looking for `mdk-contract.json`
- Returns the directory containing `mdk-contract.json`, or `null` if not found
- Called automatically in `startWorker()` when `workerPackagePath` is not provided

### 3. Update `startWorker(ManagerClass, opts = {})` defaults

| Opt | Old default | New default |
|-----|-------------|-------------|
| `opts.root` | `coreRoot + '/tmp'` | `os.tmpdir() + '/mdk'` |
| `opts.workerPackagePath` | required | auto via `_findWorkerPackagePath()` |
| `opts.rack` | required | `'rack-1'` |
| `opts.wtype` | required | `'wrk-thing'` (ThingManager default) |
| `opts.orkTopic` | required for discovery | derived from `opts.ork.topic` if `opts.ork` passed |

New `opts.ork` parameter: pass the ORK instance returned by `getOrk()` and `startWorker` will extract the topic automatically. No need to pass `orkTopic` explicitly.

### 4. Rack conflict handling

Rack conflicts occur when two workers of the same type share the same `workerId`. Since `workerId = manager.getThingType() + '-' + rack`, workers with different types (miner-wm, miner-am, container, etc.) never conflict on the default `rack-1`.

For same-type duplicates: `startWorker` uses `ManagerClass.name` (class name, e.g. `WhatsminerManager`) as the `workerDir` component. As long as each call uses a different ManagerClass, directories are isolated.

If two workers of the same ManagerClass are started with the same rack, they'd share a store directory — which is intentional for horizontal scaling scenarios. For independent workers of the same type, the user must pass explicit different racks.

### 5. `startOrk()` kept for backward compatibility

`startOrk(opts)` remains but `getOrk()` is preferred for new code. `startOrk` requires explicit `discovery.topic`.

## Updated API surface

```js
const { getOrk, startWorker, startOrk, waitForDiscovery } = require('@tetherto/mdk')

// Preferred (new)
const ork = await getOrk(opts?)          // start ORK + auto topic
const { manager, adapter } = await startWorker(ManagerClass, { ork, ...opts? })

// Backward compat (old)
const ork = await startOrk({ root, discovery: { topic }, loadConf: () => {} })
const { manager, adapter } = await startWorker(ManagerClass, { root, rack, orkTopic, wtype, workerPackagePath })
```

## Example: Before → after

### mdk-e2e/server.js (before)
```js
const TOPIC = crypto.randomBytes(32).toString('hex')
const ROOT = path.join(__dirname, '../../../../tmp/mdk-server')
const WM_PKG = path.join(__dirname, '../../../workers/miners/whatsminer')

const { manager } = await startWorker(WM_M56S, {
  rack: 'rack-1', root: ROOT, orkTopic: TOPIC,
  wtype: 'wrk-miner-wm', workerPackagePath: WM_PKG
})
const ork = await startOrk({ root: ROOT, discovery: { topic: TOPIC }, loadConf: () => {} })
await waitForDiscovery(ork)
```

### mdk-e2e/server.js (after)
```js
const ork = await getOrk()
const { manager } = await startWorker(WM_M56S, { ork })
```

## Task breakdown (commit order)

1. **Update `mdk.js`**: add `getOrk()`, `_findWorkerPackagePath()`, update `startWorker()` defaults
2. **Update `mdk-e2e/server.js` and `run.js`**: use new API
3. **Update `mdk-site/site.js`**: use new API
4. **Update per-type examples**: miners, containers, powermeters, sensors
