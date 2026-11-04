---
title: Tear down MDK services
description: How to stop Kernel, Gateway, and Workers cleanly
docs@tether_slug: guides/gateway/teardown
---

## Overview

As a library, MDK leaves your process's signals alone: `getKernel()` and `startGateway()` install `SIGINT`/`SIGTERM` handlers
only when you pass `handleSignals: true`, which a standalone process does so that Ctrl+C triggers a clean teardown with no
extra code. This guide covers the three ways to tear down:

- [Signal-driven teardown](#automatic-teardown-with-getkernel)
- [Explicit teardown](#explicit-teardown-in-tests-or-scripted-runs)
- [Custom signal handling](#custom-signal-handling-with-onshutdown)

## Prerequisites

- Familiarity with the [Gateway][gateway-concept]
- MDK [installed and a working boot sequence][run-gateway]

<Steps>

<Step>

### Automatic teardown with `getKernel()`

`getKernel({ handleSignals: true })` registers `SIGINT`/`SIGTERM` handlers that drain the cleanup chain, stop the Kernel and
exit the process. Without the option no handler is installed. A Gateway started with `opts.kernel` is chained into the cleanup
sequence automatically. Workers are **not** auto-chained: a Worker's boot function has no `opts.kernel`, so push its `stop()` onto
`kernel._cleanup` yourself if you want Kernel shutdown to cascade to it:

```js
const { getKernel, startGateway } = require('@tetherto/mdk-core')
const { startAvalonWorker } = require('@tetherto/mdk-worker-avalon')

const kernel = await getKernel({ handleSignals: true })

const { runtime, stop } = await startAvalonWorker({
  workerId: 'avalon-rack-1',
  model: 'a1346',
  storeDir: './data/avalon',
  allowedKeys: [kernel.getClientPublicKey()]
})
await kernel.registerWorker(runtime.getPublicKey())
kernel._cleanup.push(stop) // cascade Worker shutdown from Kernel

await startGateway({ kernel, port: 3000 })

// Press Ctrl+C: MDK stops Gateway, then the Worker, then Kernel.
```

See [`getKernel` API reference][mdk-readme-getkernel] and the [Workers discovery model][workers-lifecycle] for the same-process
lifecycle rules.

</Step>

<Step>

### Explicit teardown in tests or scripted runs

Short-lived processes — integration tests, one-shot scripts — and embedders that own their signals (the default) call `shutdown(kernel)` directly
to drain the full cleanup chain. Pass the `kernel` object returned by `getKernel()`; passing a server object stops only the Gateway.

```js
const { getKernel, startGateway, shutdown } = require('@tetherto/mdk-core')

const kernel = await getKernel()
await startGateway({ kernel })

// … run assertions or perform work …

await shutdown(kernel) // stops Gateway (chained), then stops Kernel
```

See [`shutdown` API reference][mdk-readme-shutdown].

</Step>

<Step>

### Custom signal handling with `onShutdown`

Use `onShutdown` when you need to close resources outside an MDK boot object — for example, a database connection or a log buffer.

```js
const { onShutdown } = require('@tetherto/mdk-core')

onShutdown(async () => {
  await db.close()
  await logger.flush()
}, { forceMs: 5000 })
```

See [`onShutdown` API reference][mdk-readme-onshutdown].

</Step>

</Steps>

## What just happened

1. **Automatic chain**: `getKernel({ handleSignals: true })` and `startGateway({ kernel })` wire themselves into `kernel._cleanup` so a single signal stops
   Kernel and Gateway in order; push a Worker's `stop()` onto `kernel._cleanup` yourself to fold it into the same chain.
2. **Explicit drain**: `shutdown(kernel)` gives you the same ordered teardown on demand, without a signal.
3. **Custom hooks**: `onShutdown(fn)` lets you attach cleanup logic outside the MDK object hierarchy.

## Next steps

- [`@tetherto/mdk-core` README][mdk-readme]: full API reference
- [Run the Gateway][run-gateway]

[mdk-readme]: ../../../backend/core/mdk/README.md
<!-- docs@tether.io: mdk-readme → https://github.com/tetherto/mdk/blob/main/backend/core/mdk/README.md -->

[mdk-readme-getkernel]: ../../../backend/core/mdk/README.md#getkernelopts--promisekernelmanager
<!-- docs@tether.io: mdk-readme-getkernel → https://github.com/tetherto/mdk/blob/main/backend/core/mdk/README.md#getkernelopts--promisekernelmanager -->

[mdk-readme-shutdown]: ../../../backend/core/mdk/README.md#shutdownhandle--promisevoid
<!-- docs@tether.io: mdk-readme-shutdown → https://github.com/tetherto/mdk/blob/main/backend/core/mdk/README.md#shutdownhandle--promisevoid -->

[mdk-readme-onshutdown]: ../../../backend/core/mdk/README.md#onshutdowncleanupfn-opts--handler
<!-- docs@tether.io: mdk-readme-onshutdown → https://github.com/tetherto/mdk/blob/main/backend/core/mdk/README.md#onshutdowncleanupfn-opts--handler -->

[gateway-concept]: ../../../backend/core/gateway/README.md
<!-- docs@tether.io: gateway-concept → https://github.com/tetherto/mdk/blob/main/backend/core/gateway/README.md -->

[workers-lifecycle]: ../../../backend/workers/README.md
<!-- docs@tether.io: workers-lifecycle → https://github.com/tetherto/mdk/blob/main/backend/workers/README.md -->

[run-gateway]: run.md
<!-- docs@tether.io: run-gateway → guides/gateway/run -->
