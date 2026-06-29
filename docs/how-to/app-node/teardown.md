---
title: Tear down MDK services
description: Stop ORK, App Node, and Workers cleanly
docs@tether_slug: how-to/app-node/teardown
---

## Overview

MDK registers graceful shutdown handlers automatically when you start services with `getOrk()`, `startWorker()`, or `startAppNode()`. 
For most deployments, `SIGINT` (Ctrl+C) triggers a clean teardown with no extra code. This guide covers the three situations where 
you need to think about teardown explicitly:

- [Automatic teardown](#automatic-teardown-with-getork)
- [Explicit teardown](#explicit-teardown-in-tests-or-scripted-runs)
- [Custom signal handling](#custom-signal-handling-with-onshutdown)

## Prerequisites

- Familiarity with the [App Node][app-node-concept]
- MDK [installed and a working boot sequence][run-app-node]

<Steps>

<Step>

### Automatic teardown with `getOrk()`

`getOrk()` registers `SIGINT`/`SIGTERM` handlers internally. Any Workers or App Node instances started with `opts.ork` are 
chained into the cleanup sequence automatically — no extra code needed.

```js
const { getOrk, startWorker, startAppNode } = require('@tetherto/mdk')
const { WM_M56S } = require('@tetherto/miner-whatsminer')

const ork = await getOrk()
const { manager } = await startWorker(WM_M56S, { ork })
await startAppNode({ ork, port: 3000, noAuth: true })

// Press Ctrl+C — MDK stops App Node, Worker, then ORK automatically.
```

See [`getOrk` API reference][mdk-readme-getork].

</Step>

<Step>

### Explicit teardown in tests or scripted runs

Short-lived processes — integration tests, one-shot scripts — never receive `SIGINT`. Call `shutdown(ork)` directly 
to drain the full cleanup chain. Pass the `ork` object returned by `getOrk()`; passing a server object stops only the App Node.

```js
const { getOrk, startAppNode, shutdown } = require('@tetherto/mdk')

const ork = await getOrk()
await startAppNode({ ork, noAuth: true })

// … run assertions or perform work …

await shutdown(ork) // stops App Node (chained), then stops ORK
```

See [`shutdown` API reference][mdk-readme-shutdown].

</Step>

<Step>

### Custom signal handling with `onShutdown`

Use `onShutdown` when you need to close resources outside an MDK boot object — for example, a database connection or a log buffer.

```js
const { onShutdown } = require('@tetherto/mdk')

onShutdown(async () => {
  await db.close()
  await logger.flush()
}, { forceMs: 5000 })
```

See [`onShutdown` API reference][mdk-readme-onshutdown].

</Step>

</Steps>

## What just happened

1. **Automatic chain**: `getOrk()`, `startWorker({ ork })`, and `startAppNode({ ork })` wire themselves into `ork._cleanup` so a single signal stops everything in order.
2. **Explicit drain**: `shutdown(ork)` gives you the same ordered teardown on demand, without a signal.
3. **Custom hooks**: `onShutdown(fn)` lets you attach cleanup logic outside the MDK object hierarchy.

## Next steps

- Full API reference — [`@tetherto/mdk` README][mdk-readme]
- [Run the App Node][run-app-node]

[mdk-readme]: ../../../backend/core/mdk/README.md
<!-- docs@tether.io: mdk-readme → https://github.com/tetherto/mdk/blob/main/backend/core/mdk/README.md -->

[mdk-readme-getork]: ../../../backend/core/mdk/README.md#getorkopts--promiseorkmanager
<!-- docs@tether.io: mdk-readme-getork → https://github.com/tetherto/mdk/blob/main/backend/core/mdk/README.md#getorkopts--promiseorkmanager -->

[mdk-readme-shutdown]: ../../../backend/core/mdk/README.md#shutdownhandle--promisevoid
<!-- docs@tether.io: mdk-readme-shutdown → https://github.com/tetherto/mdk/blob/main/backend/core/mdk/README.md#shutdownhandle--promisevoid -->

[mdk-readme-onshutdown]: ../../../backend/core/mdk/README.md#onshutdowncleanupfn-opts--handler
<!-- docs@tether.io: mdk-readme-onshutdown → https://github.com/tetherto/mdk/blob/main/backend/core/mdk/README.md#onshutdowncleanupfn-opts--handler -->

[app-node-concept]: ../../concepts/stack/app-node.md
<!-- docs@tether.io: app-node-concept → concepts/stack/app-node -->

[run-app-node]: run.md
<!-- docs@tether.io: run-app-node → how-to/app-node/run -->
