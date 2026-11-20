---
title: Versioning and deprecation policy
description: How MDK numbers releases from v1.0, what counts as a breaking change, and how long a deprecated interface keeps working
docs@tether_slug: reference/versioning
---

## TL;DR

- From `1.0.0`, MDK follows [Semantic Versioning 2.0.0][semver]: a breaking change to a public interface ships only in a MAJOR release
- A deprecated interface keeps working for at least two MINOR releases and at least six months, whichever is longer, and is removed
  only in a MAJOR release
- The previous MAJOR line receives security fixes for six months after the next MAJOR ships
- Before `1.0.0` (every `0.y.z` release today), any release can break a public interface; the `Breaking changes` section of the
  [changelog][changelog] lists each one

## Overview

This page is the contract between MDK and the people who build on it. It defines which interfaces MDK treats as public, how the
version number signals a change to them, and how much notice an integrator gets before a supported interface goes away. An interface
this page doesn't list as public carries no compatibility promise in any release.

## Version numbers

Every publishable `@tetherto/mdk-*` package ships at the same version in every release. One number describes the whole stack, so an
integrator upgrades the Kernel, the Gateway, the client, and the UI packages together, and the internal `@tetherto/mdk-*` dependencies
are pinned to `^<version>` of that same release.

From `1.0.0`, the version is `MAJOR.MINOR.PATCH`:

| Part    | Increments when a release                                                                           | Integrator action                                       |
| ------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `MAJOR` | Removes or changes a public interface incompatibly, including removing a deprecated interface       | Read the release's `Breaking changes` and migrate       |
| `MINOR` | Adds a public interface or capability, or deprecates an existing one, without breaking existing use | Upgrade freely; plan migrations off anything deprecated |
| `PATCH` | Fixes a bug or a security issue without changing a public interface                                 | Upgrade freely                                          |

Pre-release versions (`1.0.0-rc.1`, `2.0.0-rc.1`) carry no compatibility promise between one another. A release candidate or a MAJOR
release ships only when no documentation debt remains, as the [release checklist][releasing] enforces.

### Before 1.0

MDK is in initial development until `1.0.0`. In a `0.y.z` release, any part of the version can carry a breaking change, including a
PATCH. Pin an exact version (`0.12.2`, not `^0.12.2`) and read the changelog's `Breaking changes` section before each upgrade.

Interfaces deprecated during `0.y.z` can be removed in `1.0.0`
itself; the deprecation window below starts at `1.0.0`.

## Public interfaces

The compatibility promise covers these interfaces of the publishable packages that the [package reference][packages] lists:

| Interface                          | What's covered                                                                                          |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Package entry points               | Every export reachable from a package's `exports` or `main` entry, and its documented arguments and return shape |
| Gateway HTTP API                   | Documented routes, methods, request fields, response fields, and status codes ([Gateway guide][gateway]) |
| MDK Protocol                       | The [message envelope][protocol], the action catalogue, and each action's payload                       |
| Worker contract                    | [`mdk-contract.schema.json`][contract-schema] for a given `contractVersion`                             |
| Stack manifest (`mdk.yaml`)        | Fields under a given `apiVersion` (`mdk/v1`)                                                            |
| App manifest (`mdk-app.yaml`)      | The [manifest fields][app-manifest] and the route table (`mdk-plugin.json`)                             |
| `mdk` CLI                          | Command names, flags, exit codes, and documented `--json` output ([CLI README][cli])                    |
| MCP server                         | Tool names, input schemas, and safety annotations ([MCP README][mcp])                                   |
| UI toolkit                         | Exported components, hooks, and stores, with the props and types in `dist/registry.json`                |
| Error codes                        | Documented error codes; the message text is not covered                                                 |
| Environment variables and config   | Documented variable names, config keys, and their defaults                                              |
| Runtime baseline                   | The supported Node.js and npm range in the [environment requirements][environment]                      |

These carry no compatibility promise, in any release:

- Packages marked `workspace` in the [package reference][packages], and every file under `examples/`
- Deep imports into a package's internals (`@tetherto/mdk-kernel/lib/...`) that its `exports` doesn't expose
- Log lines, error message text, and the on-disk layout of stores, which change without notice; migrations for stored data ship with
  the release that needs them
- Mock servers and test utilities
- Partner-maintained Workers listed in [`external-workers.json`][external-workers], which version independently; their compatibility
  with MDK is expressed through `contractVersion`
- Anything a page marks as experimental

### Schema versions

Three interfaces carry their own version identifier alongside the package version:

| Identifier                    | Where                       | Changes when                                     |
| ----------------------------- | --------------------------- | ------------------------------------------------ |
| `version` in the envelope     | Every MDK Protocol message  | The envelope or an action payload changes incompatibly |
| `contractVersion`             | `mdk-contract.json`         | The Worker contract schema changes incompatibly  |
| `apiVersion`                  | `mdk.yaml`                  | The stack manifest changes incompatibly          |

A new generation of any of these ships only in a MAJOR release. The previous generation stays accepted, alongside the new one, for
the full deprecation window, so a Worker built against `contractVersion: "1"` keeps loading on the MAJOR release that introduces `"2"`.

## Soft freeze

The areas in this table can change in a `1.x` release, as long as the change keeps every [public interface](#public-interfaces)
compatible. Each change still follows the version rules on this page: an addition ships in a MINOR release, a fix in a PATCH.

| Area                | What may change                                              | Guardrail                                                              |
| ------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Apps MDK ships      | Controllers, caching, and aggregation in the [apps MDK ships][supported-apps] (`agent`, `demo`) | Keep each route table (`mdk-plugin.json`) and the required fields of `mdk-app.yaml` |
| New apps            | New apps and routes, scaffolded by `mdk create app` or installed by `mdk add app` | Each app runs in its own [`@tetherto/mdk-app-runtime`][app-runtime] process; the Gateway runs no app code |
| First-party Workers | New models, handler internals, and vendor protocol fixes for Avalon, Antspace, Bitdeer, ABB, SATEC, Schneider, Seneca, and F2Pool | Must still validate against [`mdk-contract.schema.json`][contract-schema] |
| New Workers         | Additional device families and providers                     | Same contract; the Kernel doesn't change                               |
| UI toolkit          | Components, hooks, and stores in `@tetherto/mdk-ui-foundation`, `@tetherto/mdk-react-adapter`, `@tetherto/mdk-react-devkit`, and `@tetherto/mdk-ui-agent`, plus the catalog app | The browser still talks HTTP to the Gateway only                       |
| Operator agent      | The charter, tools, session store implementations, and the eval battery of `@tetherto/mdk-agent` | The agent reaches MDK only through the MCP server, and a [session id is not authority][agent] |
| MCP tools           | Hand-authored tools, and the tools the [MCP server][mcp] derives from an app's `mdk-plugin.json` | The MCP server stays its own process, binds `127.0.0.1`, serves `POST /mcp`, and exposes only read-only tools by default |
| CLI and skills      | [`mdk`][cli] commands and `@tetherto/mdk-skill`              | What the CLI generates must pass `mdk validate app` and the Worker contract |
| Examples and docs   | Anything under `examples/` and `docs/`                       | Must keep demonstrating the shipping MDK Protocol and manifests        |
| Additive schema     | Optional fields on `mdk-contract.json`, `mdk-app.yaml`, or `mdk-plugin.json` | A new required field, or a removed one, follows the [schema version](#schema-versions) rules |

## Deprecation

### How a deprecation is announced

A deprecation ships in a MINOR release and is announced in every place an integrator can meet it:

1. The release's changelog lists it under a `Deprecated` section, with the replacement and the earliest version that may remove it.
2. The reference docs for the interface mark it deprecated and link the replacement.
3. Code carries the marker its ecosystem reads: a `@deprecated` JSDoc tag on exports and UI props, `deprecated: true` on a Gateway
   route or MCP tool description, and `npm deprecate` for a whole package.
4. Where the interface runs at runtime, it logs a deprecation warning once per process, naming the replacement.

A deprecation always names a working replacement that is available in the same release. MDK doesn't deprecate an interface that has
no replacement unless the capability itself is being retired, and then the changelog says so.

### How long a deprecated interface stays supported

| Rule                      | Commitment                                                                                                 |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Minimum window            | Two MINOR releases and six months from the release that deprecates it, whichever is longer                 |
| Removal                   | Only in a MAJOR release, after the minimum window has passed                                               |
| Behavior while deprecated | Unchanged: a deprecated interface keeps its documented behavior and receives bug and security fixes      |
| Schema generations        | The previous `contractVersion`, `apiVersion`, or envelope `version` stays accepted for the same window      |

A deprecation that misses the cut for one MAJOR release waits for the next; MDK doesn't shorten the window to make a release.

### Support for the previous MAJOR line

When a new MAJOR release ships, the previous MAJOR line receives PATCH releases for security fixes for six months. Feature work and
non-security bug fixes go only into the current MAJOR line.

## Exceptions

A security fix can change a public interface in a MINOR or PATCH release when no compatible fix exists. The changelog lists the change
under `Breaking changes` and `Security`, and the [security policy][security] covers how the issue is disclosed.

A published version that is broken is deprecated on npm and replaced by a PATCH release, as the [release process][releasing] describes,
because npm versions can't be replaced.

## Next steps

- [Read the changelog][changelog]: every release's breaking changes, deprecations, and additions
- [Check the packages MDK ships][packages]: which packages are publishable and covered by this policy
- [Confirm the runtime baseline][environment]: the Node.js and npm range a release supports
- [Follow the release process][releasing]: how a version is cut, published, and deprecated on npm

## Links

[semver]: https://semver.org/
<!-- docs@tether.io: external link — preserve URL -->

[changelog]: ../../CHANGELOG.md
<!-- docs@tether.io: changelog → https://github.com/tetherto/mdk/blob/main/CHANGELOG.md -->

[releasing]: ../../RELEASING.md
<!-- docs@tether.io: releasing → https://github.com/tetherto/mdk/blob/main/RELEASING.md -->

[security]: ../../SECURITY.md
<!-- docs@tether.io: security → https://github.com/tetherto/mdk/blob/main/SECURITY.md -->

[packages]: packages.md
<!-- docs@tether.io: packages → reference/packages -->

[environment]: environment.md
<!-- docs@tether.io: environment → reference/environment -->

[protocol]: protocol/messages.md#envelope
<!-- docs@tether.io: protocol → reference/protocol/messages -->

[gateway]: ../guides/gateway/index.md
<!-- docs@tether.io: gateway → guides/gateway -->

[app-manifest]: ../guides/gateway/apps.md
<!-- docs@tether.io: app-manifest → guides/gateway/apps -->

[contract-schema]: ../../backend/core/mdk-worker/mdk-contract.schema.json
<!-- docs@tether.io: contract-schema → https://github.com/tetherto/mdk/blob/main/backend/core/mdk-worker/mdk-contract.schema.json -->

[external-workers]: ../../backend/workers/external-workers.json
<!-- docs@tether.io: external-workers → https://github.com/tetherto/mdk/blob/main/backend/workers/external-workers.json -->

[cli]: ../../packages/cli/README.md
<!-- docs@tether.io: cli → https://github.com/tetherto/mdk/blob/main/packages/cli/README.md -->

[mcp]: ../../backend/core/mcp/README.md
<!-- docs@tether.io: mcp → https://github.com/tetherto/mdk/blob/main/backend/core/mcp/README.md -->

[app-runtime]: ../../backend/core/app-runtime/README.md
<!-- docs@tether.io: app-runtime → https://github.com/tetherto/mdk/blob/main/backend/core/app-runtime/README.md -->

[supported-apps]: supported-apps.md
<!-- docs@tether.io: supported-apps → reference/supported-apps -->

[agent]: ../../backend/core/agent/README.md
<!-- docs@tether.io: agent → https://github.com/tetherto/mdk/blob/main/backend/core/agent/README.md -->
