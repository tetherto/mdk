<!-- GENERATED FILE — DO NOT EDIT. Regenerate with `npm run generate:catalogue` from backend/workers. Source: backend/workers/**/mdk-contract.json validated against backend/core/mdk-worker/mdk-contract.schema.json. -->

# Supported hardware

Every row is derived from a worker's `mdk-contract.json` (`metadata.provider`, `deviceFamily`, `brand`, `modelsSupported`) — the engineering source of truth. Mock types, ports, and manager-class names are defined in each worker's `USAGE.md` and the workers manifest, not in the contract.

## Miners

| Brand | Provider | Models | Worker package | Docs |
|-------|----------|--------|----------------|------|
| Antminer | bitmain | S19XP, S19XPH, S21, S21PRO | [`backend/workers/miners/antminer`](../miners/antminer/README.md) | [USAGE.md](../miners/antminer/USAGE.md) |
| Avalon | canaan | A1346 | [`backend/workers/miners/avalon`](../miners/avalon/README.md) | [USAGE.md](../miners/avalon/USAGE.md) |
| Whatsminer | microbt | M30SP, M30SPP, M53S, M56S, M63 | [`backend/workers/miners/whatsminer`](../miners/whatsminer/README.md) | [USAGE.md](../miners/whatsminer/USAGE.md) |

## Containers

| Brand | Provider | Models | Worker package | Docs |
|-------|----------|--------|----------------|------|
| Antspace | bitmain | HK3, IMM | [`backend/workers/containers/antspace`](../containers/antspace/README.md) | — |
| Bitdeer | bitdeer | D40-A1346, D40-M30, D40-M56, D40-S19XP | [`backend/workers/containers/bitdeer`](../containers/bitdeer/README.md) | — |

## Power meters

| Brand | Provider | Models | Worker package | Docs |
|-------|----------|--------|----------------|------|
| ABB | abb | B23, B24, M1M20, M4M20, REU615 | [`backend/workers/power-meter/abb`](../power-meter/abb/README.md) | — |
| SATEC | satec | PM180 | [`backend/workers/power-meter/satec`](../power-meter/satec/README.md) | — |
| Schneider Electric | schneider | P3U30, PM5340 | [`backend/workers/power-meter/schneider`](../power-meter/schneider/README.md) | — |

## Sensors

| Brand | Provider | Models | Worker package | Docs |
|-------|----------|--------|----------------|------|
| Seneca | seneca | Z-4RTD-2 | [`backend/workers/temperature/seneca`](../temperature/seneca/README.md) | — |

## Mining pools

| Brand | Provider | Models | Worker package | Docs |
|-------|----------|--------|----------------|------|
| F2Pool | f2pool | F2POOL-BTC | [`backend/workers/minerpools/f2pool`](../minerpools/f2pool/README.md) | — |
| Ocean | ocean | OCEAN-BTC | [`backend/workers/minerpools/ocean`](../minerpools/ocean/README.md) | — |

## Contract conformance

All worker contracts validate cleanly against the vendored schema.
