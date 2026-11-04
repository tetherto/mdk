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

## Worker contract

`mdk-contract.json` is the one machine-readable contract in the backend, validated against
[`mdk-contract.schema.json`](../mdk-worker/mdk-contract.schema.json) in the Worker runtime package. The
[Worker-side contract page](../../workers/docs/AGENT_READY.md) covers its fields and the conventions around it.

## Reaching core at runtime

An agent does not import these packages. It reaches a running stack through the [MCP server](../mcp/README.md), which
turns each app's declared routes into tools and signs the agent in as its own service account under `spec.rbac`.

## Next steps

- [Follow the shared conventions](../README.md#shared-conventions): strict mode, `debug` logging, `ERR_*` constants, `brittle` tests, StandardJS
- [See how the packages depend on each other](../README.md#dependency-graph): what each one pulls in and why
- [Expose app data to an agent](../../../docs/guides/agent/expose-data.md): declare routes an MCP tool can call
