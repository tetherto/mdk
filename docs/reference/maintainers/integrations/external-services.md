<!-- mdk-monorepo: hand-maintained until check:integrations-fresh lands; see ../ia.md#qa-gates -->

# External services

Future Workers that pull data from third-party services — not hardware, not pools. Typically read-only feeds (network state, weather, market data).

| Service | Description | Worker package |
|---------|-------------|----------------|
| Bitcoin Mempool | Real-time network data, mempool stats, fee estimates | `backend/workers/` (TBD) |
| OpenWeather | Weather data for outdoor container operations | `backend/workers/` (TBD) |

No Worker has shipped yet — this page is a placeholder until the first external-service Worker arrives.
