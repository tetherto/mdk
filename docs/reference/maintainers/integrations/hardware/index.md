# Supported hardware

The hardware catalogue is no longer hand-maintained. It is generated from every `backend/workers/**/mdk-contract.json` and validated against the vendored schema, which implements the `check:integrations-fresh` direction in [`../../ia.md`](../../ia.md#qa-gates).

- User-facing entrypoint: [`reference/supported-hardware.md`](../../../supported-hardware.md)
- Generated full catalogue (co-located with the workers): [`backend/workers/docs/supported-hardware.md`](../../../../../backend/workers/docs/supported-hardware.md)
- Generator: [`backend/workers/scripts/generate-catalogue.js`](../../../../../backend/workers/scripts/generate-catalogue.js)

Per-category pages ([`miners.md`](#miners), [`containers.md`](#containers), [`powermeters.md`](#power-meters), [`sensors.md`](#sensors)) are now pointers to the generated catalogue. Pool integrations and external services remain at [`../pools.md`](../pools.md) and [`../external-services.md`](../external-services.md).

Detailed facts for each integration live next to its worker package: `mdk-contract.json` for the runtime contract, and `USAGE.md` + `examples/` for prose and runnables.

## How the workers catalogue stays correct

The catalogue is regenerated from the contracts, not hand-maintained:

```bash
cd packages/workers
npm run generate:catalogue
```

The generator ([`backend/workers/scripts/generate-catalogue.js`](../../../../../backend/workers/scripts/generate-catalogue.js)) validates every contract against the vendored [`mdk-contract.schema.json`](../../../../../backend/workers/base/mdk-contract.schema.json) and reports any non-conformance for maintainers to resolve. Mock types, ports, and manager-class names are not part of the contract — those live in each worker's `USAGE.md` and the [workers manifest](../../../../../backend/workers/docs/workers-manifest.yaml).


# Containers

The container model coverage is generated from the worker contracts.

- See the [Containers section of the generated catalogue](../../../../../backend/workers/docs/supported-hardware.md#containers)
- User-facing entrypoint: [`reference/supported-hardware.md`](../../../supported-hardware.md)
- Per-worker docs: `backend/workers/containers/<vendor>/`


# Miners

The miner model coverage is generated from the worker contracts.

- See the [Miners section of the generated catalogue](../../../../../backend/workers/docs/supported-hardware.md#miners)
- User-facing entrypoint: [`reference/supported-hardware.md`](../../../supported-hardware.md)
- Per-worker docs: `backend/workers/miners/<vendor>/USAGE.md` (Antminer, Whatsminer, Avalon)

# Power meters

The power-meter model coverage is now generated from the worker contracts.

- See the [Power meters section of the generated catalogue](../../../../../backend/workers/docs/supported-hardware.md#power-meters)
- User-facing entrypoint: [`reference/supported-hardware.md`](../../../supported-hardware.md)
- Per-worker docs: `backend/workers/power-meter/<vendor>/`

# Sensors

The sensor model coverage is now generated from the worker contracts.

- See the [Sensors section of the generated catalogue](../../../../../backend/workers/docs/supported-hardware.md#sensors)
- User-facing entrypoint: [`reference/supported-hardware.md`](../../../supported-hardware.md)
- Per-worker docs: `backend/workers/temperature/<vendor>/`
