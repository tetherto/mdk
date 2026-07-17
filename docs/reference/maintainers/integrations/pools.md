<!-- mdk-monorepo: hand-maintained until check:integrations-fresh lands; see ../ia.md#qa-gates -->

# Pool integrations

Workers with `metadata.deviceFamily: "minerpool"` in their `mdk-contract.json`. Protocol adapters, not hardware: each contract defines telemetry (`hashrate`, `balance`, `workers_online`, …) and commands for the pool's API.

| Pool | Website | Worker package |
|------|---------|----------------|
| Ocean | [ocean.xyz](https://ocean.xyz/) | [`backend/workers/minerpools/ocean/`](../../../../backend/workers/minerpools/ocean/plugin/mdk-contract.json) |
| F2Pool | [f2pool.com](https://www.f2pool.com/) | [`backend/workers/minerpools/f2pool/`](../../../../backend/workers/minerpools/f2pool/plugin/mdk-contract.json) |
