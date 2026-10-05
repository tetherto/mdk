# MDK

[![Release](https://img.shields.io/github/v/release/tetherto/mdk?display_name=tag&style=flat-square)](https://github.com/tetherto/mdk/releases/tag/v0.10.0)
[![CI](https://img.shields.io/github/actions/workflow/status/tetherto/mdk/ci.yml?branch=main&label=CI&style=flat-square&logo=github)](https://github.com/tetherto/mdk/actions/workflows/ci.yml)
[![CodeQL](https://github.com/tetherto/mdk/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/tetherto/mdk/actions/workflows/github-code-scanning/codeql)
[![Documentation](https://img.shields.io/badge/docs-mdk.tether.io-2ea44f?style=flat-square)](https://docs.mdk.tether.io)

## Status

⚠️ **Work in Progress**

MDK is under active development and is **not yet considered stable**.

Current release [v0.10.0](https://github.com/tetherto/mdk/releases/tag/v0.10.0).

## Table of contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Releases](#releases)
- [Get Started](#get-started)
  - [Run the demo site](#run-the-demo-site)
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

- [Core](backend/core/docs/README.md) — Kernel, Gateway, MCP server, MDK SDK, MDK client
- [Workers](backend/workers/README.md) — protocol translators for data sources, e.g., miners, pools, power meters, sensors, containers
- [UI toolkit](ui/README.md) — headless state and API contracts, React bindings, mining-domain components, and application scaffolding

You drive MDK via the [Gateway](backend/core/gateway/README.md). The Gateway is where your business logic is defined
and MDK can be extended. It's your Node.js server that connects to the Kernel to receive data from, and send
instructions to, Workers.

## Architecture

[MDK](docs/concepts/architecture.md) uses device credentials to collect telemetry continuously, dispatch commands, and expose device state through the
Kernel to agents,applications, dashboards, and automation services. At Layer 1, Workers translate vendor protocols for miners, power meters, sensors,
facility platforms, and pool APIs into the MDK Protocol.

Through the Gateway — and, for AI agents, the standalone MCP server — dashboards and custom solutions monitor device state and issue authorized control commands
through a consistent API.

That means that you can connect any physical hardware (e.g., miners, power meters, temperature sensors), facility management platforms
(e.g., Antspace, Bitdeer), or pool APIs (e.g., OceanPool, F2Pool) by defining their Workers (at Layer 1), translating each source
into the common MDK protocol. Furthermore, you have full control over configuring your deployments as [single-process, local multi-process, or
distributed deployments](docs/concepts/deployment-topologies.md).

```text
Layer 4 — Browser UI          (Optional dashboard/app layer)
        │  HTTP (polling)
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

Use the packages together for a complete operator dashboard. You may start from the
[`mdk-ui-shell` template](examples/mdk-ui-shell-template/README.md), follow the
[agent-oriented workflow](ui/docs/AGENT_FIRST.md), or directly compose the runtime packages
in your own application structure.

## Releases

The latest development code is available on the [`main`](https://github.com/tetherto/mdk/tree/main) branch. MDK follows
[Semantic Versioning 2.0.0](https://semver.org/): `0.y.z` versions are initial development (public API not stable until `1.0.0`); `1.0.0` and
above denote a stable public API.

Releases have notes [`docs/reference/release-notes/`](docs/reference/release-notes/) and the full version history is
available as a [`CHANGELOG.md`](CHANGELOG.md).

## Get started

> [!NOTE]
> [Try the demo](./docs/tutorials/run-a-site.md): run the full MDK stack: multiple configured Workers across a range of device families,
> their mock device servers, a Gateway HTTP API, and a React dashboard, all with one command

### Run the demo site

The fastest way to see MDK working end to end. This boots the
[full-site example](examples/full-site/README.md): a Kernel, 11 real Workers, their mock device servers, a Gateway HTTP API,
and a React dashboard.

**Requirements:** Node.js >=24, npm 11 [(< 12)](docs/reference/environment.md#why-npm-stays-below-12).

```bash
git clone git@github.com:tetherto/mdk.git
cd mdk/examples/full-site

npm run setup                  # one time: installs every workspace and builds the devkit packages
node start.js --miners 3       # small fleet — fastest first boot
```

`npm run setup` walks the root workspace (`backend/core/*`, `backend/workers/*`), the `ui/` workspace, this example, and its
dashboard, then builds the devkit packages the dashboard imports. First run takes 1-2 minutes; later starts skip it.

Boot takes 30-60s. Wait for these lines:

```text
  Kernel ready — HRPC key 74d6ba2cccbbf54b…
  Workers registered: 11 (39 devices)
  Gateway ready — http://localhost:3007 (HRPC → Kernel)
  Site live: 9 miners, containers [container-antspace, container-bitdeer], site power 100608 W, 2 pool(s)
  UI starting — http://localhost:3040
  MCP server starting — http://localhost:3008/mcp
```

Then open the dashboard:

| Surface | URL |
| --- | --- |
| Dashboard (UI) | `http://localhost:3040` |
| Gateway API | `http://localhost:3007` |
| MCP server | `http://localhost:3008/mcp` |

Check the API directly:

```bash
curl -s http://localhost:3007/site/overview | jq '{miners: (.miners|length), containers: (.containers|length), pools: (.pools|length)}'
```

Stop with `Ctrl-C`. State persists under `examples/full-site/.mdk-data/`, so the next `node start.js` resumes the same site
without re-seeding — delete that directory to start clean.

> [!NOTE]
> Every device is a **mock server speaking the real wire protocol** (Modbus TCP, MQTT, REST, TCP), not a simulated manager. The
> Workers run their genuine `connect()` and telemetry paths; only the endpoints are localhost instead of hardware. All telemetry
> values are synthetic.

Useful flags: `--miners N` (per family, default 10 → 30 total), `--no-ui` (backend only), `DEBUG=mdk:example:*` (verbose boot).
Above ~30 miners raise the descriptor limit first with `ulimit -n 4096`. For a multi-process REPL that supervises each component
separately, run `node cli.js` instead. Full walkthrough: [Run a mining site end to end](docs/tutorials/run-a-site.md).

### Find your lane

MDK ships a backend SDK and an optional dashboarding layer. Find your lane:

- **I'm a hardware provider**: where do I start? Build a Worker and author its [`mdk-contract.json`](docs/guides/workers/build-a-worker.md)
- **I'm a site operator**: how do I connect my Workers to a Gateway? Run an MDK site as a
[single process](docs/guides/deployment/run-single-process-site.md), or [choose another deployment shape](docs/guides/deployment/index.md)
- **I'm a site operator** how do I manage my site with a conversational agent?: start from the [operator agent guides](docs/guides/agent/index.md)
- **I'm an app developer building a React UI**: start from the [UI toolkit](ui/README.md#getting-started), or add MDK to an existing app
- **I'm an app developer building backend services or Gateway plugins**: run the [backend stack locally](examples/backend/README.md) or start with
the [Gateway API surfaces](docs/guides/gateway/index.md)
- **I'm an app developer building a dashboard end to end**: follow [build a dashboard](docs/tutorials/build-a-dashboard.md), or scaffold one against
a running stack with [`mdk create dashboard`](packages/cli/README.md) (`@tetherto/mdk-cli`)
- **I'm building with AI**: how does my agent work with MDK? Read the [agent entry points](docs/README.md#agent)

### Agents

If you are an LLM being pointed at this repo, read these first:

- [`packages/mdk-skill/README.md`](packages/mdk-skill/README.md): install Agent Skills so a coding agent (Cursor, Claude Code) is fluent in MDK conventions
- [`backend/core/mcp/README.md`](backend/core/mcp/README.md): connect an agent to MDK over MCP
- [`ui/AGENTS.md`](ui/AGENTS.md): contract overview and a quick recipe
- [`ui/docs/AGENT_FIRST.md`](ui/docs/AGENT_FIRST.md): manifests, blueprints, registry
- [`examples/backend/README.md`](examples/backend/README.md): catalogue of runnable example backends, each with a start command

## Build and develop

The repo root is a real npm workspace: every `backend/core/*`, `backend/plugins/*`, `backend/workers/**` and `backend/tests/*`
package, the standalone `packages/*` tools, and `examples/full-site` + `examples/mvp-site` are workspace members, so a single
`npm install` (or `npm ci`) at the root installs and links them all together. `ui/` stays a separate, nested npm workspace
with its own `apps/*` + `packages/*` members and its own lockfile; the root itself has no Turbo configuration.

| Domain    | Location                                  | Tooling                                                 |
| --------- | ----------------------------------------- | ------------------------------------------------------- |
| UI        | [`ui/`](ui/README.md)                     | npm workspace (`apps/*` + `packages/*`) driven by Turbo |
| Core      | [`backend/core/`](backend/core/README.md) | root npm workspace member, installed via a plain `npm install`/`npm ci` at the repo root |
| Workers   | [`backend/workers/`](backend/workers/README.md) | root npm workspace member, installed via a plain `npm install`/`npm ci` at the repo root |

Run any task once from the repo root and it fans out to all three domains:

```bash
npm run setup       # install every domain (UI workspace install and a single root npm install)
npm run build       # build all domains (no-op where a domain has no build step)
npm run test        # test all domains
npm run lint        # lint all domains
npm run typecheck   # typecheck all domains (no-op where a domain has no typecheck step)
```

The only per-domain variant left is `:ui` (e.g. `npm run test:ui`, `npm run lint:ui`); everything else runs via `--workspaces` under
the unqualified script name. Use `npm run ci` instead of `npm run setup` for clean, lockfile-faithful installs in CI, and `npm run clean`
to tear down the UI's build artifacts and installed dependencies; most backend and example packages don't yet define a `clean` script.

### Examples

Four example trees ship with the repo. All four are maintained — none is deprecated — but they answer different questions,
so start from the one that matches what you are doing:

| Example                                               | Use it for                  | Status      |
| ----------------------------------------------------- | --------------------------- | ----------- |
| [`examples/full-site/`](examples/full-site/README.md) | The canonical end-to-end demo: Kernel + 11 Workers + Gateway + React dashboard + MCP, in one process or an interactive REPL | Actively developed — start here |
| [`examples/backend/`](examples/backend/README.md)     | Per-family backend snippets (miners, containers, power meters, sensors, pools, kernel, plugin e2e) with no UI | Actively developed     |
| [`examples/mvp-site/`](examples/mvp-site/README.md)   | The same fleet as separate PM2-supervised processes, for deployment-shaped experiments | Maintained; overlaps `full-site`, which is the richer of the two |
| [`examples/mdk-ui-shell-template/`](examples/mdk-ui-shell-template/README.md) | A runnable sign-in-gated operator shell, and the source `mdk create dashboard` copies when scaffolding a new app | Maintained as a template |

> [!NOTE]
> Apps scaffolded into `ui/apps/<name>/` are gitignored except for `apps/catalog`, but they are still npm workspace
> members, so a stale one gets picked up by the next `npm install` and written into the tracked `ui/package-lock.json`.
> Delete scaffolds you are done with rather than leaving them in the tree.

> Note: `setup`/`ci` fan out to `ui/` (via the `:ui` variant) and then run `--workspaces` across every backend/example package in
> one go — `backend/core` and `backend/workers` packages are root workspace members, so a plain `npm install` (or `npm ci`) at the
> root installs and links them directly. `ui/` stays outside the root workspace and needs its own `npm --prefix ui install`.

### Documentation

Browse this repo's [documentation](docs/README.md) or the published end-user documentation [docs.mdk.tether.io](https://docs.mdk.tether.io/) which
consumes pages from this repo.

> - Request updates to docs via [`docs-needed` issue](https://github.com/tetherto/mdk/issues/new?template=docs-needed.yml)
> - Update documentation in this repository directly via the [contribution flow](CONTRIBUTING.md)

#### Support

For support, raise a [GitHub Issue](https://github.com/tetherto/mdk/issues) or chat to the community on [Discord](https://discord.com/invite/tetherdev).

### Contributing

Contributions are welcome. Follow the [contribution guide](CONTRIBUTING.md) for setup, branch conventions, testing, and pull-request requirements.

For security vulnerability reporting, see the [Security policy](SECURITY.md).

## License

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](https://github.com/tetherto/mdk/blob/main/LICENSE)

MDK is released under [Apache License Version 2.0](LICENSE).

## Acknowledgments

Built with contributions from the Mining Operations team.
