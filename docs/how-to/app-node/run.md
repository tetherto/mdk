---
title: Run the App Node
description: Start the MDK App Node programmatically, as a standalone process, or connected to a remote ORK over HRPC
docs@tether_slug: how-to/app-node/run
---

## Overview

This guide covers three ways to run the App Node: programmatically via `startAppNode()` (the standard production path), connected to
a remote ORK over HRPC (cross-host deployments), and as a standalone process from the source tree (for contributors).

> [!NOTE]
> If App Node, ORK, or plugin are unfamiliar, read [terminology][terminology] first. For a deeper explanation of what the App Node
> owns and how it connects to ORK, read the [App Node concept page][app-node-concept].

## Prerequisites

- Node.js >=24 (LTS)
- npm >=11
- Commands are run from the repository root
- An ORK instance running and reachable, or `orkIpc: false` to start without a live ORK (development only)

<Steps>

<Step>

### Programmatic path

Most teams embed `startAppNode()` in their own Node.js application rather than running the App Node as a separate process.
This is the standard production path.

#### 1.1 Development (no auth)

Use `noAuth: true` during local development to skip the JWT requirement:

```js
const { getOrk, startAppNode } = require('@tetherto/mdk')

const ork = await getOrk()
const server = await startAppNode({ ork, port: 3000, noAuth: true })
// HTTP server is up at http://localhost:3000
```

> [!IMPORTANT]
> `noAuth: true` disables JWT validation on all routes. Never use this in production.

#### 1.2 Production (OAuth2)

Pass an `auth` block to enable OAuth2. Google and Microsoft providers are built in:

```js
const { getOrk, startAppNode } = require('@tetherto/mdk')

const ork = await getOrk()
const server = await startAppNode({
  ork,
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
[`backend/core/app-node/config/facs/httpd-oauth2.config.json.example`][oauth2-example]. The generated `httpd-oauth2.config.json`
(written to `opts.root/config/facs/` on first start) persists your settings across restarts — edit that file rather than the code.

The full configuration reference, including all `startAppNode()` options, is in the [App Node API reference][app-node-readme].

</Step>

<Step>

### Cross-host path (HRPC)

Use this path when ORK runs on a separate host. Pass the ORK HRPC gateway public key to `startAppNode()` instead of an ORK instance.
The HRPC transport is selected automatically and IPC is disabled.

#### 2.1 Obtain the ORK gateway key

On the host running ORK, start ORK and print its public key:

```js
const { getOrk } = require('@tetherto/mdk')

const ork = await getOrk()
console.log('ORK gateway key:', ork.getPublicKey().toString('hex'))
```

Share that hex string with the App Node host.

#### 2.2 Start the App Node with `orkKey`

```js
const { startAppNode } = require('@tetherto/mdk')

const server = await startAppNode({
  orkKey: '<ork-gateway-pubkey-hex>',
  port: 3000,
  noAuth: true   // replace with auth config for production
})
```

> [!NOTE]
> Pre v1.0, ORK's `auth.whitelist` defaults to empty and admits any HRPC caller. For production deployments, add the App Node's
> DHT public key to ORK's allowlist — see the [App Node concept page][app-node-concept] and [`opts.orkKey` reference][mdk-readme].

</Step>

<Step>

### Standalone path

To run the App Node directly from the source tree without embedding it:

```bash
cd backend/core/app-node
npm install
npm run dev
```

For production mode:

```bash
npm start
```

> [!NOTE]
> The standalone path is intended for contributors working on the App Node itself. For application development, embed `startAppNode()`
> in your own project rather than running it standalone.

</Step>

</Steps>

## Next steps

- [Add routes with the plugin system][plugins-how-to]
- [Review all configuration options][app-node-readme]
- Understand the [extension model, auth design, and ORK connection][app-node-concept]
- Choose a [deployment shape][deployment-topologies]

## Links

[terminology]: ../../concepts/terminology.md
<!-- docs@tether.io: terminology → concepts/terminology -->

[app-node-concept]: ../../concepts/stack/app-node.md
<!-- docs@tether.io: app-node-concept → concepts/stack/app-node -->

[app-node-readme]: ../../../backend/core/app-node/README.md
<!-- docs@tether.io: app-node-readme → https://github.com/tetherto/mdk/blob/main/backend/core/app-node/README.md -->

[oauth2-example]: ../../../backend/core/app-node/config/facs/httpd-oauth2.config.json.example
<!-- docs@tether.io: oauth2-example → https://github.com/tetherto/mdk/blob/main/backend/core/app-node/config/facs/httpd-oauth2.config.json.example -->

[plugins-how-to]: plugins.md
<!-- docs@tether.io: plugins-how-to → how-to/app-node/plugins -->

[deployment-topologies]: ../../concepts/deployment-topologies.md
<!-- docs@tether.io: deployment-topologies → concepts/deployment-topologies -->

[mdk-readme]: ../../../backend/core/mdk/README.md
<!-- docs@tether.io: mdk-readme → https://github.com/tetherto/mdk/blob/main/backend/core/mdk/README.md -->
