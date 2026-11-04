# MDK

[![Release](https://img.shields.io/github/v/release/tetherto/mdk?display_name=tag&style=flat-square)](https://github.com/tetherto/mdk/releases/tag/v0.13.1)
[![CI](https://img.shields.io/github/actions/workflow/status/tetherto/mdk/ci.yml?branch=main&label=CI&style=flat-square&logo=github)](https://github.com/tetherto/mdk/actions/workflows/ci.yml)
[![CodeQL](https://github.com/tetherto/mdk/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/tetherto/mdk/actions/workflows/github-code-scanning/codeql)
[![Documentation](https://img.shields.io/badge/docs-mdk.tether.io-2ea44f?style=flat-square)](https://docs.mdk.tether.io)

## Overview

> MDK is in **Active development:** public APIs are not yet stable.

The Mining Development Kit is an open-source, modular, and extensible foundation for building Bitcoin mining operations tools.

Connect hardware through Workers, build apps for your site, and give operators a dashboard or agent interface:

- Monitor mining infrastructure
- Control devices and containers
- Collect telemetry and operational data
- Build custom mining applications and integrations

## Quickstart

Start with the [`mdk` CLI](docs/guides/cli/install.md) to create and run a site.
Browse the [package catalogue](docs/reference/packages.md) to find the libraries and integrations for your app.

## Get started

To go from a mock miner, to an app with its own HTTP route and a working dashboard, start with the [first-app tutorial](docs/tutorials/build-your-first-app.md).


| You want to …                 | Start here                                                        |
| ----------------------------- | ----------------------------------------------------------------- |
| Install and use `mdk`         | [CLI setup](docs/guides/cli/install.md), or [run it with npx](docs/guides/cli/run-with-npx.md) |
| Build with an agent           | [Install MDK skills](docs/guides/ui/agent-skills.md)              |
| Discover integrations         | [Supported Workers](docs/reference/supported-workers.md) to connect miners, pools, and more |
| Build or install an app       | [App development](docs/guides/gateway/apps.md) and [available apps](docs/reference/supported-apps.md) |
| Explore a complete mock site  | [Run the demo](docs/tutorials/run-a-site.md)                      |
| Build an operator dashboard   | [Dashboard tutorial](docs/tutorials/build-a-dashboard.md)         |
| Integrate with MDK            | [Build a Worker](docs/guides/workers/build-a-worker.md): connect hardware and software |
| Join the marketplace          | [Release your Worker or app](CONTRIBUTING.md#release-a-worker-or-app) |

## Stack

[Workers adapt devices](backend/workers/README.md#how-workers-fit-into-mdk) to the Kernel. The Kernel coordinates capabilities
declared by any Worker. Apps use the [Node.js client to query the Kernel](docs/concepts/control-plane.md#read-requests) and
[implement business logic](docs/guides/gateway/apps.md#22-write-a-controller) in their own runtimes;
the Gateway [exposes their HTTP routes](docs/guides/gateway/apps.md#declare-and-mount-it) (Gateway and app contracts remain separate).
[Dashboards use HTTP](docs/concepts/control-plane.md#connection-direction), and agents can connect through the
[standalone MCP server](backend/core/mcp/README.md#ai-agents-and-the-mcp-server).

> In a CLI-configured stack, the Kernel issues access tokens; the Gateway, MCP server, and Kernel enforce your site's access policy.
> You define the [identities, roles, and trusted connections](docs/guides/security/index.md).

MDK emerged to control bitcoin mining hardware and simplify pool access, but what you integrate is in your hands.
From robotics to greenhouse environmental controls, you could build apps for a range of purposes. If you implement a Worker and declare
its capabilities, then the Kernel can coordinate it.

MDK remains agnostic. This is why the table lists compatible formats you can adopt, not required standards.

| Surface      | Owning reference                               | Compatible standard or surface                        |
| ------------ | ---------------------------------------------- | ----------------------------------------------------- |
| CLI          | [Commands and options](docs/reference/tooling/cli.md) | [`mdk --help`](docs/reference/tooling/cli.md#global-flags) |
| Apps         | [App routes and packaging](docs/guides/gateway/apps.md) | OpenAPI 3.1 for HTTP (compatible/not shipped) |
| Gateway      | [HTTP entry point and authentication](backend/core/gateway/README.md) | OpenAPI 3.1 for built-in HTTP (compatible/not shipped) |
| Kernel and Workers | [Protocol actions](docs/reference/protocol/messages.md) | AsyncAPI or JSON (compatible/not shipped) |
| Worker capabilities | [Device contracts](backend/workers/README.md) | [JSON Schema](backend/core/mdk-worker/mdk-contract.schema.json) |
| Node.js SDK  | [Client API](backend/core/client/README.md)     | TypeDoc or API Extractor (compatible/not shipped) |
| MCP          | [Agent tools](backend/core/mcp/README.md)       | [`tools/list`](backend/core/mcp/README.md#tool-exposure)|
| UI toolkit   | [Components, hooks, and state](ui/README.md)    | [Generated type and component registries](ui/AGENTS.md#machine-readable-artifacts) |


## Build and develop

Working on MDK itself? Follow the [contribution guide](CONTRIBUTING.md#development-environment-setup) for source setup, builds, and checks.

## Links

- [Report a security issue](SECURITY.md): follow the **private disclosure process**
- [Learn about MDK](docs/concepts/about.md)
- Join the [community](https://discord.com/invite/tetherdev)
- Start with the [user docs](https://docs.mdk.tether.io/) or [browse this repo's documentation](docs/README.md):
  - The [architecture overview](docs/concepts/architecture.md) explains the runtime boundaries
  - [Deploy a site](docs/guides/deployment/index.md): choose a deployment shape
  - [Register a Worker](CONTRIBUTING.md#list-a-worker): connect your hardware or software with MDK
  - [Register an app](CONTRIBUTING.md#list-an-app): drive MDK traffic to your app
- Get help: [report a problem](https://github.com/tetherto/mdk/issues)
- [Track changes](CHANGELOG.md)

Released under the [Apache 2.0 license](LICENSE). Built with contributions from the Mining Operations team.
