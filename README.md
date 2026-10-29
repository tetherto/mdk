# MDK

[![Release](https://img.shields.io/github/v/release/tetherto/mdk?display_name=tag&style=flat-square)](https://github.com/tetherto/mdk/releases/tag/v0.13.0)
[![CI](https://img.shields.io/github/actions/workflow/status/tetherto/mdk/ci.yml?branch=main&label=CI&style=flat-square&logo=github)](https://github.com/tetherto/mdk/actions/workflows/ci.yml)
[![CodeQL](https://github.com/tetherto/mdk/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/tetherto/mdk/actions/workflows/github-code-scanning/codeql)
[![Documentation](https://img.shields.io/badge/docs-mdk.tether.io-2ea44f?style=flat-square)](https://docs.mdk.tether.io)

## Status

⚠️ **Work in Progress**

MDK is under active development and is **not yet considered stable**.

Current release [v0.13.0](https://github.com/tetherto/mdk/releases/tag/v0.13.0).

> v0.13.0 will be released in stages. First release is the code followed by patches to release
> the documentation and any hotfixes.

## Table of contents

- [Overview](#overview)
- [Quickstart](#quickstart)
  - [1. Set up](#1-set-up)
  - [2. Run the full site on mocks](#2-run-the-full-site-on-mocks)
  - [3. Open the UI](#3-open-the-ui)
  - [4. Connect an agent over MCP](#4-connect-an-agent-over-mcp)
  - [5. Create a Worker](#5-create-a-worker)
  - [6. Create a dashboard](#6-create-a-dashboard)
  - [Next steps](#next-steps)
  - [Find your lane](#find-your-lane)
  - [Agents](#agents)
- [Build and develop](#build-and-develop)
- [Documentation](#documentation)
- [Support](#support)
- [Contributing](#contributing)
- [Architecture](#architecture)
- [Releases](#releases)
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

## Quickstart

This quickstart runs entirely from a `git clone`: it needs no MDK package from the npm registry. It takes you from a clean machine to the full demo
site on mock hardware, its UI, an AI agent talking to the site over MCP, and then your own Worker and dashboard.

**Requirements:** Node.js >=24, npm 11 [(< 12)](docs/reference/environment.md#why-npm-stays-below-12), git, and PM2 (`npm install -g pm2`) for the
demo site. Steps 1 to 4 use ports `3000` and `3101`; steps 5 and 6 use `3847`, `3848` and `3030`.

> [!NOTE]
> If Kernel, Gateway, Worker or app are unfamiliar terms, the [architecture overview](docs/concepts/architecture.md) defines them. You don't need it
> to finish the quickstart.

### 1. Set up

```bash
git clone https://github.com/tetherto/mdk.git
cd mdk

(cd examples/mvp-site && npm run setup)   # installs every domain, builds the UI packages, writes the demo config
npm run build -w @tetherto/mdk-cli        # build the `mdk` CLI
npm rebuild @tetherto/mdk-cli             # link the `mdk` command now that it is built
export PATH="$PWD/node_modules/.bin:$PATH"
mdk --version
```

The first run takes a few minutes. The `export` puts `mdk` on your `PATH` for this terminal only; run the same line from the `mdk` directory in any
other terminal you open, or add it to your shell profile with the absolute path.

### 2. Run the full site on mocks

```bash
cd examples/mvp-site
npm start      # starts every component under PM2, then exits
pm2 list       # wait until every app shows `online`
```

This boots a Kernel, a Gateway HTTP API, Whatsminer, Antminer and SealMiner Workers, Ocean, EMCD, SpiderPool and Foundry pool Workers,
a SATEC power meter Worker, their mock device servers, an MCP server and a React dashboard. Every device is a mock server speaking the real
wire protocol, and all telemetry values are synthetic. Check the site through its API:

```bash
curl -s http://localhost:3000/site/overview | jq '{miners: (.miners|length), pools: (.pools|length), powermeters: (.powermeters|length)}'
```

Expected output:

```text
{
  "miners": 10,
  "pools": 4,
  "powermeters": 1
}
```

The pool Workers take 15 to 20 seconds to settle, so retry the command if it reports fewer than four pools.

### 3. Open the UI

Open `http://localhost:3000/` in a browser. The Dashboard, Containers, Monitoring, Pools and Control pages show live hashrate, power and per-device
status for the mock fleet. [UI pages](examples/mvp-site/README.md#ui-pages) describes what each one shows.

### 4. Connect an agent over MCP

The site serves its data as tools on `http://127.0.0.1:3101/mcp`. For an agent that reads a project-level `.mcp.json`, such as Claude Code, copy the
example entry and start the agent from the example directory:

```bash
cp .mcp.json.example .mcp.json
claude
```

For any other MCP client, add `http://127.0.0.1:3101/mcp` as an HTTP server. Then ask `How is the site doing right now?`. The agent calls
`summarize_site` and reports 8 Workers and 15 devices, all online. The MCP server withholds write tools by default, so an agent can read the fleet
but cannot change it.

Stop the site before the next step:

```bash
npm run stop:pm2
cd ../..
```

### 5. Create a Worker

A project of your own lives outside the checkout and is described by an `mdk.yaml` stack spec. From any other directory:

```bash
mkdir ~/my-site && cd ~/my-site
cat > mdk.yaml <<'YAML'
apiVersion: mdk/v1
kind: Stack
metadata:
  name: my-site
spec:
  kernel: { port: 3848 }
  gateway: { port: 3847 }
  workers: []
  apps: []
YAML

mdk create worker rig   # scaffolds workers/rig with a mock device and adds it to mdk.yaml
mdk rbac init           # binds the CLI and the Gateway to the access policy; mdk run refuses to boot a Kernel nobody could hand a policy to
mdk run                 # boots the Kernel, the rig Worker on its mock device and the Gateway
```

Expected output ends with:

```text
✔ gateway listening on http://localhost:3847

Stack running. Press Ctrl+C to stop.
```

In a second terminal, from `~/my-site`, with `mdk` on your `PATH`, check the stack:

```bash
mdk status
```

Expected output ends with:

```text
  WORKER  REGISTERED  STATE  HEALTH   DEVICES
  rig     yes         READY  HEALTHY  1

✔ Health: healthy
```

`mdk create worker` links the Worker to the MDK packages in your checkout, so keep the checkout where it is. To point the Worker at real hardware,
edit `workers/rig/mdk-contract.json` and its `src/` handlers.

### 6. Create a dashboard

In the second terminal, from `~/my-site`:

```bash
mdk create dashboard                    # copies the MDK dashboard into apps/dashboard and installs it
mdk user add admin --admin              # prompts for a password; the Kernel from step 5 must still be running
mdk run dashboard                       # starts the dashboard dev server
```

Open `http://localhost:3030/` and sign in as `admin` with that password. The dashboard talks to the Gateway on `:3847` and shows the `rig` Worker's
device. Press Ctrl+C in both terminals to stop everything. To reset the project's state, delete `~/my-site/.mdk/`.

### Next steps

- [Run a mining site end to end](docs/tutorials/run-a-site.md): go deeper on the demo site, including live pool accounts and the agent prompts
- [Build your first app with a UI](docs/tutorials/build-your-first-app.md): add an app with its own route and React page to a project
- [Wire a dashboard by hand](docs/tutorials/build-a-dashboard.md): learn what `mdk create dashboard` scaffolds by assembling each piece yourself
- [Build a Worker](docs/guides/workers/build-a-worker.md): connect your own hardware by authoring a `mdk-contract.json`
- [Use the `mdk` CLI](packages/cli/README.md): every command, the access policy, users and service accounts
- [Choose a deployment shape](docs/guides/deployment/index.md): run a site as supervised services or another topology
- [Work with agents](docs/guides/agent/index.md): manage a site with a conversational operator agent
- [Browse all documentation](docs/README.md): tutorials, guides and reference

### Find your lane

MDK ships a backend SDK and an optional dashboarding layer. Find your lane:

- **I'm a hardware provider**: where do I start? Build a Worker and author its [`mdk-contract.json`](docs/guides/workers/build-a-worker.md)
- **I'm a site operator**: how do I connect my Workers to a Gateway? Run an MDK site as a
  [supervised services](docs/guides/deployment/run-all-workers-site.md), or [choose another deployment shape](docs/guides/deployment/index.md)
- **I'm a site operator** how do I manage my site with a conversational agent?: start from the [operator agent guides](docs/guides/agent/index.md)
- **I'm an app developer building a React UI**: start from the [UI toolkit](ui/README.md#getting-started), or add MDK to an existing app
- **I'm an app developer building backend services or apps**: run the backend stack locally or start with
  the [Gateway API surfaces](docs/guides/gateway/index.md)
- **I'm an app developer building a dashboard end to end**: follow [build a dashboard](docs/tutorials/build-a-dashboard.md), or scaffold one against
  a running stack with [`mdk create dashboard`](packages/cli/README.md) (`@tetherto/mdk-cli`)
- **I'm building with AI**: how does my agent work with MDK? Teach it MDK with [`mdk skill add`](docs/guides/ui/agent-skills.md), then read
  the [agent entry points](docs/README.md#agent)

### Agents

If you are an LLM being pointed at this repo, read these first:

- [`packages/mdk-skill/README.md`](packages/mdk-skill/README.md): install Agent Skills so a coding agent (Cursor, Claude Code) is fluent in MDK conventions
- [`backend/core/mcp/README.md`](backend/core/mcp/README.md): connect an agent to MDK over MCP
- [`ui/AGENTS.md`](ui/AGENTS.md): contract overview and a quick recipe
- [`ui/docs/AGENT_FIRST.md`](ui/docs/AGENT_FIRST.md): manifests, blueprints, registry
- [`backend/workers/docs/install-pattern.md`](backend/workers/docs/install-pattern.md): boot any Worker and run it against its bundled mock with `npm run mock`

## Build and develop

The repo root is a real npm workspace: every `backend/core/*`, `backend/workers/**` and `backend/tests/*`
package, the standalone `packages/*` tools, and `examples/mvp-site` are workspace members, so a single
`npm install` (or `npm ci`) at the root installs and links them all together. `ui/` stays a separate, nested npm workspace
with its own `apps/*` + `packages/*` members and its own lockfile; the root itself has no Turbo configuration.

| Domain  | Location                                        | Tooling                                                                                  |
| ------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------- |
| UI      | [`ui/`](ui/README.md)                           | npm workspace (`apps/*` + `packages/*`) driven by Turbo                                  |
| Core    | [`backend/core/`](backend/core/README.md)       | root npm workspace member, installed via a plain `npm install`/`npm ci` at the repo root |
| Workers | [`backend/workers/`](backend/workers/README.md) | root npm workspace member, installed via a plain `npm install`/`npm ci` at the repo root |

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

The following example trees ship with the repo — they answer different questions, so start from the one that matches what you are doing:

| Example                                                                       | Use it for                                                                                                         | Status                          |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------- |
| [`examples/mvp-site/`](examples/mvp-site/README.md)                           | The end-to-end demo: Kernel + Workers + Gateway + React dashboard + MCP, each as a separate PM2-supervised process | Actively developed — start here |
| [`examples/mdk-ui-shell-template/`](examples/mdk-ui-shell-template/README.md) | A runnable sign-in-gated operator shell, and the source `mdk create dashboard` copies when scaffolding a new app   | Maintained as a template        |

To run a single Worker against a mock device with no site around it, start the mock with `npm run mock` and follow the Worker's guide,
for example [run an Avalon Worker](docs/guides/miners/run-avalon-worker.md).

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

## Architecture

[MDK](docs/concepts/architecture.md) uses device credentials to collect telemetry continuously, dispatch commands, and expose device state through the
Kernel to agents, applications, dashboards, and automation services. At Layer 1, Workers translate vendor protocols for miners, power meters, sensors,
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

The full version history is available as a [`CHANGELOG.md`](CHANGELOG.md).

## License

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](https://github.com/tetherto/mdk/blob/main/LICENSE)

MDK is released under [Apache License Version 2.0](LICENSE).

## Acknowledgments

Built with contributions from the Mining Operations team.
