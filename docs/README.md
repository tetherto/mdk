# MDK documentation

## Overview

Build mining apps and operate your site with the `mdk` CLI. Start with a working example, then follow the reference owned by the part you extend.

## Start here

| Goal | Guide |
| ---- | ----- |
| Install the CLI | [Install and verify `mdk`](guides/cli/install.md) |
| Build an app with a UI | [First app tutorial](tutorials/build-your-first-app.md) |
| Install an existing app | [Available apps](reference/supported-apps.md) |
| Run a complete mock site | [Site tutorial](tutorials/run-a-site.md) |
| Connect hardware | [Worker development](guides/workers/build-a-worker.md) |
| Build a dashboard | [Dashboard tutorial](tutorials/build-a-dashboard.md) |
| Share your Worker or app | [Release and catalogue listing](../CONTRIBUTING.md#release-a-worker-or-app) |

## Build and operate

| Task | Owning guide or reference |
| ---- | ------------------------- |
| Scaffold, validate, run, and inspect a stack | [CLI reference](reference/tooling/cli.md) |
| Create the first operator and sign in | [First operator](guides/security/create-the-first-operator.md) |
| Package an app and declare its HTTP routes | [App development](guides/gateway/apps.md) |
| Configure and operate the HTTP entry point | [Gateway guides](guides/gateway/index.md) |
| Query devices or issue commands from Node.js | [Client API](../backend/core/client/README.md) |
| Compose UI components and hooks | [UI toolkit](../ui/README.md) |
| Test and publish a hardware integration | [Worker testing](guides/workers/test-a-worker.md) and [supported Workers](../backend/workers/docs/supported-workers.md) |
| Configure identities and access | [Site security](guides/security/index.md) |
| Deploy the stack | [Deployment guides](guides/deployment/index.md) |
| Operate through a conversational agent | [Operator agent guides](guides/agent/index.md) |

## Agent

For coding, [install MDK skills](guides/ui/agent-skills.md). For live site tools, connect through the [MCP server](../backend/core/mcp/README.md).
Load the contract for the surface you need:

- [Worker contracts and examples](../backend/workers/docs/AGENT_READY.md): device capabilities and handlers
- [Core SDK contracts](../backend/core/docs/AGENT_READY.md): backend APIs
- [UI registries and usage](../ui/AGENTS.md): components, hooks, and state

## Understand the stack

The [API surface map](../README.md#stack) links to owning references and optional description formats.
[What runs, and what you build with](concepts/about.md#what-runs-and-what-you-build-with) separates runtime components from tools and libraries.
Use the [architecture overview](concepts/architecture.md) for runtime boundaries, the [protocol reference](reference/protocol/messages.md)
for Kernel and Worker messages, and the [glossary](reference/glossary.md) for terminology.

## Next steps

- [Browse packages](reference/packages.md): find a package and its own reference
- [Contribute](../CONTRIBUTING.md): development and pull-request workflow
- [Maintain the docs](reference/maintainers/README.md): style, generation, and verification
- [Read the published docs](https://docs.mdk.tether.io/): browse the product documentation
