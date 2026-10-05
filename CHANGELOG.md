# Changelog: mdk-0.10.0

> For a high-level introduction, see the [release notes](./docs/reference/release-notes/0.10.0-release.md)

## v0.10.0

- Moves MCP **out of the Gateway entirely**: the Gateway no longer hosts an MCP server or depends on `@tetherto/mdk-mcp`, and
  the standalone MCP server turns a Gateway plugin's routes into tools by reading the plugin's own contract off disk
- Adds **`mdk run mcp`** to the CLI, serving every Gateway plugin declared in `mdk.yaml` as MCP tools from a process of its own
- Narrows **`@tetherto/mdk-agent`** to the four exports a consumer uses, behind an `exports` map
- Closes two Gateway exposures: internal error messages no longer reach clients verbatim, and `?overwriteCache=true` is no
  longer honored for anonymous callers
- Renames the **Op Centre** UI exports to **Op Center**, a breaking change for the five exported constants and the `hooks.json` category
- Adds a **generated reference page for the monorepo's packages**, with each one's purpose and whether it is publishable

## Breaking changes

### The Gateway no longer hosts MCP

[`@tetherto/mdk-gateway`](backend/core/gateway/README.md) drops its `@tetherto/mdk-mcp` dependency and every MCP code path.
A test in [`no-mcp-coupling.test.js`](backend/core/gateway/tests/unit/lib/no-mcp-coupling.test.js) keeps it that way.

| Removed | Replacement |
| --- | --- |
| `startGateway({ mcp: { port } })` | Run the standalone MCP server: `mdk run mcp`, or `createMcpServer()` from `@tetherto/mdk-mcp` |
| `extraPluginDirs[].autoGenerateMcp` | Pass the same plugin dirs to `createMcpServer()` as `gatewayPluginDirs`. `extraPluginDirs` entries are now a dir or `{ dir, config }` |
| The in-process MCP listener at `port + 100` | The standalone server, which `mdk run mcp` also defaults to the Gateway port `+ 100` |

A stack that relied on `autoGenerateMcp: true` gets no tools after upgrading until it starts the standalone server. The
[`mvp-site`](examples/mvp-site/README.md) example shows the migration: its `--role mcp` process now serves both the
hand-authored tools and the site Gateway plugin's routes on one endpoint (`:3101`), and the separate `:3100` endpoint is gone
from [`.mcp.json.example`](examples/mvp-site/.mcp.json.example) and `config/site.deploy.json.example`.

### `@tetherto/mdk-mcp` exports change

| Export | Status |
| --- | --- |
| `createMcpServer(root, port, config, pluginDirs, gatewayPluginDirs)` | Gains the optional `gatewayPluginDirs` parameter (see Added) |
| `loadGatewayPluginTools(pluginDir, context)` | New: converts one Gateway plugin's routes into MCP tools without booting a server |
| `startMcpHttpServer` | Removed from the public surface. It has no consumer outside the package now that the Gateway boots no MCP server |
| `generateToolsFromGatewayPlugin` | Removed from the public surface. `loadGatewayPluginTools` covers the same need from a plugin dir |

`@tetherto/mdk-mcp` now depends on `@tetherto/mdk-gateway`, the reverse of the previous direction, so it can reuse the
Gateway's own plugin loader and plugin-context builder instead of copying them.

### `@tetherto/mdk-agent` exposes only what consumers use

[`index.js`](backend/core/agent/index.js) re-exported 37 names from six modules. It now exports four: `createAgent`,
`EVENT`, `isTerminal` and `AgentEventSchema`. A new `exports` map in
[`package.json`](backend/core/agent/package.json) (`.` and `./package.json`) also closes deep imports such as
`@tetherto/mdk-agent/src/…`. Code that imported `MemorySessionStore`, the charter, the tool-contract helpers or the eval
helpers from the package have no supported path to them in this release.

### Op Centre renamed to Op Center in the UI public surface

This release replaces British spelling with the American, with no deprecated
aliases, so each old name is removed.

| Package | Removed | Replacement |
| --- | --- | --- |
| `@tetherto/mdk-ui-foundation` | `OP_CENTRE_LIST_THINGS_FIELDS` | `OP_CENTER_LIST_THINGS_FIELDS` |
| `@tetherto/mdk-ui-foundation` | `OP_CENTRE_CONTAINER_WIDGETS_FIELDS` | `OP_CENTER_CONTAINER_WIDGETS_FIELDS` |
| `@tetherto/mdk-ui-foundation` | `OP_CENTRE_CONTAINER_DETAIL_FIELDS` | `OP_CENTER_CONTAINER_DETAIL_FIELDS` |
| `@tetherto/mdk-ui-foundation` | `OP_CENTRE_CABINET_DETAIL_FIELDS` | `OP_CENTER_CABINET_DETAIL_FIELDS` |
| `@tetherto/mdk-react-adapter` | `OP_CENTRE_REALTIME_POLL_INTERVAL_MS` | `OP_CENTER_REALTIME_POLL_INTERVAL_MS` |
| `hooks.json` manifest | `@category op-centre` | `@category op-center` |

The category rename fails silently: a consumer filtering `hooks.json` on `category === 'op-centre'`, as the react-adapter
README used to advise, now gets no hooks back. Change the filter to `'op-center'`.

## Added

### `mdk run mcp`

The CLI gains an `mcp` run target ([`run.ts`](packages/cli/src/commands/run.ts),
[`runtime.ts`](packages/cli/src/lib/runtime.ts)). It boots `@tetherto/mdk-mcp` pointed at every plugin in
`spec.gateway.plugins`, so each plugin's routes become agent-callable tools with no MCP-specific authoring:

- Listens on `spec.mcp.port`, a new optional field in `mdk.yaml`, else `spec.gateway.port + 100`
- Needs the Kernel already running (`mdk run kernel`), and fails with that instruction when no Kernel key file exists
- Checks its port first and names the `spec.mcp.port` setting to change when it is taken, as the Gateway check does
- Forwards `spec.gateway.config` as the base config layer under each plugin's own `config`, so a plugin reads the same values
  under `mdk run mcp` as under `mdk run gateway`
- Is never part of `mdk run all`: start it explicitly, in its own terminal

`@tetherto/mdk-cli` gains `@tetherto/mdk-mcp` as a dependency, loaded lazily only when this target runs.

### Gateway plugins as a tool source for the MCP server

`createMcpServer()` takes a fifth parameter, `gatewayPluginDirs`: Gateway plugin dirs (an `mdk-plugin.json` plus routes),
each a plain path or `{ dir, config }`. Their routes are converted into tools
([`lib/from-gateway-plugin.js`](backend/core/mcp/lib/from-gateway-plugin.js)) and merged with the native `mcp-plugin.json`
tools from `pluginDirs` into one tool set:

- Each Gateway plugin gets the same context shape it gets from the Gateway, built by the Gateway's own `buildPluginContext`,
  with `onReady` callbacks fired only once the MCP listener is serving. A callback that throws is warned about and does not
  stop the others.
- Tool ids must be unique across both sources: a collision throws `ERR_PLUGIN_TOOL_DUPLICATE_ID` naming both plugin
  directories, where before only duplicates within a single plugin were caught
- Omitting the parameter behaves exactly as before

### A generated package reference page

[`docs/reference/packages.md`](docs/reference/packages.md) lists the monorepo's packages in four groups (Core, Extensions, UI
and Tools), with each one's purpose and availability: `workspace` for a private package used from a clone, `publishable`
otherwise. Sample and demo packages are left out. It is generated by [`generate-package-catalog.mjs`](docs/scripts/generate-package-catalog.mjs)
(`npm run generate:package-catalog`) and kept current by `npm run regenerate-docs`, alongside the other generated pages.

## Changed

- **Gateway error responses have one shape and one sanitizer**: the Fastify error handler and the plugin stream-route catch
  both use `errorResponse()` in [`plugin-adapter.js`](backend/core/gateway/workers/lib/plugin-adapter.js). Every error body
  is `{ statusCode, error, message }`, where plugin stream routes previously omitted `error`. `message` carries the
  error's own text for `ERR_*` codes and for Fastify's 4xx errors (validation, content type, body size), and the status
  text otherwise. A replaced message is logged through the request logger.
- **Repository docs tooling moved under `docs/scripts/`**: `link-check.mjs`, `check-example-paths.mjs`,
  `check-directory-links.mjs`, `check-md-anchors.mjs`, and `lint-md-pr.sh` left the root `scripts/` directory, which is
  gone. The `npm run` script names are unchanged.

## Security

- **Internal error messages reached Gateway clients verbatim**: the masking logic ran in an `onError` hook, where Fastify
  does not allow a reply to be sent, so Fastify's default handler returned every thrown message unmodified. The sanitizer
  now runs as the error handler (see Changed).
- **Any caller could force a cache bypass**: `?overwriteCache=true` made the Gateway skip the request cache and fetch fresh
  data from the Kernel on every cached route. It is now honored only when it is literally `true` and the request carries an
  `Authorization` header, which also stops `?overwriteCache=false` bypassing the cache on routes without a query schema.
  The Gateway does not validate the header itself, so a route whose controller checks no token still accepts any value, as
  [`docs/guides/security/index.md`](docs/guides/security/index.md) now states.

> For previous releases, see the [changelog archive](./docs/reference/changelog-archive/2026-archive.md)
