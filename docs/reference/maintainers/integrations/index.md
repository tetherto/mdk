<!-- mdk-monorepo: hand-maintained until check:integrations-fresh lands; see ../ia.md#qa-gates -->

# What MDK can talk to

MDK Workers wrap an upstream source — a hardware device, a pool API, or an external data service — and expose it via the MDK Protocol.

| Kind | Catalogue |
|------|-----------|
| Hardware | [`hardware/`](hardware/index.md) |
| Pool integrations | [`pools.md`](pools.md) |
| External services | [`external-services.md`](external-services.md) |

Detailed facts for each integration live next to its Worker package: see `mdk-contract.json` for the runtime contract (telemetry, commands, health, errors) and `USAGE.md` + `examples/` for prose and runnables. Pages under this folder are thin indexes — click through to a Worker package for the full picture.
