# MDK monorepo docs

Use this page to route to the docs you need. 

## Getting started options

- [Connect your own hardware](guides/workers/build-a-worker.md)
- [Quickstart: run the full stack demo](./tutorials/quickstart/full-stack.md)
- [Quickstart: build a dashboard](./tutorials/quickstart/build-a-dashboard.md)
- [Build your mental model in three rungs — observe, interact, build](tutorials/get-started/index.md)
- [Pick your role](#pick-your-role)

## Domains

The monorepo is organized into three development domains:

- [core](../backend/core/docs/README.md) — Kernel, Gateway, MDK SDK, MDK client, mock control service
- [Workers](../backend/workers/README.md) — protocol translators for data sources, e.g., miners, pools, power meters, sensors, containers
- [UI toolkit](../ui/README.md) — headless state and API contracts, React bindings, mining-domain components, and application scaffolding

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
| The vocabulary you need (Kernel, Worker, manager, thing, mock) | [`reference/glossary.md`](reference/glossary.md) |
| Connect Kernel to a device and climb the ladder | [`tutorials/get-started/`](tutorials/get-started/index.md) |
| How Gateway, Kernel, and Workers communicate | [`concepts/control-plane.md`](concepts/control-plane.md) |

### Agent

You are an LLM consuming MDK at runtime.

| Topic | Where |
| --- | --- |
| Worker runtime contracts (machine-readable) | `backend/workers/<family>/<provider>/mdk-contract.json` |
| UI component registry (machine-readable) | `ui/<pkg>/dist/registry.json` (when shipping) |
| Per-workspace agent-ready entry points | [`../backend/workers/docs/AGENT_READY.md`](../backend/workers/docs/AGENT_READY.md), [`../backend/core/docs/AGENT_READY.md`](../backend/core/docs/AGENT_READY.md), [`../ui/AGENTS.md`](../ui/AGENTS.md) |

### Engineer

You build applications on MDK, or integrate a new device / pool / data feed.

MDK has two developer surfaces. A React layer for browser-based operator tools and UIs, and a Node.js layer for backend services,
scripts, and Gateway extensions. Your starting point depends on which you're building.

> [!NOTE]
> The React adapter and the Node.js client do not mirror each other one-to-one. Some Kernel operations — such as
> the write-action flow — have both a React hook and a Node.js `mdk-client` equivalent. Others, like telemetry,
> are exposed through the React adapter as higher-level domain hooks (for example `useMiners`, `useSiteHashrate`)
> with no direct `mdk-client` counterpart. If you are building UI, start with the [React adapter](../ui/packages/react-adapter/README.md); if you are
> building backend, start with [`mdk-client`](../backend/core/client/README.md) — do not expect a symmetric API between the two.

**Start here (all engineers)**

| Topic | Where |
| --- | --- |
| Get started — first runnable example | [`tutorials/get-started/`](tutorials/get-started/index.md) |
| Deployment: connect Workers to a Gateway, run a site | [`guides/deployment/`](guides/deployment/index.md), and the [deployment topology concept](concepts/deployment-topologies.md) |
| Worker runtime contracts (telemetry, commands, health, errors) | `backend/workers/<family>/<provider>/mdk-contract.json` + `USAGE.md` + `examples/` |
| Build a Worker and author its contract | [`guides/workers/build-a-worker.md`](guides/workers/build-a-worker.md) |
| Workers (lifecycle, install pattern) | [`../backend/workers/docs/install-pattern.md`](../backend/workers/docs/install-pattern.md) |
| Runnable site examples | [`examples/backend/site/`](../examples/backend/site/README.md), [`examples/backend/site-single-process/`](../examples/backend/site-single-process/README.md), [`examples/e2e/`](../examples/e2e/README.md), [`examples/full-site/`](../examples/full-site/README.md) |

**React / UI developer** — building browser-based operator UIs on top of MDK

| Topic | Where |
| --- | --- |
| Build a dashboard end to end | [`tutorials/quickstart/build-a-dashboard.md`](tutorials/quickstart/build-a-dashboard.md) |
| UI toolkit overview | [`../ui/README.md`](../ui/README.md) |
| React adapter: stores, hooks, and the `<MdkProvider>` | [`../ui/packages/react-adapter/README.md`](../ui/packages/react-adapter/README.md) |
| Pre-built UI components and blueprints | [`../ui/packages/react-devkit/README.md`](../ui/packages/react-devkit/README.md) |
| Build the Pool Manager UI | [`ui/packages/react-devkit/blueprints/pool-manager.md`](../ui/packages/react-devkit/blueprints/pool-manager.md) |

**Backend / Node.js developer** — building Gateway plugins, backend services, or integrating new hardware

| Topic | Where |
| --- | --- |
| Gateway API surfaces (HTTP, WebSocket, MCP) and how to extend them | [`guides/gateway/`](guides/gateway/index.md) |
| Build a Gateway plugin | [`guides/gateway/plugins.md`](guides/gateway/plugins.md) |
| Call Kernel directly from a Node.js service or script | [`../backend/core/client/README.md`](../backend/core/client/README.md) |
| Start Kernel and Workers in your app | [`../backend/core/mdk/README.md`](../backend/core/mdk/README.md) |
| Core SDK and bootstrap utilities | [`../backend/core/docs/README.md`](../backend/core/docs/README.md) |
| Integrate new hardware (Workers) | [`guides/workers/build-a-worker.md`](guides/workers/build-a-worker.md), then the [install pattern](../backend/workers/docs/install-pattern.md) |
| Worker runtime contracts (telemetry, commands, health, errors) | `backend/workers/<family>/<provider>/mdk-contract.json` + `USAGE.md` + `examples/` |

### Docs maintainer

You change documentation, conventions, or the source-of-truth IA in this repo, see [`reference/maintainers/README.md`](reference/maintainers/README.md).

## Next steps

- Browse [domains directly](#domains)
- For a different UX, browse the published end-user documentation at [docs.mdk.tether.io](https://docs.mdk.tether.io/)
