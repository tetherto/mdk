# __WORKER_NAME__

An MDK **Worker Plugin** — the code that translates between MDK and a family of
physical devices. It ships only an [`mdk-contract.json`](./mdk-contract.json) (its capability manifest)
plus [`src/`](./src/) handler files, a device "vendor SDK" client, and a mock device
server. It exports no module of its own; it is **directory-loaded** by
`WorkerRuntimeV2`, which the MDK CLI constructs (`mdk run worker <name>`) — the
package never constructs or depends on the runtime itself.

This scaffold is a working example that talks to a hypothetical device over a
tiny HTTP JSON API. Replace the device client, mock, contract, and handlers with
your own device's protocol.

## Layout

```
mdk-contract.json     # capability manifest (telemetry channels + commands)
src/client.js         # your device "vendor SDK" — binds to this device once, per instance
src/telemetry/*.js    # telemetry handlers (metrics read live from the device)
src/commands/*.js     # command handlers (reboot, set-power-mode, ...)
mock/server.js        # a standalone device simulator (createServer)
smoke.config.js       # the device spec `mdk validate worker --smoke` checks against
```

Handlers are plain `(params)` functions — they call `require('../client')` for
their device's client, which itself binds once (at `require` time) to the
ambient `@tetherto/mdk-worker/device` for this instance's connection opts.
There is one such module registry per configured device, so each handler
always talks to its own device.

## Run it

Add the worker to your stack's `mdk.yaml` by **local path** and describe its
seed devices under `config`:

```yaml
spec:
  workers:
    - name: __WORKER_NAME__
      package: ./workers/__WORKER_NAME__
      config:
        mock: true          # start mock/server.js per device (dev only)
        devices:
          - id: dev-0
            opts: { host: 127.0.0.1, port: 18080, serial: DEV-0 }
```

Then:

```bash
mdk run worker __WORKER_NAME__     # boots the worker (+ its mocks with mock: true)
```

With `mock: true` the CLI starts one simulator from [`mock/server.js`](./mock/server.js) per device
so the worker talks to a simulator instead of hardware. Drop `mock` (or set it
`false`) and point `opts.host`/`opts.port` at real devices for production.

## Check it

```bash
mdk validate worker __WORKER_NAME__                  # the contract and handler files, without running them
mdk validate worker --path . --smoke                 # also runs every handler against the simulator
```

`--smoke` starts the simulator through [`smoke.config.js`](./smoke.config.js), calls every telemetry
handler and each sample command it lists, then stops the simulator and expects every handler to fail
with an `ERR_*` error code. Add a sample to `commands` for each command you add, unless it interrupts
the device.

## Builtin per-device health check

Every Worker answers a `telemetry.pull` query of `type: 'health'` for each
device, with no contract or handler changes: what that device's last metrics
poll (the Kernel's scheduled `telemetry.pull`) saw.

- The response is `{ name: 'health', value: { reachable, lastSuccessAt, lastError, lastErrorAt } }`.
  `reachable` is `true` when any channel answered the last poll, `false` when
  none did or the device is offline, and `null` before the first poll, so a
  dashboard can show "Worker up, device silent".
- Requires a `deviceId` — a query with no `deviceId` returns
  `{ error: 'ERR_DEVICE_ID_REQUIRED: health' }`, same as any other named channel.

If your own contract declares a `health` telemetry channel, that one is used
instead — the builtin never overrides a plugin-declared handler of the same
name.
