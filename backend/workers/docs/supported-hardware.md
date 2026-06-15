<!-- GENERATED FILE — DO NOT EDIT. Regenerate with `npm run generate:catalogue` from backend/workers. Source: backend/workers/**/mdk-contract.json validated against backend/workers/base/mdk-contract.schema.json. -->

# Supported hardware

Every row is derived from a worker's `mdk-contract.json` (`metadata.provider`, `deviceFamily`, `brand`, `modelsSupported`) — the engineering source of truth. Mock types, ports, and manager-class names are defined in each worker's `USAGE.md` and the workers manifest, not in the contract.

## Miners

| Brand | Provider | Models | Worker package | Docs |
|-------|----------|--------|----------------|------|
| Antminer (non-conformant — see below) | bitmain | S19XP, S19XPH, S21, S21PRO | [`backend/workers/miners/antminer`](../miners/antminer/README.md) | [USAGE.md](../miners/antminer/USAGE.md) |
| Avalon (non-conformant — see below) | canaan | A1346 | [`backend/workers/miners/avalon`](../miners/avalon/README.md) | [USAGE.md](../miners/avalon/USAGE.md) |
| Whatsminer | microbt | M30SP, M30SPP, M53S, M56S, M63 | [`backend/workers/miners/whatsminer`](../miners/whatsminer/README.md) | [USAGE.md](../miners/whatsminer/USAGE.md) |

## Containers

| Brand | Provider | Models | Worker package | Docs |
|-------|----------|--------|----------------|------|
| Antspace (non-conformant — see below) | bitmain | HK3, IMM | [`backend/workers/containers/antspace`](../containers/antspace/README.md) | — |
| Bitdeer (non-conformant — see below) | bitdeer | D40-A1346, D40-M30, D40-M56, D40-S19XP | [`backend/workers/containers/bitdeer`](../containers/bitdeer/README.md) | — |
| MicroBT (non-conformant — see below) | microbt | KEHUA, WONDERINT | [`backend/workers/containers/microbt`](../containers/microbt/README.md) | — |

## Power meters

| Brand | Provider | Models | Worker package | Docs |
|-------|----------|--------|----------------|------|
| ABB (non-conformant — see below) | abb | B23, B24, M1M20, M4M20, REU615 | [`backend/workers/power-meter/abb`](../power-meter/abb/README.md) | — |
| Satec (non-conformant — see below) | satec | PM180 | [`backend/workers/power-meter/satec`](../power-meter/satec/README.md) | — |
| Schneider Electric (non-conformant — see below) | schneider | P3U30, PM5340 | [`backend/workers/power-meter/schneider`](../power-meter/schneider/README.md) | — |

## Sensors

| Brand | Provider | Models | Worker package | Docs |
|-------|----------|--------|----------------|------|
| Seneca (non-conformant — see below) | seneca | Z-4RTD-2 | [`backend/workers/temperature/seneca`](../temperature/seneca/README.md) | — |

## Mining pools

| Brand | Provider | Models | Worker package | Docs |
|-------|----------|--------|----------------|------|
| F2Pool (non-conformant — see below) | f2pool | f2pool-btc | [`backend/workers/minerpools/f2pool`](../minerpools/f2pool/README.md) | — |
| Ocean (non-conformant — see below) | ocean | ocean-btc | [`backend/workers/minerpools/ocean`](../minerpools/ocean/README.md) | — |

## Contract conformance

These contracts do not yet conform to [`mdk-contract.schema.json`](../base/mdk-contract.schema.json). Reported for engineering to confirm or fix on the PR; the catalogue is still generated.

- `backend/workers/containers/antspace/mdk-contract.json`
  - / must have required property 'devices'
  - /capabilities/health must have required property 'alerts'
- `backend/workers/containers/bitdeer/mdk-contract.json`
  - / must have required property 'devices'
  - /capabilities/health must have required property 'alerts'
- `backend/workers/containers/microbt/mdk-contract.json`
  - / must have required property 'devices'
  - /capabilities/health must have required property 'alerts'
- `backend/workers/minerpools/f2pool/mdk-contract.json`
  - / must have required property 'devices'
  - /capabilities/health must have required property 'alerts'
- `backend/workers/minerpools/ocean/mdk-contract.json`
  - / must have required property 'devices'
  - /capabilities/health must have required property 'alerts'
- `backend/workers/miners/antminer/mdk-contract.json`
  - / must have required property 'devices'
  - /capabilities/health must have required property 'alerts'
- `backend/workers/miners/avalon/mdk-contract.json`
  - / must have required property 'devices'
  - /capabilities/health must have required property 'alerts'
- `backend/workers/power-meter/abb/mdk-contract.json`
  - / must have required property 'devices'
  - /capabilities/health must have required property 'alerts'
- `backend/workers/power-meter/satec/mdk-contract.json`
  - / must have required property 'devices'
  - /capabilities/health must have required property 'alerts'
- `backend/workers/power-meter/schneider/mdk-contract.json`
  - / must have required property 'devices'
  - /capabilities/health must have required property 'alerts'
- `backend/workers/temperature/seneca/mdk-contract.json`
  - / must have required property 'devices'
  - /capabilities/health must have required property 'alerts'
