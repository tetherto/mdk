# MDK

[![Release](https://img.shields.io/github/v/release/tetherto/mdk?display_name=tag&style=flat-square)](https://github.com/tetherto/mdk/releases/tag/v0.3.0)
[![MDK UI CI](https://img.shields.io/github/actions/workflow/status/tetherto/mdk/ui.yaml?branch=main&label=UI%20CI&style=flat-square&logo=github)](https://github.com/tetherto/mdk/actions/workflows/ui.yaml)
[![MDK Core CI](https://img.shields.io/github/actions/workflow/status/tetherto/mdk/core.yaml?branch=main&label=Core%20CI&style=flat-square&logo=github)](https://github.com/tetherto/mdk/actions/workflows/core.yaml)
[![CodeQL](https://github.com/tetherto/mdk/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/tetherto/mdk/actions/workflows/github-code-scanning/codeql)
[![Documentation](https://img.shields.io/badge/docs-mdk.tether.io-2ea44f?style=flat-square)](https://docs.mdk.tether.io)

## Status

⚠️ **Work in Progress**

MDK is under active development and is **not yet considered stable**. 

Current release: [v0.3.0](https://github.com/tetherto/mdk/releases/tag/v0.3.0). 

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Releases](#releases)
- [Getting Started](#get-started)
- [Build and develop](#build-and-develop)
- [Documentation](#documentation)
- [Support](#support)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)

## Overview

[This repository](https://github.com/tetherto/mdk) is the monorepo for the Mining Development Kit [MDK](https://mdk.tether.io/), a JavaScript-based 
SDK that provides a modular and extensible foundation for:

- Monitoring mining infrastructure  
- Controlling devices and containers  
- Collecting telemetry and operational data  
- Building custom mining applications and integrations  

MDK ships as 3 packages:

- [core](backend/core/docs/README.md) — ORK (orchestration kernel), App-node, MDK SDK, IPC client, mock control service
- [workers](backend/workers/README.md) — protocol translators for data sources, e.g., miners, pools, power meters, sensors, containers
- [ui-client](ui/README.md) — headless UI Core and framework adapters

## Architecture

MDK is a Node.js SDK for operating bitcoin mining hardware. Give it device credentials and it polls those devices continuously for telemetry, lets you
send commands to them, and exposes everything through a stable kernel that your agent, app, dashboard, or automation can query over IPC. The hardware
never talks to the app-layer directly, it all goes through MDK:

```
Layer 4 — Browser UI          (Optional dashboard/app layer)
        │  HTTP / WebSocket
        ▼
Layer 3 — App-node            (Your Node.js server)
        │  IPC (UNIX socket)
        ▼
Layer 2 — ORK                 (Orchestration Kernel)
        │  MDK Protocol over Hyperswarm DHT + HRPC
        ▼
Layer 1 — Workers             (Protocol translators)
        │  HTTP + vendor auth
        ▼
Layer 0 — Data sources        (Hardware, external APIs, facility platforms)
```

## Layer 0: data sources

Physical hardware (e.g., miners, power meters, temperature sensors), facility management platforms (e.g., Antspace, Bitdeer), and pool APIs (e.g., 
OceanPool, F2Pool). Workers at Layer 1 translate each source into the common MDK protocol.

## Layer 1: workers

Workers live in [`backend/workers/`](backend/workers/README.md) organized by categories, for example:

| Category | Examples |
|---|---|
| [`miners`](backend/workers/miners/README.md) | [antminer](backend/workers/miners/antminer/README.md) (S19XP, S19XPH, S21, S21PRO), [whatsminer](backend/workers/miners/whatsminer/README.md) (M56S) |
| `minerpools` | ocean, f2pool |
| `power-meter` | abb, satec, schneider, electricity |
| `temperature` | seneca |
| `containers` | antspace, bitdeer, microbt |

Each worker has:

- **A Manager class**, e.g., [`AM_S19XP`](backend/workers/miners/antminer/index.js). Knows how to talk the source's native API. You instantiate it
via [`startWorker()`](backend/core/mdk/index.js).
- **A [`mdk-contract.json`](backend/workers/miners/antminer/mdk-contract.json)**, the engineering source of truth. Declares every telemetry field 
(name, unit, type) and every command (name, params).
- **A [mock server](examples/backend/mdk-e2e/server.js)**, a local HTTP server with canned responses for hardware-free development.

## Layer 2: Orchestration Kernel

Lives in [`backend/core/ork/`](backend/core/ork/index.js). ORK discovers Workers via [Hyperswarm DHT](https://github.com/holepunchto/hyperswarm) and pulls
data from them on a fixed schedule.

| Module | What it does |
|---|---|
| `discovery` | Joins Hyperswarm DHT, finds workers by topic key |
| `transport` | Opens [HRPC](https://github.com/holepunchto/hrpc) channels to each discovered worker |
| `modules` | Device registry, telemetry store, health state |
| `storage` | Persists the registry to disk between restarts |
| `protocol` | Message envelope format for IPC and HRPC |

ORK is **pull-only and passive** — it never pushes to your app. You query it over a UNIX socket (`ork.sock`). It fans the query out to online workers 
and aggregates the response.

## Layer 3: App-node

Lives in [`backend/core/app-node/`](backend/core/app-node/worker.js). The App-node is where your business logic is defined. It's your Node.js server that 
connects to ORK over the UNIX socket 
sends typed queries and receives aggregated responses. You decide what happens to your telemetry data.

```js
// list devices + telemetry
ipc(SOCK, ACTIONS.TELEMETRY_PULL, { query: { type: 'metrics' } }, deviceId)

// what can this device do?
ipc(SOCK, ACTIONS.DEVICE_CAPABILITIES, {}, deviceId)
```

## Layer 4: Browser UI

Lives in [`ui/`](ui/README.md). Optional app layer that composes to give you a fully wired mining dashboard. The browser-facing
read layer on top of whatever your App-node pulls from ORK.

You may use UI Core ([`@tetherto/mdk-ui-core`](ui/packages/ui-core/README.md)), the headless framework-agnostic state layer independently, or
leverage the packages provided for React (Vue, Svelte, and Web Components on the roadmap) whose components consume it directly.

## Releases

The latest development code is available on the [`main`](https://github.com/tetherto/mdk/tree/main) branch. MDK follows [Semantic Versioning 2.0.0](https://semver.org/): `0.y.z` versions are initial development (public API not stable until `1.0.0`); `1.0.0` and above denote a stable public API.

Releases have notes [`docs/reference/release-notes/](docs/reference/release-notes/) and the full version history is
detailed in the [`CHANGELOG.md`](CHANGELOG.md).

## Get started

Pick the path that matches your goal.

### Scaffold a dashboard app (fastest)

One command produces a working Vite + React + MDK app, with the agent-context files (`.mdk/context.md`, Cursor / Claude rules) seeded so an LLM can 
iterate on it from day one:

```bash
npx mdk-ui create my-app
cd my-app
npm run dev                   # http://localhost:5173
```

Then iterate from inside the app:

```bash
npx mdk-ui add feature alerts # full blueprint
npx mdk-ui add page Hashrate  # single page
```

Full CLI reference: [`ui/README.md`](ui/README.md) and the [agent-first quickstart](ui/docs/AGENT_FIRST.md).

### Add MDK to an existing React app

Install the three runtime packages (`@tetherto/mdk-ui-core`, `@tetherto/mdk-react-adapter`, `@tetherto/mdk-react-devkit`) and wrap your app in `<MdkProvider>`. 
Full snippet in [`ui/README.md`](ui/README.md#use-the-toolkit-in-your-app).

### Run the backend stack locally (no hardware)

The [end-to-end demo](examples/backend/README.md#end-to-end-mdk-e2e) starts a mock data source + worker + ORK in one process. Browse
[`examples/backend/`](examples/backend/README.md) for the full catalogue, including the [full-site demo](examples/backend/site/README.md),
the [single-process site demo](examples/backend/site-single-process/README.md), and the [site-monitor UI example](examples/e2e/README.md).

### Integrate a new device, pool, or data feed

Start from a worker's [`mdk-contract.json`](backend/workers/miners/antminer/mdk-contract.json) and the [worker docs](backend/workers/docs/architecture.md).
The [`base`](backend/workers/base/README.md) worker is the template for new categories.

### Agent quick context

If you're an LLM being pointed at this repo, read these three first:

- [`ui/AGENTS.md`](ui/AGENTS.md) — contract overview and a quick recipe
- [`ui/docs/AGENT_FIRST.md`](ui/docs/AGENT_FIRST.md) — manifests, blueprints, registry
- [`examples/backend/README.md`](examples/backend/README.md) — runnable shapes of the backend

## Build and develop

The repo is federated: each domain keeps its own package manager, lockfile, and install scripts, and a thin root `package.json` forwards commands to them. There is no shared root dependency graph, no root workspaces, and no Turbo at the root.

| Domain | Location | Tooling |
| --- | --- | --- |
| UI | [`ui/`](ui/README.md) | npm workspace (`apps/*` + `packages/*`) driven by Turbo |
| Core (backend) | [`backend/core/`](backend/core/README.md) | independent per-process installs via `install-packages.sh` |
| Workers (backend) | [`backend/workers/`](backend/workers/README.md) | independent per-process installs via `install-packages.sh` |

Run any task once from the repo root and it fans out to all three domains:

```bash
npm run setup       # install every domain (UI workspace + backend per-process installs)
npm run build       # build all domains (no-op where a domain has no build step)
npm run test        # test all domains
npm run lint        # lint all domains
npm run typecheck   # typecheck all domains (no-op where a domain has no typecheck step)
```

Each task also has per-domain variants when you only need one: `:ui`, `:core`, `:workers` (e.g. `npm run test:ui`, `npm run lint:core`). Use `npm run ci` instead of `npm run setup` for clean, lockfile-faithful installs in CI, and `npm run clean` to tear down build artifacts and installed dependencies.

> Note: `setup`/`ci` is the one-command installer; there is no root `install` script, so a plain `npm install` at the root installs nothing (the root has no dependencies of its own).

## Documentation

Browse this repo's [documentation](docs/README.md) or **pick your role**:

- New here. Start with the product, then the stack:

| Topic | Where |
| --- | --- |
| What MDK is and why it exists | [`concepts/about.md`](docs/concepts/about.md) |
| How the pieces fit together | [`concepts/architecture.md`](docs/concepts/architecture.md) |

- Engineer. Build applications on MDK, or integrate a new device / pool / data feed:

| Topic | Where |
| --- | --- |
| Worker runtime contracts (telemetry, commands, health, errors) | `backend/workers/<family>/<provider>/mdk-contract.json` + `USAGE.md` + `examples/` |
| Core SDK | [`backend/core/docs/`](backend/core/docs/README.md) |
| Workers (lifecycle, install pattern) | [`backend/workers/docs/`](backend/workers/docs/architecture.md) |
| UI toolkit | [`ui/docs/`](ui/docs/ARCHITECTURE.md) |

- Contributor: Follow the [contribution flow](CONTRIBUTING.md)

Alternatively, browse [docs.mdk.tether.io](https://docs.mdk.tether.io/): published end-user documentation.

> Request updates to docs via [`docs-needed` issue](https://github.com/tetherto/mdk/issues/new?template=docs-needed.yml).
> Update documentation in this repository directly via the [contribution flow](CONTRIBUTING.md).

## Support

For support, raise a [GitHub Issue](https://github.com/tetherto/mdk/issues) or chat to the community on [Discord](https://discord.com/invite/tetherdev).

## Contributing

Contributions are welcome.

### How to contribute

1. Fork this repository.
2. Clone your fork locally.
3. Create a new branch.
4. Make your changes.
5. Submit a Pull Request.

Learn more about [contributing](CONTRIBUTING.md).

For security vulnerability reporting, see the [Security policy](SECURITY.md).

## License

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](https://github.com/tetherto/mdk/blob/main/LICENSE)

MDK is released under [Apache License Version 2.0](LICENSE).

## Acknowledgments

Built with contributions from the mining operations team.
