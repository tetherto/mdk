---
title: Run the Gateway
description: Start the MDK Gateway programmatically, as a standalone process, or connected to a remote Kernel over HRPC
docs@tether_slug: guides/gateway/run
---

## Overview

This guide covers three ways to run the Gateway: programmatically via `startGateway()` (the standard production path), connected to
a remote Kernel over HRPC (cross-host deployments), and as a standalone process from the source tree (for contributors).

> [!NOTE]
> If Gateway, Kernel, or plugin are unfamiliar, read [terminology][terminology] first. For a deeper explanation of what the Gateway
> owns and how it connects to Kernel, read the [Gateway concept page][gateway-concept].

## Prerequisites

- [Node.js][node] >=24 (LTS)
- npm 11 [(< 12)][npm-version]
- Commands are run from the repository root
- A Kernel instance running and reachable, or `kernelKey: false` to start without a Kernel connection (development only)
- [Outbound UDP to the HyperDHT bootstrap nodes][network-requirements]

<Steps>

<Step>

### Programmatic path

Most teams embed `startGateway()` in their own Node.js application rather than running the Gateway as a separate process.
This is the standard production path.

```js
const { getKernel, startGateway } = require('@tetherto/mdk-core')

const kernel = await getKernel()
const server = await startGateway({ kernel, port: 3000 })
// HTTP server is up at http://localhost:3000
```

> [!WARNING]
> A Gateway started with a Kernel, as above, or with a Gateway credential checks a bearer access token and a `spec.rbac` rule on
> every app route before the request reaches the app, so [write the policy][security-policy] before you expose the port. A route
> an app declares with `"auth": true` and its own `permissions` is authorized the same way, as [auth and permissions][app-auth]
> describes. A custom `authVerifier` function is for a Gateway started with no authority at all; it is not how you add
> authentication to this path. Only `localhost`, `127.0.0.1` and `[::1]` on the bound port pass the Host check by default, so
> list the names your clients use in `allowedHosts` when you bind to a LAN address.

The full configuration reference, including all `startGateway()` options, is in the [Gateway API reference][gateway-readme].

</Step>

<Step>

### Cross-host path (HRPC)

Use this path when Kernel runs on a separate host. Pass the Kernel HRPC listener public key to `startGateway()` instead of a Kernel instance.
(On a single host, neither is needed: `startGateway()` reads the key from the well-known key file that `getKernel()` publishes —
see the [key resolution order][gateway-readme].)

#### 2.1 Obtain the Kernel listener key

On the host running Kernel, start Kernel and print its public key:

```js
const { getKernel } = require('@tetherto/mdk-core')

const kernel = await getKernel()
console.log('Kernel listener key:', kernel.getPublicKey().toString('hex'))
```

Share that hex string with the Gateway host.

#### 2.2 Start the Gateway with `kernelKey`

```js
const { startGateway } = require('@tetherto/mdk-core')

const server = await startGateway({
  kernelKey: '<kernel-listener-pubkey-hex>',
  port: 3000
})
```

> [!NOTE]
> Kernel's allowlist `auth.whitelist` is fail-closed: empty admits nobody. `startGateway({ kernel })` admits the Gateway's key on an
> in-process Kernel, and a same-machine Kernel admits it from the shared trusted-keys dir. For a Kernel on another host, add the Gateway's
> DHT public key (`status.rpcClientKey` in its status file, stable across restarts) to Kernel's allowlist — see the
> [Gateway concept page][gateway-concept] and [`opts.kernelKey` reference][mdk-readme].

</Step>

<Step>

### Standalone path

To run the Gateway directly from the source tree without embedding it:

```bash
cd backend/core/gateway
npm install
npm run dev
```

For production mode:

```bash
npm start
```

> [!NOTE]
> The standalone path is intended for contributors working on the Gateway itself. For application development, embed `startGateway()`
> in your own project rather than running it standalone.

</Step>

</Steps>

## Next steps

- [Add routes with the plugin system][app-authoring]
- [Review all configuration options][gateway-readme]
- Understand the [extension model, auth design, and Kernel connection][gateway-concept]
- Choose a [deployment shape][deployment-topologies]

## Links

[node]: https://nodejs.org/
<!-- docs@tether.io: external link — preserve URL -->

[npm-version]: ../../reference/environment.md#why-npm-stays-below-12
<!-- docs@tether.io: npm-version → reference/environment -->

[terminology]: ../../reference/glossary.md
<!-- docs@tether.io: terminology → reference/glossary -->

[gateway-concept]: ../../../backend/core/gateway/README.md
<!-- docs@tether.io: gateway-concept → https://github.com/tetherto/mdk/blob/main/backend/core/gateway/README.md -->

[gateway-readme]: ../../../backend/core/gateway/README.md
<!-- docs@tether.io: gateway-readme → https://github.com/tetherto/mdk/blob/main/backend/core/gateway/README.md -->

[app-authoring]: apps.md
<!-- docs@tether.io: app-authoring → guides/gateway/apps -->


[app-auth]: apps.md#auth-and-permissions
<!-- docs@tether.io: app-auth → guides/gateway/apps#auth-and-permissions -->

[security-policy]: ../security/index.md#step-5-authorize-writes
<!-- docs@tether.io: security-policy → guides/security#step-5-authorize-writes -->

[deployment-topologies]: ../../concepts/deployment-topologies.md
<!-- docs@tether.io: deployment-topologies → https://github.com/tetherto/mdk/blob/main/docs/concepts/deployment-topologies.md -->

[mdk-readme]: ../../../backend/core/mdk/README.md
<!-- docs@tether.io: mdk-readme → https://github.com/tetherto/mdk/blob/main/backend/core/mdk/README.md -->

[network-requirements]: ../../reference/environment.md#requirements
<!-- docs@tether.io: network-requirements → reference/environment#requirements -->
