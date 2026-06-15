# MDK monorepo docs

Use this page to route to the docs you need. 

## Getting started options

- Browse [packages directly](#packages)
- [Get started in three rungs — observe, interact, build](tutorials/get-started/index.md)
- [Pick your role](#pick-your-role)

## Packages

- [core](../backend/core/docs/README.md) — ORK (orchestration kernel), App-node, MDK SDK, IPC client, mock control service
- [workers](../backend/workers/README.md) — protocol translators for data sources, e.g., miners, pools, power meters, sensors, containers
- [ui-client](../ui/README.md) — headless UI Core and framework adapters

> Per-artefact facts live next to code under `*/packages/**/<artefact>/`, not in `docs/`. 
> Workers ship `mdk-contract.json` (existing runtime contract); UI ships `dist/registry.json` (generated from JSDoc tags on source).

## Pick your role

- [New here — what is this?](#new-here)
- [Agent](#agent)
- [Engineer](#engineer)
- [Docs maintainer](#docs-maintainer)

### New here

Start with the product, then the stack, then run something.

| Topic | Where |
| --- | --- |
| What MDK is and why it exists | [`concepts/about.md`](concepts/about.md) |
| How the pieces fit together | [`concepts/architecture.md`](concepts/architecture.md) |
| The vocabulary you need (ORK, worker, manager, thing, mock) | [`concepts/terminology.md`](concepts/terminology.md) |
| Connect ORK to a device and climb the ladder | [`tutorials/get-started/`](tutorials/get-started/index.md) |

### Agent

You are an LLM consuming MDK at runtime.

| Topic | Where |
| --- | --- |
| Worker runtime contracts (machine-readable) | `backend/workers/<family>/<provider>/mdk-contract.json` |
| UI component registry (machine-readable) | `ui/<pkg>/dist/registry.json` (when shipping) |
<!-- | Per-workspace agent-ready entry points | `*/packages/<workspace>/docs/AGENT_READY.md` | -->

### Engineer

You build applications on MDK, or integrate a new device / pool / data feed.

| Topic | Where |
| --- | --- |
| Getting started — first runnable example | [`tutorials/get-started/`](tutorials/get-started/index.md) |
| Deployment: single process vs. many (deployment topology) | [`concepts/deployment-topologies.md`](concepts/deployment-topologies.md) |
| Runnable site examples | [`examples/core/site/`](../examples/core/site/README.md), [`examples/core/site-single-process/`](../examples/core/site-single-process/README.md), [`examples/e2e/`](../examples/e2e/README.md) |
| Worker runtime contracts (telemetry, commands, health, errors) | `backend/workers/<family>/<provider>/mdk-contract.json` + `USAGE.md` + `examples/` |
| Core SDK | [`../backend/core/docs/architecture.md`](../backend/core/docs/architecture.md) |
| Workers (lifecycle, install pattern) | [`../backend/workers/docs/install-pattern.md`](../backend/workers/docs/install-pattern.md) |
| UI toolkit | [`../ui/README.md`](../ui/README.md) |

### Docs maintainer

You change documentation, conventions, or the source-of-truth IA in this repo, see [`reference/maintainers/README.md`](reference/maintainers/README.md).

Alternatively, browse the published end-user documentation at [docs.mdk.tether.io](https://docs.mdk.tether.io/).
