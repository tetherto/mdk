# MDK Avalon Miner Example

A small, self-contained **Avalon A1346 miner** site you can run with **no real hardware**.
One Kernel and one Avalon A1346 Worker in a single Node.js process, backed by a **mock** Avalon
device speaking CGMiner's TCP protocol, so the whole site comes up on `localhost` and is
immediately verifiable.

## What it demonstrates

- Bringing up an Kernel + one Worker in one process.
- Starting a **mock Avalon A1346 miner** and **registering** it as a thing.
- Exposing the Kernel via an **HTTP gateway** at `http://localhost:3000`.
- Live mock telemetry pulled through the Kernel over HTTP — no hardware.

## Prerequisites

- **Node.js >= 24**
- Monorepo dependencies installed (from the repo root):

```bash
npm run setup:core      # backend/core packages
npm run setup:workers   # backend/workers packages (includes miner-avalon + its mock)
```

> Without these the example fails at startup with `Cannot find module 'debug'` (or similar). This is
> the most common first-run problem — install before anything else.

## Architecture

```mermaid
flowchart LR
  Index[index.js]
  Index --> Kernel[getKernel]
  Index --> App[startGateway :3000]
  Index --> W1[startWorker AV_A1346]

  subgraph proc [Single Node.js process]
    Kernel
    App
    W1
    M1[mock :14031 CGMiner TCP]
  end

  App <-->|HRPC| Kernel
  Kernel <-->|MDK Protocol over Hyperswarm DHT| W1
  W1 <-->|CGMiner TCP loopback| M1
```

The Worker polls its mock over CGMiner's TCP protocol on loopback, exactly as it would poll a
real Avalon miner. An HTTP gateway sits in front of the Kernel and exposes a REST API at
`http://localhost:3000`.

## Workers and mocks

| Worker class | Mock type | Mock port | `serialNum` | `container` |
|---|---|---|---|---|
| `AV_A1346` | `a1346` | 14031 | `AV001` | `av-1` |

The device is registered with `password: 'admin'`.

## Quickstart

```bash
node examples/backend/miners/avalon/index.js     # from the repo root
# or: cd examples/backend/miners/avalon && npm start
```

On startup the Kernel HRPC key, the HTTP server URL, and the registered device ID are printed. After
~20–30 s the Worker has joined the DHT and its device is live. `Ctrl+C` shuts everything down
cleanly.

## Verifying it works

Once the example is running, query the HTTP API exposed by the gateway (`http://localhost:3000`)
directly. For example, to list Workers and pull telemetry for a device:

```bash
curl http://localhost:3000/site-monitor/workers
curl http://localhost:3000/site-monitor/devices/<device-id>/telemetry
```

A healthy response from the Workers endpoint looks like:

```json
{
  "workers": [
    {
      "workerId": "AvalonMinerManagerA1346-...",
      "state": "READY",
      "healthState": "HEALTHY",
      "deviceIds": ["<device-id>"]
    }
  ]
}
```
