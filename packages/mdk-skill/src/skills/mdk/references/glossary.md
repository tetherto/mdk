# Glossary

| Term | Meaning |
| --- | --- |
| **MDK** | Mining Device Kit — the whole platform: Kernel, Workers, Gateway, client, UI toolkit. |
| **Kernel** | The orchestration core ([`backend/core/kernel`](../../../../../../backend/core/kernel/README.md), `@tetherto/mdk-kernel`): discovery, telemetry pulls, command dispatch, health. |
| **Worker** | A device-type adapter process: `WorkerRuntime` or `WorkerRuntimeV2` hosting a Worker Plugin, speaking MDK envelopes upward and the vendor protocol downward. |
| **Worker Plugin** | What a Worker package ships, one of two shapes: the older `plugin/index.js` exporting `{ contract, dir, connect, disconnect? }` plus handler modules under `plugin/src/` (every currently shipped device family), or a directory-loaded package exporting no module of its own — just `mdk-contract.json` at its root plus `src/` handlers (the shape `mdk create worker` scaffolds). Neither subclasses the runtime. |
| **WorkerRuntime** | Generic plugin host ([`backend/core/mdk-worker`](../../../../../../backend/core/mdk-worker/index.js)) for the module-exporting shape: loads the plugin, owns device contexts via `connect()`, answers envelopes over HRPC, announces on the DHT. |
| **WorkerRuntimeV2** | Host for the directory-loaded shape ([`backend/core/mdk-worker/lib/worker-runtime-v2.js`](../../../../../../backend/core/mdk-worker/lib/worker-runtime-v2.js)): takes a package directory instead of a plugin object, has no `connect()`/boot-time probe/offline state, and builds one plugin instance per device via `createInstance`. Shares envelope dispatch and DHT discovery with `WorkerRuntime`. |
| **Contract** (`mdk-contract.json`) | A Worker's single source of truth: metadata, telemetry channels, commands (with param types/bounds), health states, error codes. Simultaneously machine-validation input and AI context. |
| **Published contract** | The contract as returned on `capability.response` — a copy with internal `handler` paths stripped. |
| **Envelope** | The nine-field MDK Protocol message ([`protocol.md`](./protocol.md)). |
| **Action** | The envelope's verb, e.g. `telemetry.pull`, `command.request` ([`backend/core/kernel/lib/protocol/actions.js`](../../../../../../backend/core/kernel/lib/protocol/actions.js)). |
| **Channel** | One declared telemetry entry; pulled individually via `query.type = '<name>'` or all together via `type: 'metrics'`. |
| **Handler** | A plugin module mapped from a contract entry, never seeing envelopes or transport: `async (ctx, params) => result` on `WorkerRuntime`, or plain `async (params) => result` on `WorkerRuntimeV2` (no `ctx`). |
| **ctx** | `WorkerRuntime`'s frozen per-device handler context `{ deviceId, device, config, services }`; `device` is whatever `connect()` returned. `WorkerRuntimeV2` handlers have no `ctx` — see **Ambient device module**. |
| **connect / disconnect** | `WorkerRuntime`-only plugin lifecycle: `connect(config, { deviceId })` builds (and probes) a device client; failing devices are held `offline`. Directory-loaded (`WorkerRuntimeV2`) plugins have neither. |
| **Ambient device module** (`@tetherto/mdk-worker/device`) | What a `WorkerRuntimeV2` handler `require()`s to reach its own device: `{ id, opts, env, config, logger }`. Intercepted before real module resolution, scoped to one device via a private per-device module registry. |
| **Device** | One physical unit (a miner, a meter…) addressed by `deviceId`; a Worker owns its `deviceIds` exclusively. |
| **`kernelTopic`** | The Hyperswarm DHT topic a Kernel listens on; Workers join it (server mode) to be discovered. |
| **HRPC** | `@hyperswarm/rpc` — the transport; Workers expose one `'mdk'` method that takes and returns serialized envelopes. |
| **Worker-infra services** | Optional process-owned services (logs, settings, stats, comments, provisioning…) injected as `opts.services`; served as built-in telemetry types / commands ahead of plugin handlers. |
| **Mock** | A vendor-firmware simulator (per-worker `mock/server.js`, shared framework in [`backend/workers/mock/`](../../../../../../backend/workers/mock/README.md)) so Workers run without hardware. |
| **Gateway** | HTTP boundary in front of the Kernel ([`backend/core/gateway`](../../../../../../backend/core/gateway/README.md)) for UI/HTTP consumers; AI agents reach Kernel through the standalone MCP server instead. |
| **WAL** | Write-ahead log in the Kernel's command state machine: every state mutation is logged before it takes effect. |
| **Family** | A device category + vendor line (Whatsminer, Antminer, ABB…) under `backend/workers/<category>/<family>/`. |
