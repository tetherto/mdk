# Changelog: mdk-0.13.1

## v0.13.1

- Routes **every device call through the Kernel**: `@tetherto/mdk-client` no longer dials a Worker, so each request is
  authorized against the policy in force and recorded in the write-command log
- Clears **six moderate production advisories**, by rescoping the dependency overrides that were holding two of them open
- Publishes **spacing and control-height tokens** from the devkit, so a consumer app has layout primitives to reach for
  instead of writing inline styles
- Makes **`@tetherto/mdk-ui-foundation` load in plain Node**, with a build step that imports every `exports` entry to prove it
- Adds **seven documentation pages** covering the CLI, running a Worker, the first operator, the agent over MCP and the UI packages

## Breaking changes

### `@tetherto/mdk-client` has no Worker-direct path

[`backend/core/client/index.js`](./backend/core/client/index.js) exports `createMdkClient` and `createRawMdkClient`.
`createWorkerClient` is gone, and with it the only supported way to open a persistent connection to a Worker's own RPC server.
Every request now goes to the Kernel, which authorizes it against `spec.rbac` and records each command attempt in its
[write-command log](./backend/core/kernel/README.md).

Two call sites need moving, and both have a governed equivalent:

| Was | Now |
| --- | --- |
| `sendWorkerCommand(workerId, …)` for provisioning (`registerThing`, `updateThing`, `forgetThings`) | `pushAction`, with the Worker's `workerId` in `params[0]` |
| `pullWorkerTelemetry(workerId, …)` for Worker-scoped history (`logs`, `historical_logs`) | `pullTelemetry(deviceId, queryType)`, which the Kernel routes to the Worker owning the device |

The `opts.hrpc` option set loses `envelope`, which only ever existed so `createWorkerClient` could validate a Worker's replies
as MDK response envelopes. `opts.hrpc.key` is now always the Kernel listener's public key, never a Worker's RPC key.

A deployment that put a caller's key on a Worker's allowlist to reach it directly no longer needs that entry. The defaults
left it out, so most deployments never had one.

### Two shipped skills are renamed

`@tetherto/mdk-skill` installs its suite by name, so a project that invokes either of these by its old name has to update it:

| Was | Now |
| --- | --- |
| `mdk-worker-plugin` | `mdk-worker` |
| `mdk-gateway-plugin` | `mdk-app-routes` |

The installer sweeps skills it previously shipped, so the old directories are removed on the next install rather than left
behind alongside the new ones.

## Added

### Documentation for the npm consumer journey

Seven pages are new:

| Page | Covers |
| --- | --- |
| [`docs/reference/tooling/cli.md`](./docs/reference/tooling/cli.md) | Full command reference for `mdk` |
| [`docs/guides/cli/run-with-npx.md`](./docs/guides/cli/run-with-npx.md) | Running the CLI from the registry, with no checkout |
| [`docs/guides/cli/run-your-worker.md`](./docs/guides/cli/run-your-worker.md) | Taking a scaffolded Worker to a running one |
| [`docs/guides/security/create-the-first-operator.md`](./docs/guides/security/create-the-first-operator.md) | Provisioning identity and policy on a fresh stack |
| [`docs/guides/agent/connect-over-mcp.md`](./docs/guides/agent/connect-over-mcp.md) | Pointing an external agent at the MCP server |
| [`docs/guides/ui/use-ui-foundation-headlessly.md`](./docs/guides/ui/use-ui-foundation-headlessly.md) | Consuming the stores and query layer without React |
| [`docs/guides/ui/react/compose-reporting-layouts.md`](./docs/guides/ui/react/compose-reporting-layouts.md) | Building reporting pages out of devkit charts |

The README drops its numbered walkthrough and status table for a `Get started` and a `Stack` section, and the tutorials for
building a dashboard and running a site were substantially revised against the current product.

### Devkit spacing and control-height tokens

[`ui/packages/react-devkit/src/primitives/styles/_layout.scss`](./ui/packages/react-devkit/src/primitives/styles/_layout.scss)
publishes `--mdk-spacing-xs|sm|md|lg|xl|2xl` and `--mdk-control-height-lg|md|sm` through `styles.css`, so plain-CSS consumers
can read them too. The devkit shipped colour tokens but no layout primitives, which left a consumer app nothing to reach for.

Naming the steps re-spaces nothing. `--mdk-spacing-md` was referenced in `site-stats-bar.scss` and defined nowhere, always
falling through to its literal value; it now resolves. The control heights are the *outer* box: there is no global
`box-sizing: border-box`, so matching a control's `min-height` alone lands short by its border.

### UI package additions

- [`useInstalledApps`](./ui/packages/react-adapter/src/hooks/use-installed-apps.ts) in `@tetherto/mdk-react-adapter`, which
  reads the apps installed on a stack
- `AGENT_APP_ID` and `hasAgentApp` in [`@tetherto/mdk-ui-agent`](./ui/packages/ui-agent/src/core/agent-app.ts), so a shell
  shows the co-pilot only when the agent app is actually installed
- An error notice in `@tetherto/mdk-ui-agent` for a turn that failed, replacing a raw route label with the named app
- A dataset `lineStyle` on the devkit's `LineChart`, for drawing a target or nominal series dashed rather than solid. The
  existing `priceFormat` is now documented as a `chartProps` passthrough, for a series whose range is too narrow for the
  default y-axis step.

### A Node ESM guard on `@tetherto/mdk-ui-foundation`

[`ui/packages/ui-foundation/scripts/check-node-esm.mjs`](./ui/packages/ui-foundation/scripts/check-node-esm.mjs) runs as the
last step of that package's build. It imports every entry of the package's `exports` map by the package's own name, so it
checks what a consumer actually gets: a relative specifier `tsc` emitted verbatim, an `exports` path that points nowhere, or
a missing `types` file all fail the build.

## Changed

- Relative imports throughout `@tetherto/mdk-ui-foundation` carry explicit `.js` extensions, which is what Node's own ESM
  resolver requires. The package previously loaded only through a bundler
- `UNITS.SATS` and `CURRENCY.SATS` in the devkit are lowercase `sats`, matching how the unit is written. `BITCOIN_UNITS` is
  derived from those currency constants rather than repeating their values
- The devkit's monospace rules all read `--font-mono` instead of naming families individually
- The example site's `/site/overview` lists the devices of a terminated or dead Worker in `unavailableDevices`, each marked
  offline and stale, where before it only counted them. The UI notice names them
- Chart tooltips read the index axis for bar charts and the value axis for horizontal charts, and `buildBarChartOptions`
  returns Chart.js options directly
- The CLI's onboarding installs the two catalog apps from their public repositories, and the generated app manifest records a
  relative CLI path
- `mdk create app` shares its types between the plugin and the UI through a generated `plugin/types.d.ts`
- The example site and the CLI default to a private DHT bootstrap
- `@tetherto/mdk-agent` declares itself publishable, with the file allowlist its published 0.13.0 tarball already carried.
  The package was on the registry while its manifest here was marked private, so it would not have received this release

## Removed

- `createWorkerClient` and the `opts.hrpc.envelope` option from `@tetherto/mdk-client` (see Breaking changes)
- `backend/core/docs/architecture.md` and `backend/core/docs/conventions.md`, which were unfinished drafts that no page linked to

## Security

`npm audit --omit=dev` reported six moderate findings. They were two unrelated problems, and the repository's own overrides
were holding both open.

| Advisory | Package | Resolution |
| --- | --- | --- |
| GHSA-rmxm-3fg6-px4f | `@hono/node-server` | `serveStatic` decoded the request path twice, so middleware on static paths could be bypassed. The advisory covers 1.19.10 to 2.1.2 and the pin sat at 2.0.12. The pin moves to 2.1.6, which is not a major |
| GHSA-g3hv-75wg-m249 | `minimatch` | Reached only through `@fastify/static` and `glob`. Closed by the `glob` override below, which carries `minimatch` 11 |
| GHSA-3g3m-2fjr-6pw4 | `glob` | Every `@fastify/static` 10.x still asks for `glob` 13, and the fix exists only from `glob` 14.0.2. The override now scopes `glob` 14.0.3 under `@fastify/static` |

The previous override pinned `@tetherto/svc-facs-httpd`'s `@fastify/static` *below* the version that dependency asks for, so
it forced a downgrade past the bump meant to fix this. The new override is scoped rather than tree-wide, so `rimraf` keeps its
own `glob` and the root `minimatch` stays where the markdown linter needs it.

## Dependencies

Manifest-level changes in the root [`package.json`](./package.json):

| Change | Reason |
| --- | --- |
| `overrides."@hono/node-server"` 2.0.12 to 2.1.6 | GHSA-rmxm-3fg6-px4f |
| `overrides."@fastify/static"` from the pin `10.1.2` to a scoped `{ "glob": "14.0.3" }` | GHSA-3g3m-2fjr-6pw4 and GHSA-g3hv-75wg-m249 |

## Fixed

- The agent treats an expired approval as refused, and keeps both `tool_result` texts literal
- A failed agent turn is readable and its retry is honest about what it will do
- The agent documents the case where the MCP server is down at session start
- Agent header alignment, icon sizing, composer growth and the conversation list
- The devkit's tooltip handler owns when the tooltip is shown, rather than racing the chart
- The power chart's y-axis stays readable and does not go negative
- The shell template's sign-in user field has an explicit type, and its dev server binds a configurable host
- The shell template's quick start matches a scaffolded dashboard
- The mdk-skill tooling follows skills symlinks that stay inside the project, and its links are repository-relative
- Vitest restores DOM `localStorage` under Node 25 and later, through a shared TypeScript `vitest.config.base`

> For previous releases, see the [changelog archive](./docs/reference/changelog-archive/2026-archive.md)
