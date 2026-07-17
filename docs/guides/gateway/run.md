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

- Node.js >=24 (LTS)
- npm >=11
- Commands are run from the repository root
- An Kernel instance running and reachable, or `kernelKey: false` to start without a Kernel connection (development only)

<Steps>

<Step>

### Programmatic path

Most teams embed `startGateway()` in their own Node.js application rather than running the Gateway as a separate process.
This is the standard production path.

#### 1.1 Development (no auth)

Use `noAuth: true` during local development to skip the JWT requirement:

```js
const { getKernel, startGateway } = require('@tetherto/mdk')

const kernel = await getKernel()
const server = await startGateway({ kernel, port: 3000, noAuth: true })
// HTTP server is up at http://localhost:3000
```

> [!IMPORTANT]
> `noAuth: true` disables JWT validation on all routes. Never use this in production.

#### 1.2 Production (OAuth2)

Pass an `auth` block to enable OAuth2. Google and Microsoft providers are built in:

```js
const { getKernel, startGateway } = require('@tetherto/mdk')

const kernel = await getKernel()
const server = await startGateway({
  kernel,
  port: 3000,
  auth: {
    h0: {
      method: 'google',
      credentials: { client: { id: 'YOUR_CLIENT_ID', secret: 'YOUR_CLIENT_SECRET' } },
      users: ['admin@example.com']
    }
  }
})
```

Replace the `users` array with the email addresses that should have access. A copy of the full OAuth2 config format ships in
[`backend/core/gateway/config/facs/httpd-oauth2.config.json.example`][oauth2-example]. The generated `httpd-oauth2.config.json`
(written to `opts.root/config/facs/` on first start) persists your settings across restarts — edit that file rather than the code.

The full configuration reference, including all `startGateway()` options, is in the [Gateway API reference][gateway-readme].

</Step>

<Step>

### Cross-host path (HRPC)

Use this path when Kernel runs on a separate host. Pass the Kernel HRPC listener public key to `startGateway()` instead of an Kernel instance.
(On a single host, neither is needed: `startGateway()` reads the key from the well-known key file that `getKernel()` publishes —
see the [key resolution order][gateway-readme].)

#### 2.1 Obtain the Kernel listener key

On the host running Kernel, start Kernel and print its public key:

```js
const { getKernel } = require('@tetherto/mdk')

const kernel = await getKernel()
console.log('Kernel listener key:', kernel.getPublicKey().toString('hex'))
```

Share that hex string with the Gateway host.

#### 2.2 Start the Gateway with `kernelKey`

```js
const { startGateway } = require('@tetherto/mdk')

const server = await startGateway({
  kernelKey: '<kernel-listener-pubkey-hex>',
  port: 3000,
  noAuth: true   // replace with auth config for production
})
```

> [!NOTE]
> Pre v1.0, Kernel's `auth.whitelist` defaults to empty and admits any HRPC caller. For production deployments, add the Gateway's
> DHT public key to Kernel's allowlist — see the [Gateway concept page][gateway-concept] and [`opts.kernelKey` reference][mdk-readme].

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

- [Add routes with the plugin system][plugins-how-to]
- [Review all configuration options][gateway-readme]
- Understand the [extension model, auth design, and Kernel connection][gateway-concept]
- Choose a [deployment shape][deployment-topologies]

## Links

[terminology]: ../../reference/glossary.md
<!-- docs@tether.io: terminology → reference/glossary -->

[gateway-concept]: ../../concepts/stack/gateway.md
<!-- docs@tether.io: gateway-concept → concepts/stack/gateway -->

[gateway-readme]: ../../../backend/core/gateway/README.md
<!-- docs@tether.io: gateway-readme → https://github.com/tetherto/mdk/blob/main/backend/core/gateway/README.md -->

[oauth2-example]: ../../../backend/core/gateway/config/facs/httpd-oauth2.config.json.example
<!-- docs@tether.io: oauth2-example → https://github.com/tetherto/mdk/blob/main/backend/core/gateway/config/facs/httpd-oauth2.config.json.example -->

[plugins-how-to]: plugins.md
<!-- docs@tether.io: plugins-how-to → guides/gateway/plugins -->

[deployment-topologies]: ../../concepts/deployment-topologies.md
<!-- docs@tether.io: deployment-topologies → concepts/deployment-topologies -->

[mdk-readme]: ../../../backend/core/mdk/README.md
<!-- docs@tether.io: mdk-readme → https://github.com/tetherto/mdk/blob/main/backend/core/mdk/README.md -->
