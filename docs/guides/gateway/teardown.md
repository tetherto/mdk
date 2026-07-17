---
title: Tear down MDK services
description: How to stop Kernel, Gateway, and Workers cleanly
docs@tether_slug: guides/gateway/teardown
---

## Overview

MDK registers graceful shutdown handlers automatically when you start services with `getKernel()`, `startWorker()`, or `startGateway()`. 
For most deployments, `SIGINT` (Ctrl+C) triggers a clean teardown with no extra code. This guide covers the three situations where 
you need to think about teardown explicitly:

- [Automatic teardown](#automatic-teardown-with-getkernel)
- [Explicit teardown](#explicit-teardown-in-tests-or-scripted-runs)
- [Custom signal handling](#custom-signal-handling-with-onshutdown)

## Prerequisites

- Familiarity with the [Gateway][gateway-concept]
- MDK [installed and a working boot sequence][run-gateway]

<Steps>

<Step>

### Automatic teardown with `getKernel()`

`getKernel()` registers `SIGINT`/`SIGTERM` handlers internally. Any Workers or Gateway instances started with `opts.kernel` are 
chained into the cleanup sequence automatically — no extra code needed.

```js
const { getKernel, startWorker, startGateway } = require('@tetherto/mdk')
const { WM_M56S } = require('@tetherto/mdk-worker-whatsminer')

const kernel = await getKernel()
const { manager } = await startWorker(WM_M56S, { kernel })
await startGateway({ kernel, port: 3000, noAuth: true })

// Press Ctrl+C — MDK stops Gateway, Worker, then Kernel automatically.
```

See [`getKernel` API reference][mdk-readme-getkernel].

</Step>

<Step>

### Explicit teardown in tests or scripted runs

Short-lived processes — integration tests, one-shot scripts — never receive `SIGINT`. Call `shutdown(kernel)` directly 
to drain the full cleanup chain. Pass the `kernel` object returned by `getKernel()`; passing a server object stops only the Gateway.

```js
const { getKernel, startGateway, shutdown } = require('@tetherto/mdk')

const kernel = await getKernel()
await startGateway({ kernel, noAuth: true })

// … run assertions or perform work …

await shutdown(kernel) // stops Gateway (chained), then stops Kernel
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

1. **Automatic chain**: `getKernel()`, `startWorker({ kernel })`, and `startGateway({ kernel })` wire themselves into `kernel._cleanup` so a single signal stops everything in order.
2. **Explicit drain**: `shutdown(kernel)` gives you the same ordered teardown on demand, without a signal.
3. **Custom hooks**: `onShutdown(fn)` lets you attach cleanup logic outside the MDK object hierarchy.

## Next steps

- Full API reference — [`@tetherto/mdk` README][mdk-readme]
- [Run the Gateway][run-gateway]

[mdk-readme]: ../../../backend/core/mdk/README.md
<!-- docs@tether.io: mdk-readme → https://github.com/tetherto/mdk/blob/main/backend/core/mdk/README.md -->

[mdk-readme-getkernel]: ../../../backend/core/mdk/README.md#getkernelopts--promisekernelmanager
<!-- docs@tether.io: mdk-readme-getkernel → https://github.com/tetherto/mdk/blob/main/backend/core/mdk/README.md#getkernelopts--promisekernelmanager -->

[mdk-readme-shutdown]: ../../../backend/core/mdk/README.md#shutdownhandle--promisevoid
<!-- docs@tether.io: mdk-readme-shutdown → https://github.com/tetherto/mdk/blob/main/backend/core/mdk/README.md#shutdownhandle--promisevoid -->

[mdk-readme-onshutdown]: ../../../backend/core/mdk/README.md#onshutdowncleanupfn-opts--handler
<!-- docs@tether.io: mdk-readme-onshutdown → https://github.com/tetherto/mdk/blob/main/backend/core/mdk/README.md#onshutdowncleanupfn-opts--handler -->

[gateway-concept]: ../../concepts/stack/gateway.md
<!-- docs@tether.io: gateway-concept → concepts/stack/gateway -->

[run-gateway]: run.md
<!-- docs@tether.io: run-gateway → guides/gateway/run -->
