# MDK

[![Release](https://img.shields.io/github/v/release/tetherto/mdk?display_name=tag&style=flat-square)](https://github.com/tetherto/mdk/releases/tag/v0.5.0)
[![CI](https://img.shields.io/github/actions/workflow/status/tetherto/mdk/ci.yml?branch=main&label=CI&style=flat-square&logo=github)](https://github.com/tetherto/mdk/actions/workflows/ci.yml)
[![CodeQL](https://github.com/tetherto/mdk/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/tetherto/mdk/actions/workflows/github-code-scanning/codeql)
[![Documentation](https://img.shields.io/badge/docs-mdk.tether.io-2ea44f?style=flat-square)](https://docs.mdk.tether.io)

## Status

⚠️ **Work in Progress**

MDK is under active development and is **not yet considered stable**. 

Current release [v0.5.0](https://github.com/tetherto/mdk/releases/tag/v0.5.0). 

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Releases](#releases)
- [Get Started](#get-started)
- [Build and develop](#build-and-develop)
- [Documentation](#documentation)
- [Support](#support)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)

## Overview

[This repository](https://github.com/tetherto/mdk) is the monorepo for the Mining Development Kit [MDK](https://mdk.tether.io/). MDK is a Node.js SDK 
for operating bitcoin mining hardware, providing a modular and extensible foundation for:

- Monitoring mining infrastructure  
- Controlling devices and containers  
- Collecting telemetry and operational data  
- Building custom mining applications and integrations  

The monorepo is organized into three development domains:

- [core](backend/core/docs/README.md) — Kernel, Gateway, MDK SDK, MDK client, mock control service
- [Workers](backend/workers/README.md) — protocol translators for data sources, e.g., miners, pools, power meters, sensors, containers
- [UI toolkit](ui/README.md) — headless state and API contracts, React bindings, mining-domain components, and application scaffolding

You drive MDK via the [Gateway](backend/core/gateway/README.md). The Gateway is where your business logic is defined
and MDK can be extended. It's your Node.js server that connects to the Kernel to receive data from, and send
instructions to, Workers.

## Architecture

[MDK](docs/concepts/architecture.md) uses device credentials to collect telemetry continuously, dispatch commands, and expose device state through the 
Kernel to agents,applications, dashboards, and automation services. At Layer 1, Workers translate vendor protocols for miners, power meters, sensors, 
facility platforms, and pool APIs into the MDK Protocol.

Through the Gateway, AI agents, dashboards, and custom solutions monitor device state and issue authorized control commands 
through a consistent API.

That means that you can connect any physical hardware (e.g., miners, power meters, temperature sensors), facility management platforms 
(e.g., Antspace, Bitdeer), or pool APIs (e.g., OceanPool, F2Pool) by defining their Workers (at Layer 1), translating each source 
into the common MDK protocol. Furthermore, you have full control over configuring your deployments as [single-process, local multi-process, or
distributed deployments](docs/concepts/deployment-topologies.md).

```
Layer 4 — Browser UI          (Optional dashboard/app layer)
        │  HTTP / WebSocket
        ▼
Layer 3 — Gateway            (Your Node.js server)
        │  HRPC (@hyperswarm/rpc)
        ▼
Layer 2 — Kernel              (Orchestration Kernel)
        │  MDK Protocol over HRPC
        ▼
Layer 1 — Workers             (Protocol translators)
        │  HTTP + vendor auth
        ▼
Layer 0 — Data sources        (Hardware, external APIs, facility platforms)
```

### UI application layer

MDK can run without a UI, but the UI toolkit is a first-class development surface for operator applications. It connects
dashboards and control interfaces to the Gateway without requiring applications to implement the MDK Protocol or hardware
integrations directly.

- [`@tetherto/mdk-ui-foundation`](ui/packages/ui-foundation/README.md) provides framework-independent state, API contracts, and query helpers
- [`@tetherto/mdk-react-adapter`](ui/packages/react-adapter/README.md) connects React applications to Gateway data and actions
- [`@tetherto/mdk-react-devkit`](ui/packages/react-devkit/README.md) provides reusable UI primitives and mining-domain components
- [`mdk-ui`](ui/packages/cli/README.md) scaffolds applications, pages, and features

Use the packages together for a complete operator dashboard. You may develop your dashboards via the 
CLI reference: [`mdk-ui`](ui/packages/cli/README.md), the [agent-oriented workflow](ui/docs/AGENT_FIRST.md), or directly compose the runtime packages 
in your own application structure.

## Releases

The latest development code is available on the [`main`](https://github.com/tetherto/mdk/tree/main) branch. MDK follows 
[Semantic Versioning 2.0.0](https://semver.org/): `0.y.z` versions are initial development (public API not stable until `1.0.0`); `1.0.0` and 
above denote a stable public API.

Releases have notes [`docs/reference/release-notes/](docs/reference/release-notes/) and the full version history is
available as a [`CHANGELOG.md`](CHANGELOG.md).

## Get started

> [!NOTE]
> [Try the demo](./docs/tutorials/quickstart/full-stack.md): run the full MDK stack: multiple configured Workers across a range of device families, 
> their mock device servers, a Gateway HTTP API, and a React dashboard, all with one command

MDK ships a backend SDK and an optional dashboarding layer. Find your lane:

- **I'm a hardware provider**: where do I start? Build a Worker and author its [`mdk-contract.json`](docs/guides/workers/build-a-worker.md)
- **I'm a site operator**: how do I connect my Workers to a Gateway? Run an MDK site as a 
[single process](docs/guides/deployment/run-single-process-site.md), or [choose another deployment shape](docs/guides/deployment/index.md)
- **I'm an app developer building a React UI**: scaffold or add MDK to an existing app with the [UI toolkit and CLI](ui/README.md#getting-started)
- **I'm an app developer building backend services or Gateway plugins**: run the [backend stack locally](examples/backend/README.md) or start with 
the [Gateway API surfaces](docs/guides/gateway/index.md)
- **I'm an app developer building a dashboard end to end**: follow [Build a dashboard](docs/tutorials/quickstart/build-a-dashboard.md)
- **I'm building with AI**: how do I point an agent at MDK? Read the [agent entry points](docs/README.md#agent)

### Agents

If you are an LLM being pointed at this repo? Read these three first:

- [`ui/AGENTS.md`](ui/AGENTS.md): contract overview and a quick recipe
- [`ui/docs/AGENT_FIRST.md`](ui/docs/AGENT_FIRST.md): manifests, blueprints, registry
- [`examples/backend/README.md`](examples/backend/README.md): runnable shapes of the backend

## Build and develop

The repo is federated: each domain keeps its own package manager, lock file, and install scripts, and a thin root `package.json`
forwards commands to them. The root has no shared dependency graph, workspaces, or Turbo configuration.

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

Each task also has per-domain variants when you only need one: `:ui`, `:core`, `:workers` (e.g. `npm run test:ui`, `npm run lint:core`). Use 
`npm run ci` instead of `npm run setup` for clean, lockfile-faithful installs in CI, and `npm run clean` to tear down build artifacts and 
installed dependencies.

To run the supported Worker fleet with mock devices as separate PM2 or Docker
processes, use [`examples/site-backend/`](examples/site-backend/README.md).

> Note: `setup`/`ci` is the one-command installer; there is no root `install` script, so a plain `npm install` at the root installs nothing 
> (the root has no dependencies of its own).

### Documentation

Browse this repo's [documentation](docs/README.md) or the published end-user documentation [docs.mdk.tether.io](https://docs.mdk.tether.io/) which 
consumes pages from this repo. 

> Request updates to docs via [`docs-needed` issue](https://github.com/tetherto/mdk/issues/new?template=docs-needed.yml).
> Update documentation in this repository directly via the [contribution flow](CONTRIBUTING.md).

#### Support

For support, raise a [GitHub Issue](https://github.com/tetherto/mdk/issues) or chat to the community on [Discord](https://discord.com/invite/tetherdev).

### Contributing

Contributions are welcome. Follow the [contribution guide](CONTRIBUTING.md) for setup, branch conventions, testing, and pull-request requirements.

For security vulnerability reporting, see the [Security policy](SECURITY.md).

## License

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](https://github.com/tetherto/mdk/blob/main/LICENSE)

MDK is released under [Apache License Version 2.0](LICENSE).

## Acknowledgments

Built with contributions from the mining operations team.
