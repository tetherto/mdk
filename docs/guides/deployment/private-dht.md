---
title: Run MDK on a private HyperDHT
description: The local and air-gapped profile, with private HyperDHT bootstrap nodes, an explicit bind interface and no public hyperdht.org traffic
docs@tether_slug: guides/deployment/private-dht
---

## Overview

This page sets up the local and air-gapped profile: every MDK process joins a HyperDHT network you run, binds its DHT node to an
interface you choose, and never contacts the public `node1/2/3.hyperdht.org` bootstrap nodes. It follows hyperdht's own
[isolated-DHT pattern][hyperdht-isolated]: one bootstrap node plus persistent DHT nodes, and every component started with that bootstrap
list. The profile is HyperDHT configuration only. There is no proxy, relay or second transport in front of HRPC.

> [!NOTE]
> If Kernel, Worker, Gateway or HRPC are unfamiliar, read [terminology][terminology] first.

## Discovery and transport are separate

Discovery is how the Kernel learns a Worker's public key. Transport is how it then reaches that key. Every discovery mode, including the
same-process case, uses HRPC over HyperDHT, so every mode needs a reachable bootstrap. Moving to a private network changes the
bootstrap, not the discovery mode.

| Shape          | How the Kernel learns the Worker key                     | Transport          | What the private profile changes                          |
| -------------- | -------------------------------------------------------- | ------------------ | --------------------------------------------------------- |
| Same process   | `kernel.registerWorker(rpcKey)` in memory                | HRPC over HyperDHT | Both DHT nodes join the private bootstrap and bind `dhtHost` |
| Local          | Key files in `<root>/.worker-keys` on one machine        | HRPC over HyperDHT | Same                                                      |
| Microservices  | A HyperDHT topic the Kernel and every Worker join        | HRPC over HyperDHT | Same; the topic announce and lookup also stay on the private network |

A same-process Kernel and Worker still open a HyperDHT connection to each other. Without a reachable bootstrap, public or private, that
connection never forms and the Worker never reaches `READY`. The [deployment topology concept][deployment-topologies] covers the
three shapes in depth.

## Choose a bind interface

`dhtHost` is the interface each DHT node binds (hyperdht's `host` option). Without it a node binds every interface.

| Deployment                       | Bootstrap reached at       | `dhtHost` on every component        |
| -------------------------------- | -------------------------- | ----------------------------------- |
| One machine                      | `127.0.0.1:<port>`         | `127.0.0.1`                         |
| An isolated LAN                  | `<bootstrap LAN IP>:<port>` | That machine's address on the LAN   |
| Docker Compose (`startServices`) | `<subnet>.2:<port>`        | The container's fixed address, set for you |

Every process in the stack needs the same bootstrap list. The Kernel, Workers, Gateway, app runtimes, the MCP server and CLI
clients each start a DHT node, and one process left on the defaults joins the public network.

## Pass the profile to each component

| Component                 | Programmatic option                                                     | Service environment (`worker.js`)  |
| ------------------------- | ----------------------------------------------------------------------- | ---------------------------------- |
| Bootstrap                 | `startDhtBootstrap({ host, port, nodes })`                              | `SERVICE=dht-bootstrap`, `MDK_DHT_HOST`, `MDK_DHT_PORT`, `MDK_DHT_NODES` |
| Kernel                    | `getKernel({ hrpc: { bootstrap, dhtHost } })`                           | Not run by `worker.js`             |
| Worker                    | `bootstrap`, `dhtHost` on every Worker boot function and `WorkerRuntime` | `MDK_DHT_BOOTSTRAP`, `MDK_DHT_HOST` |
| Gateway                   | `startGateway({ bootstrap, dhtHost })`                                  | `MDK_DHT_BOOTSTRAP`, `MDK_DHT_HOST` |
| App runtime               | `createAppRuntime({ bootstrap, dhtHost, kernelBootstrap, kernelDhtHost })` | Set by `mdk run`                |
| MCP server and plugins    | `config.kernelBootstrap`, `config.kernelDhtHost`                        | Set by `mdk run`                   |
| Client                    | `createMdkClient({ kernelBootstrap, kernelDhtHost })`, or `hrpc: { bootstrap, dhtHost }` | Not applicable    |

`startGateway({ bootstrap, dhtHost })` covers all three DHT nodes the Gateway starts: its net facility (the key the Kernel and Workers
admit), its Kernel client and its app runtime client. Bootstrap lists that name a public `*.hyperdht.org` node are refused with
`ERR_MDK_DHT_BOOTSTRAP_PUBLIC`.

## Run the profile

Each subsection is an alternative; pick the one that matches how the stack runs.

### A. Programmatic, one machine

Start the bootstrap first and hand its list to every component:

```js
const { startDhtBootstrap, getKernel, startGateway } = require('@tetherto/mdk-core')
const { startAvalonWorker } = require('@tetherto/mdk-worker-avalon')

const storeDir = '/var/lib/mdk/avalon-1'
const net = await startDhtBootstrap({ host: '127.0.0.1', port: 49737 })
const dht = { bootstrap: net.bootstrap, dhtHost: '127.0.0.1' }

const kernel = await getKernel({ hrpc: dht, discovery: { mode: 'local' } })
const worker = await startAvalonWorker({ workerId: 'avalon-1', model: 'a1346', storeDir, allowedKeys: [kernel.getClientPublicKey()], ...dht })
await kernel.registerWorker(worker.runtime.getPublicKey())
const gateway = await startGateway({ kernel, ...dht })
```

Close the bootstrap with `net.close()` after every component has stopped.

### B. `mdk run`

Add `spec.network.dht` to `mdk.yaml`:

```yaml
spec:
  network:
    dht:
      host: 127.0.0.1   # bind interface, and where the generated bootstrap is reached (default 127.0.0.1)
      port: 49737       # UDP port of the generated bootstrap
```

The process that runs the Kernel (`mdk run`, or `mdk run kernel` in a split stack) also runs the bootstrap and stops it after the
Kernel. Every other target (`gateway`, `mcp`, `worker <name>`, `app <name>`) and every CLI command that calls the Kernel joins
`host:port`. To join a bootstrap you already run elsewhere, list it and no bootstrap is started. Set `host` to this machine's
LAN address, or leave it unset to bind every interface. A loopback `host` with a non-loopback bootstrap is refused, because a
socket bound to loopback cannot reach it:

```yaml
spec:
  network:
    dht:
      host: 10.20.0.7
      bootstrap:
        - 10.20.0.5:49737
```

### C. PM2 with `startServices`

```js
await startServices({ runtime: 'pm2', repoRoot, dht: {}, services })
```

The generated `ecosystem.config.js` starts `mdk-dht-bootstrap` first, on `127.0.0.1:49737`, and sets `MDK_DHT_BOOTSTRAP` and
`MDK_DHT_HOST=127.0.0.1` on every service. For an isolated LAN, pass `dht: { host: '<this machine>', bootstrap: ['<lan ip>:49737'] }`
and no bootstrap app is generated. Without `host`, `MDK_DHT_HOST` is not set and every service binds all interfaces.

### D. Docker Compose with `startServices`

```js
await startServices({ runtime: 'docker', repoRoot, image, dht: { internal: true }, services })
```

A container cannot reach another container's `127.0.0.1`, so the Docker profile uses a dedicated bridge network instead of loopback:

- The network is `mdk-dht`, subnet `172.31.249.0/24` unless `dht.subnet` says otherwise
- The generated `dht-bootstrap` service sits at `.2`, and services take `.10` onward in the order they are listed
- Every service gets `MDK_DHT_BOOTSTRAP=<subnet>.2:49737` and `MDK_DHT_HOST=<its own address>`, so its DHT node binds that network only
- With `internal: true` the network has no route out; each Gateway also joins the default network so its published port works

> [!IMPORTANT]
> An internal network also cuts Workers off from devices on the site LAN. Leave `internal` off when Workers poll real hardware; the
> DHT stays private either way, because no service knows a public bootstrap node.

The Kernel is not part of the generated file. Run it on the same Docker network, at an address outside the generated ones, with
`getKernel({ hrpc: { bootstrap: ['172.31.249.2:49737'], dhtHost: '<its address>' } })`.

## Verify the stack is private

1. List the UDP sockets the MDK processes hold, and check each is bound to the chosen interface rather than `0.0.0.0` or `*`:

   ```bash
   lsof -nP -iUDP | grep node
   ```

2. Start one process with `DEBUG=mdk:dht-bootstrap` set to log the bootstrap address it serves.
3. On an air-gapped host, block outbound UDP `49737` at the firewall and confirm Workers still reach `READY`.

The `private-dht` integration test in [`backend/core/mdk/tests/integration/`][integration-tests] checks the same things for each
discovery mode and for the Gateway: sockets bound to `127.0.0.1`, and routing tables that hold loopback nodes only.

## Next steps

- [Deployment topologies][deployment-topologies]: choose between single-process, local and microservices shapes
- [Supervised services][all-workers]: run a multi-Worker site under PM2 or Docker
- [Hosted-site reference configuration][hosted-site]: the full settings table for a managed site
- [`@tetherto/mdk-core` reference][mdk-readme]: `startDhtBootstrap`, `startServices` options and the DHT error codes

## Links

[hyperdht-isolated]: https://github.com/holepunchto/hyperdht#isolated-dht-network
<!-- docs@tether.io: hyperdht-isolated → https://github.com/holepunchto/hyperdht#isolated-dht-network -->

[terminology]: ../../reference/glossary.md
<!-- docs@tether.io: terminology → reference/glossary -->

[deployment-topologies]: ../../concepts/deployment-topologies.md
<!-- docs@tether.io: deployment-topologies → https://github.com/tetherto/mdk/blob/main/backend/core/docs/README.md#connection-and-deployment-model -->

[all-workers]: run-all-workers-site.md
<!-- docs@tether.io: all-workers → guides/deployment/run-all-workers-site -->

[hosted-site]: hosted-site.md
<!-- docs@tether.io: hosted-site → guides/deployment/hosted-site -->

[mdk-readme]: ../../../backend/core/mdk/README.md
<!-- docs@tether.io: mdk-readme → https://github.com/tetherto/mdk/blob/main/backend/core/mdk/README.md -->

[integration-tests]: ../../../backend/core/mdk/tests/integration/private-dht.test.js
<!-- docs@tether.io: integration-tests → https://github.com/tetherto/mdk/blob/main/backend/core/mdk/tests/integration/private-dht.test.js -->
