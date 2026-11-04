# Agent-ready contract — workers

What a coding agent can rely on when building or reading a Worker package under [`backend/workers/`](../README.md), or
one published from its own repository.

## The contract

Every Worker carries one `mdk-contract.json`, validated against
[`mdk-contract.schema.json`](../../core/mdk-worker/mdk-contract.schema.json) in the Worker runtime package. A standalone
Worker Plugin package, the shape `mdk create worker` scaffolds and `mdk add worker` installs, keeps it at the package root
beside `package.json`; the in-repo Workers are self-booting packages that keep their plugin, contract included, under
`plugin/`. It is the only machine-readable contract in the backend: the runtime loads it, the Kernel enforces it, and the
catalogue reads it.

| Key | Holds |
| --- | --- |
| `metadata` | `provider`, `deviceFamily`, `brand`, `modelsSupported`, `overview` |
| `capabilities.telemetry` | one entry per channel: `name`, `type`, `description` and `handler` required; `unit` optional |
| `capabilities.commands` | one entry per command: `name` and `handler` required; `description`, `constraints`, `params`, `examples`; `[]` for a read-only device |
| `capabilities.config` | `schema`, the id of the per-device `opts` the plugin reads |
| `capabilities.health` | `supportedStates`, `alerts`, `troubleshooting` |
| `capabilities.errors` | `E_CODE` to the sentence shown when it fires |
| `contractVersion` | `"1"` opts into the v1 generation and is held to its requirements as errors; an unstamped contract gets the same findings as warnings |

Every `handler` names a file that must exist; the loader fails without it. Every `number` command parameter declares `min`
and `max`; the Kernel enforces bounds only when declared (`ERR_PARAM_RANGE`).
[`miners/avalon/plugin/mdk-contract.json`](../miners/avalon/plugin/mdk-contract.json) is a complete in-repo example.

## What the catalogue reads

The [Supported Workers page](supported-workers.md) and its twin [`catalogue.json`](catalogue.json) are generated from
`metadata.brand`, `metadata.provider`, `metadata.deviceFamily` and `metadata.modelsSupported`, for in-repo Workers and for
every partner Worker pinned in [`external-workers.json`](../external-workers.json). A brand flagged "v1 strictness gaps" has a
contract without the `contractVersion` stamp.

## Validation

`mdk validate worker --path <dir>` checks `package.json` and the contract against the schema and its semantic rules, with
every handler resolved on disk and compiled. `--smoke` runs the handlers against the mock that `smoke.config.js` starts;
`--strict` turns the v1 warnings of an unstamped contract into errors. The
[Worker testing guide](../../../docs/guides/workers/test-a-worker.md#check-the-package) lists every `smoke.config.js` field.

## Prose beside the contract

`USAGE.md` at the package root carries what the contract cannot: an overview that goes past `metadata.overview`, how to run
the bundled mock, how devices are registered, and operational notes. It does not restate `telemetry`, `commands` or
`health`; the catalogue reads those from the contract. [`miners/avalon/USAGE.md`](../miners/avalon/USAGE.md) is the in-repo
example.

No Worker package carries an `examples/` directory today. A single Worker runs against its bundled mock through
`npm run mock` and the boot script in its guide, for example [run an Avalon Worker](../../../docs/guides/miners/run-avalon-worker.md).

## Next steps

- [Build a Worker](../../../docs/guides/workers/build-a-worker.md): scaffold the package, author the contract, write the handlers and the mock
- [Test a Worker](../../../docs/guides/workers/test-a-worker.md): validation, smoke checks and a live Kernel
- [Read the contract validation rules](../../core/mdk-worker/README.md#contract-validation): what the schema and the strict tier require
- [Understand the Workers architecture](architecture.md): package shape, runtime workflow and discovery modes
