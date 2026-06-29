# @tetherto/tpl-lib-thing

The base worker framework. `ThingManager` is the `EventEmitter`-based foundation that all MDK device workers extend. It provides lifecycle management, 11 built-in services, Hyperbee storage, and the `MDKWorkerAdapter` that bridges the manager to the MDK Protocol over Hyperswarm.

## Overview

```
ThingManager (EventEmitter)
├── StoreFacility     — Hyperbee multi-database
├── IntervalsFacility — Scheduling intervals
├── SchedulerFacility — Job scheduling
└── 11 Services
    ├── ConnectionService    — Hardware connections
    ├── DataService          — Device registration/state
    ├── ListingService       — Device list/filter
    ├── LogsService          — Structured log writes
    ├── LogHistoryService    — Historical log queries
    ├── StatsService         — Aggregated statistics
    ├── SnapsService         — Live telemetry snapshots
    ├── CommentsService      — Device annotations
    ├── AlertsService        — Threshold alerts
    ├── SettingsService      — Config persistence
    └── ActionsService       — Hardware command execution
```

> [!TIP]
> New to Workers? Read the [Workers concept page](../../../docs/concepts/stack/workers.md) for the discovery model, capability contract, and how to add hardware for a new device type.

## Lifecycle

```js
const manager = new WM_M56S({}, { rack: 'rack-1', storeDir: './data/store', root: './data' })

await manager.init()    // Creates facilities, opens stores, wires services
manager.start(cb)       // Starts services, opens hardware connections
manager.stop(cb)        // Graceful shutdown — flushes Hyperbee, closes connections
```

## Key Methods

### Device Management

```js
// Register a new device
await manager.registerThing({
  info: { serialNum: 'WM-001', container: 'A', pos: 'A1' },
  opts: { address: '192.168.1.10', port: 14028, password: 'admin' }
})

// Update device info or connection options
await manager.updateThing({
  info: { serialNum: 'WM-001' },
  opts: { address: '192.168.1.11' }
})

// Remove devices
await manager.forgetThings({ ids: ['wm-001'] })

// List all registered devices
const devices = await manager.listThings({})

// Get device type string
manager.getThingType()  // e.g. 'miner-wm-m56s'
```

### Telemetry

```js
// Collect a live snapshot (metrics, health, etc.) — used by telemetry.pull
const snap = await manager.collectThingSnap(deviceId)

// Aggregate statistics across all devices
const stats = await manager.aggrStats(opts)
```

### Logs

```js
// Tail recent logs (live)
const logs = await manager.tailLog({ deviceId, limit: 100 })

// Query historical logs
const history = await manager.getHistoricalLogs({ deviceId, from: timestamp, to: timestamp })
```

### Commands

```js
// Execute a hardware command
const result = await manager.applyThings({ command: 'reboot', deviceId: 'wm-001', params: {} })
```

### Comments

```js
await manager.saveComment({ deviceId: 'wm-001', text: 'Fan replaced' })
await manager.editComment({ deviceId: 'wm-001', commentId: 'abc', text: 'Fan replaced (verified)' })
await manager.deleteComment({ deviceId: 'wm-001', commentId: 'abc' })
```

## MDKWorkerAdapter

`MDKWorkerAdapter` is the Hyperswarm bridge between the manager and ORK. It:

1. Creates a DHT keypair (persisted in Hyperbee for stable identity across restarts)
2. Starts an HRPC server that listens for MDK Protocol envelopes
3. Joins the configured DHT topic so ORK can discover it
4. Routes each incoming action to the appropriate manager method

```js
const { MDKWorkerAdapter } = require('@tetherto/tpl-lib-thing/lib/mdk-worker-adapter')

const adapter = new MDKWorkerAdapter(manager, contract, {
  workerId: 'whatsminer-rack-1',
  orkTopic: '<32-byte hex topic>',
  store: adapterStore        // StoreFacility for keypair persistence
})

await adapter.start()
adapter.getPublicKey()   // Buffer — share with ORK whitelist if using HRPC auth
await adapter.stop()
```

### Action Routing

The adapter handles these MDK Protocol actions automatically:

| Action | Manager method called |
|--------|----------------------|
| `identity.request` | Returns workerId and device list |
| `capability.request` | Returns `mdk-contract.json` contents |
| `telemetry.pull` | Routes query type to appropriate service |
| `state.pull` | Returns worker state machine snapshot |
| `command.request` | Calls `applyThings()` via `ActionsService` |
| `health.ping` | Returns `health.pong` |

## Extending ThingManager

Every device worker extends this chain:

```js
// 1. Create the manager class
class WhatsminerManagerM56s extends WhatsminerManager {
  getThingType () { return 'miner-wm-m56s' }

  async _connectThing (device) {
    // Open TCP connection to the Whatsminer API
  }

  async _fetchSnapshot (device) {
    // Return live metrics: { hashrate_rt, power, temperature, … }
  }

  async _executeCommand (device, command, params) {
    // Translate MDK command to vendor API call
  }
}

// 2. Export it
module.exports = { WM_M56S: WhatsminerManagerM56s }
```

## Storage

`ThingManager` uses `@tetherto/hp-svc-facs-store` (Hyperbee multi-database facility). Each worker gets its own isolated Hyperbee stores:

| Store | Contents |
|-------|---------|
| `things` | Registered device records |
| `logs` | Structured log entries |
| `stats` | Aggregated time-bucketed metrics |
| `snaps` | Most recent telemetry snapshots |
| `comments` | Device annotations |
| `settings` | Worker configuration |

## Facilities

- `@tetherto/hp-svc-facs-store` — Hyperbee multi-database
- `@bitfinex/bfx-facs-interval` — Interval-based scheduling
- `@bitfinex/bfx-facs-scheduler` — Cron-style job scheduling

## Directory Layout

```
base/
├── lib/
│   ├── thing.manager.js       # ThingManager — core base class
│   ├── mdk-worker-adapter.js  # Hyperswarm HRPC bridge
│   ├── services/
│   │   ├── connection.service.js
│   │   ├── data.service.js
│   │   ├── listing.service.js
│   │   ├── logs.service.js
│   │   ├── log-history.service.js
│   │   ├── stats.service.js
│   │   ├── snaps.service.js
│   │   ├── comments.service.js
│   │   ├── alerts.service.js
│   │   ├── settings.service.js
│   │   └── actions.service.js
│   ├── templates/
│   │   ├── alerts.defaults.js
│   │   └── stats.defaults.js
│   └── utils/constants.js
├── facs/
│   └── thg-write-calls.fac.js  # Action whitelisting facility
└── tests/
    ├── unit/
    └── integration/
```
