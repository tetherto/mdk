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

## Builtin per-device health check

`WorkerRuntimeV2` answers a `telemetry.pull` query of `type: 'health'` for any
device automatically — no contract or handler changes needed. It works by
registering `health` as a plain handler in the same table any contract-declared
telemetry channel lives in, so it is dispatched with zero special-casing, the
same way `status`/`hashrate_rt`/etc. would be. That means it behaves exactly
like any other named channel:

- Requires a `deviceId` — a query with no `deviceId` returns
  `{ error: 'ERR_DEVICE_ID_REQUIRED: health' }`, same as any other named channel.
- The response comes back in the standard named-channel shape,
  `{ name: 'health', value: { status, id, opts, env, config, workerId } }` —
  that device's own ambient config, useful for verifying that Gateway → Kernel
  → Worker routing reaches the right device instance (e.g. a query addressed
  to `dev-3` always comes back with `dev-3`'s own `opts`, never a sibling
  device's).
- It also shows up as a `health` key inside the default `type: 'metrics'`
  aggregate for every device, since that aggregate iterates the very same
  handler table.

If your own contract declares a `health` telemetry channel, that one is used
instead — the builtin never overrides a plugin-declared handler of the same
name.
