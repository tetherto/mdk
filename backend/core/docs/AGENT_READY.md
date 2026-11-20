# Agent-ready contract — core

What a coding agent can rely on when building against the packages under [`backend/core/`](../README.md).

## Public surface

Every core package declares an `exports` map in its `package.json`. Import only the entry points and subpaths it lists;
anything else fails with `ERR_PACKAGE_PATH_NOT_EXPORTED`. Each package README lists its public surface:
[Kernel](../kernel/README.md), [client](../client/README.md), [Worker runtime](../mdk-worker/README.md),
[MCP server](../mcp/README.md), [bootstrap](../mdk/README.md), [Gateway](../gateway/README.md),
[app runtime](../app-runtime/README.md), [identity](../identity/README.md), [RBAC](../rbac/README.md).

## Errors

Errors carry stable `ERR_*` codes in `SCREAMING_SNAKE_CASE`. Each package README tables the codes it throws, what fires
each one, and the fix, next to the code that throws them. Match on the code, never on the message text.

## Protocol

The MDK Protocol envelope and action set are exported by `@tetherto/mdk-kernel`; Workers and clients import them from
there. The [protocol reference](../../../docs/reference/protocol/messages.md) documents every message.

## Reading the fleet

A question about many devices at once is one call, not a loop over Workers. The caller names the Workers it wants and the Kernel fans the
read out, merges what comes back, and reports any Worker that could not answer beside the result. The Kernel stores no telemetry: every
reading comes from the Worker that owns the device.

[`@tetherto/mdk-client`](../client/README.md#client-methods) provides:
- `pullSnapshot`: returns the stored readings per device, for a moment or over a range
- `pullAggregate`: has each Worker compute the figure over the latest stored reading of each of its devices, and returns the merged number

`pullAggregate` is what a route needing only a total or an average should reach for: a reducing op such as `sum` or `avg` sends a
running total rather than the readings behind it. `arr_concat` returns the readings themselves, and `group` and
`group_multiple_stats` return one value per group key, which is per device only when the group is `deviceId`.

> [!IMPORTANT]
> Name every Worker in one `pullAggregate` call. A call per Worker, combined afterwards, answers a different question and
> reports nothing to say which one it answered. [The fleet-read note](../../../docs/concepts/control-plane.md#fleet-reads)
> sets out the two statistics and when each is the one you want.

These rules bind an agent here:

- Never start a second polling loop against the hardware to answer a fleet question. A Worker that polls, with
  `telemetryPollIntervalMs` set in its contract or in `mdk.yaml` `spec.workers[].config`, already stores the series these
  reads are answered from, so the read costs no device call.
- A fleet read is authorized per device, so the caller needs `devices` `read` on every device of every Worker it lists.

The [app authoring guide](../../../docs/guides/gateway/apps.md#read-hardware-data) works a controller through end to end.

## Worker contract

`mdk-contract.json` is the one machine-readable contract in the backend, validated against
[`mdk-contract.schema.json`](../mdk-worker/mdk-contract.schema.json) in the Worker runtime package. The
[Worker-side contract page](../../workers/docs/AGENT_READY.md) covers its fields and the conventions around it.

## Reaching core at runtime

An agent does not import these packages. It reaches a running stack through the [MCP server](../mcp/README.md), which
turns each app's declared routes into tools and signs the agent in as its own service account under `spec.rbac`.

## Next steps

- [Follow the shared conventions](../README.md#shared-conventions): strict mode, `debug` logging, `ERR_*` constants, `brittle` tests,
  `bfx-lint-js` lint
- [See how the packages depend on each other](../README.md#dependency-graph): what each one pulls in and why
- [Expose app data to an agent](../../../docs/guides/agent/expose-data.md): declare routes an MCP tool can call
