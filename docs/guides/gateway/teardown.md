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
- A monorepo checkout with the root `npm install`: the examples load `@tetherto/mdk-worker-avalon`, a private workspace
  package that is [not published to npm][mdk-readme-install]

<Steps>

<Step>

### Automatic teardown with `getKernel()`

`getKernel({ handleSignals: true })` registers `SIGINT`/`SIGTERM` handlers that drain the cleanup chain, stop the Kernel, and
exit the process. Without the option no handler is installed. A Gateway started with `opts.kernel` is chained into the cleanup
sequence automatically. Workers are **not** auto-chained: `WorkerRuntimeV2` has no `opts.kernel`, so push its `stop()` onto
`kernel._cleanup` yourself if you want Kernel shutdown to cascade to it:

```js
const path = require('path')
const { getKernel, startGateway } = require('@tetherto/mdk-core')
const { WorkerRuntimeV2 } = require('@tetherto/mdk-worker')

const main = async () => {
  const kernel = await getKernel({ handleSignals: true })

  const runtime = new WorkerRuntimeV2(path.dirname(require.resolve('@tetherto/mdk-worker-avalon/package.json')), {
    workerId: 'avalon-rack-1',
    storeDir: './data/avalon',
    allowedKeys: [kernel.getClientPublicKey()],
    devices: [{ deviceId: 'AV-001', config: { address: '192.168.1.30', port: 4028, password: 'admin' } }]
  })
  await runtime.start()
  await kernel.registerWorker(runtime.getPublicKey())
  kernel._cleanup.push(() => runtime.stop()) // cascade Worker shutdown from Kernel

  await startGateway({ kernel, port: 3000 })

  // Press Ctrl+C to start cleanup: Gateway, then Worker, then Kernel.
}

main().catch((err) => { console.error(err); process.exit(1) })
```

The signal handler force-exits after three seconds if cleanup is still running. A stalled telemetry request can keep the
Worker's `stop()` pending past that deadline, so the Kernel may exit before its cleanup completes.

See [`getKernel` API reference][mdk-readme-getkernel] and the [Workers discovery model][workers-lifecycle] for the same-process
lifecycle rules.

</Step>

<Step>

### Explicit teardown in tests or scripted runs

Short-lived processes — integration tests, one-shot scripts — and embedders that own their signals (the default) call `shutdown(kernel)` directly
to drain the full cleanup chain. Pass the `kernel` object returned by `getKernel()`; passing a server object stops only the Gateway.

```js
const { getKernel, startGateway, shutdown } = require('@tetherto/mdk-core')

const main = async () => {
  const kernel = await getKernel()
  await startGateway({ kernel })

  // … run assertions or perform work …

  await shutdown(kernel) // stops Gateway (chained), then stops Kernel
}

main().catch((err) => { console.error(err); process.exit(1) })
```

See [`shutdown` API reference][mdk-readme-shutdown].

</Step>

<Step>

### Custom signal handling with `onShutdown`

Use `onShutdown` when you need to close resources outside an MDK boot object, such as a database connection or a log buffer.
[Every handler shares one shutdown][mdk-readme-onshutdown] and runs last-registered first, so a handler you register after
`getKernel({ handleSignals: true })` finishes before the Kernel stops:

```js
const { getKernel, onShutdown } = require('@tetherto/mdk-core')

const main = async () => {
  await getKernel({ handleSignals: true })

  onShutdown(async () => {
    await db.close()
    await logger.flush()
  }, { forceMs: 5000 })
}

main().catch((err) => { console.error(err); process.exit(1) })
```

The [`onShutdown` options][mdk-readme-onshutdown] set which signals the handler listens for and how long the shutdown waits
(`forceMs`) before forcing the exit. The longest `forceMs` any handler registers applies, so this one gives the whole shutdown
5 seconds instead of the Kernel's 3. A standalone Gateway started with `handleSignals: true` works the same way.

To fold a step into the Kernel's own handler instead, push it onto `kernel._cleanup`, as
[automatic teardown](#automatic-teardown-with-getkernel) does for a Worker.

</Step>

</Steps>

## What just happened

1. **Automatic chain**: `getKernel({ handleSignals: true })` and `startGateway({ kernel })` start cleanup on a single signal, with
   the Gateway first and the Kernel last. Push a Worker's `stop()` onto `kernel._cleanup` yourself to fold it into the same chain.
2. **Explicit drain**: `shutdown(kernel)` gives you the same ordered teardown on demand, without a signal.
3. **Custom hooks**: an `onShutdown(fn)` handler registered after boot closes resources outside the MDK object hierarchy
   before the Kernel stops.

## Next steps

- [`@tetherto/mdk-core` README][mdk-readme]: full API reference
- [Run the Gateway][run-gateway]

[mdk-readme]: ../../../backend/core/mdk/README.md
<!-- docs@tether.io: mdk-readme → https://github.com/tetherto/mdk/blob/main/backend/core/mdk/README.md -->

[mdk-readme-install]: ../../../backend/core/mdk/README.md#install
<!-- docs@tether.io: mdk-readme-install → https://github.com/tetherto/mdk/blob/main/backend/core/mdk/README.md#install -->

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
