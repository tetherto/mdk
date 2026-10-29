# Changelog: mdk-0.13.0

## v0.13.0

- Adds **authentication and authorization** across the stack: two new packages, [`@tetherto/mdk-identity`](./backend/core/identity/README.md) (token issuer and JWT
  verification) and [`@tetherto/mdk-rbac`](./backend/core/rbac/README.md) (policy written as `spec.rbac` in `mdk.yaml`), enforced at the Kernel, Gateway and MCP server
- Every **Kernel HRPC request now needs an access token** and is evaluated against the policy in force, per device or Worker it touches
- Routes **device writes through the Kernel** and keeps an append-only log of every command attempt and its outcome
- Introduces **Worker contract schema v1**: a `contractVersion` stamp opts a contract into strict validation of canonical units and numeric parameter bounds,
  while contracts without it keep working and report the same findings as warnings
- Adds a **private HyperDHT bootstrap and a DHT bind host**, so a site can run on one machine or an isolated LAN with no public DHT
- Publishes **measured benchmark results and operating envelopes**, and moves the two sample apps out of this repository

## Breaking changes

### Every Kernel request must carry an access token

The Kernel authorizes every HRPC request through [`KernelAuthorizer`](./backend/core/kernel/lib/transport/authorizer.js). Sign-in actions (`auth.*`) pass
through so the issuer can authenticate them itself. Every other action needs an access token in `envelope.auth`, issued by that Kernel and, when bound, bound
to the caller's transport key. The token's identity is then evaluated against the `spec.rbac` in force, as the action's resource and verb, for each instance it
touches: a device as family, brand, worker and device; a Worker as family, brand and worker. A command scoped to a Worker or rack is checked for every device
that Worker owns.

An `envelope.actor` (an app acting for the user its Gateway route authenticated) adds a second check: the operator's access token must also be a current user
token from the same issuer, bound to no transport key, and both identities must be allowed.

Anything the Kernel cannot resolve, such as an unknown device or a Worker that is not ready, is evaluated with no instance name, so a rule scoped by
`resourceNames` never matches it.

A deployment that previously spoke to the Kernel without a token has to provision identity and policy first. `mdk rbac init` writes a starter `spec.rbac`, and
`mdk user add` creates the first operator. `mdk run` refuses to boot a Kernel whose policy binds nobody, or whose policy nobody is allowed to write, rather than
starting a site no one can administer.

### The sample apps leave the repository

`backend/apps/agent` and `backend/apps/demo` are gone, along with the `backend/apps/*` entry in the root workspace list. Both were `private: true` and were never
published to npm, so no package disappears from the registry, but a clone no longer carries them. They now live in their own repositories, `mdk-app-agent` and
`mdk-app-demo`. Anything that referenced those paths, including local `mdk-app.yaml` stacks, needs repointing.

## Added

### Identity: `@tetherto/mdk-identity`

The token issuer and verifier shared by the Kernel, Gateway and MCP server.

| Module | Responsibility |
| ------------------- | ------------------------------------------------------------------ |
| `lib/issuer.js`     | Users, service accounts and rotating refresh tokens |
| `lib/verifier.js`   | Access-token verification for the Gateway, MCP server and Kernel |
| `lib/jwt.js`        | JWT signing and parsing |
| `lib/keys.js`       | Signing keys and their rotation |
| `lib/passwords.js`  | Password hashing and verification |
| `lib/assertion.js`  | Service-account assertions |
| `lib/http.js`       | HTTP helpers for the sign-in routes |

### RBAC: `@tetherto/mdk-rbac`

Validates `spec.rbac` from `mdk.yaml` and evaluates callers at the Gateway, MCP server and Kernel.

| Module | Responsibility |
| ------------------- | ------------------------------------------------------------------ |
| `lib/validate.js`   | Strict validation that collects every problem at once, with its path in `mdk.yaml` |
| `lib/policy.js`     | Policy compilation and caller evaluation |
| `lib/store.js`      | The policy in force, persisted and hot-applied |
| `lib/app-grant.js`  | The role, binding and service account an app needs for its declared permissions |
| `lib/routes.js`     | Gateway route to resource and verb mapping |
| `lib/vocabulary.js` | Kernel resources and the verbs each one accepts |
| `lib/glob.js`       | Resource pattern matching |

Subjects are `User`, `Group` or `ServiceAccount`, and enforcement is `deny`. A policy that fails validation is never loaded: the caller refuses to boot, and a
live apply keeps the last good version.

### Kernel protocol actions, exports and the write-command log

New actions in [`lib/protocol/actions.js`](./backend/core/kernel/lib/protocol/actions.js):

| Group | Actions |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| Sign-in | `auth.login`, `auth.refresh`, `auth.token`, `auth.logout`, `auth.jwks` |
| Policy | `rbac.get`, `rbac.apply` |
| Identity administration | `identity.user.list`, `identity.user.upsert`, `identity.user.delete`, `identity.sa.list`, `identity.sa.upsert`, `identity.sa.delete`, `identity.keys.rotate` |
| Command history | `command.log` |

[`lib/modules/command-log/index.js`](./backend/core/kernel/lib/modules/command-log/index.js) is an append-only record of every `command.request` the Kernel
sees. It writes one `attempt` entry per request, carrying the caller key and roles, the command, its target, and its parameters with secrets redacted, marked
`QUEUED` or `REJECTED` with the error, and one `settled` entry per terminal outcome. Entries are keyed by time, read newest first, and deleted once older than
`ttlMs`, which defaults to 30 days and is pruned at most hourly as entries arrive.

`@tetherto/mdk-kernel` gains two subpath exports, `./protocol/params` and `./testing`.

### CLI: identity, policy and session commands

| Command | What it does |
| ------------------------------------------------------- | --------------------------------------------------------------------- |
| `mdk rbac init`, `mdk rbac apply`, `mdk rbac show`       | Write a starter `spec.rbac`, push one to a running Kernel, print the policy in force |
| `mdk user add`, `passwd`, `remove`, `list`               | Manage operator accounts |
| `mdk serviceaccount add`, `rotate`, `remove`, `token`, `list` | Manage service accounts and their credentials |
| `mdk login`, `mdk logout`, `mdk whoami`                  | Sign in to a site, end the session, show the current identity |
| `mdk validate app`                                       | Check that an app declares its required permissions and that `spec.rbac` grants them |

`mdk create app` and `mdk add app` now write the role, binding and service account an app needs into `spec.rbac` from the permissions the app declares, and
`mdk validate worker --strict` reports v1 contract requirements as errors rather than warnings.

### Gateway sign-in routes

[`workers/lib/auth-routes.js`](./backend/core/gateway/workers/lib/auth-routes.js) serves `/auth/login`, `/auth/token`, `/auth/refresh`, `/auth/logout` and
`/auth/me`, and logs an `authz` decision line per attempt. Route authorization lives in `workers/lib/authz.js` and the signing authority in
`workers/lib/authority.js`.

### Worker contract schema v1

[`mdk-contract.schema.json`](./backend/core/mdk-worker/mdk-contract.schema.json) gains a `contractVersion` field, currently `"1"`, and two requirements that
apply at the strict tier:

| Requirement | Applies to |
| ------------------------------------------------------- | ------------------------------------------- |
| `unit` is required and comes from a closed vocabulary    | Numeric telemetry metrics |
| `min` and `max` are required                             | Numeric command parameters |

The vocabulary is `TH/s`, `W`, `kW`, `J/TH`, `°C`, `%`, `rpm`, `V`, `A`, `Hz`, `s` and `count`, so an agent can aggregate the same metric across vendors.
Command parameters also accept a `default`, which for numbers must sit inside `[min, max]`.

Version gating is the point of the stamp. A contract that declares `contractVersion` opts into strict validation and gets errors. A contract without one is
validated as legacy and reports the same findings as warnings, so existing Workers keep loading. The Worker catalogue carries the v1 strictness state as a
visible grace-period flag.

### Private HyperDHT bootstrap and DHT bind host

[`backend/core/mdk/lib/dht-bootstrap.js`](./backend/core/mdk/lib/dht-bootstrap.js) runs a private HyperDHT bootstrap node, and a new `dhtHost` option sets the
interface the DHT node binds: `127.0.0.1` to keep a site on one machine, or a LAN address on an isolated network. It is accepted by the Kernel HRPC listener
(`opts.listeners.hrpc.dhtHost`), the Gateway, the app runtime, the client and the Worker runtime, and defaults to all interfaces. See
[the private DHT guide](./docs/guides/deployment/private-dht.md).

### UI

| Package | Addition |
| --------------------------- | ------------------------------------------------------------------------------- |
| `@tetherto/mdk-ui-foundation` | `passwordAuth` signs a user in through the Kernel's token issuer and keeps the refresh token in an httpOnly cookie |
| `@tetherto/mdk-ui-foundation` | `describeRequestError`, plus `download-utils` and `period-utils` helpers |
| `@tetherto/mdk-react-adapter` | `usePeriod` holds a reporting period in the URL, and `toQueryView` shapes a query result for display |
| `@tetherto/mdk-react-adapter` | A route may name a `section`, and a module may give each section a label and icon through `MdkAppSection`, so the sidebar groups pages |
| `@tetherto/mdk-react-devkit`  | `PeriodControl`, a timeframe picker, plus `PlugIcon` and `ExternalLinkIcon` |

### Documentation

- [Build your first app](./docs/tutorials/build-your-first-app.md): a 15 minute tutorial from `git clone` to a running app with a UI
- [Benchmark results and operating limits](./docs/guides/deployment/benchmark-results.md): measured latency, resource use and recovery for real Kernel, Gateway
  and Worker processes, with the operating envelopes derived from them, backed by the published runs under `backend/tests/benchmark/published/`
- [Transport comparison](./docs/concepts/transport-comparison.md): HRPC over HyperDHT against a known-endpoint RPC
- The root [README](./README.md) replaces "Get started" with a six step quickstart that runs entirely from a clone and needs no package from the npm registry

Every partner-maintained Worker under `backend/workers/` now ships a `LICENSE` file.

## Changed

- `validateParams` is still exported from `@tetherto/mdk-worker`, but it now re-exports the Kernel's implementation from `@tetherto/mdk-kernel/protocol/params`,
  so the Worker runtime and the Kernel validate command parameters with the same code
- `mdk run` refuses to boot a Kernel whose policy binds nobody, or whose policy nobody may write
- The `mdk` CLI groups the authentication commands together in its help output, and the service-account command is named `serviceaccount`
- `SingleStatCard` can colour its value, and the level bar chart's category labels render correctly with `sats` in lowercase
- The [`mdk-ui-component`](./packages/mdk-skill/src/skills/mdk-ui-component/SKILL.md) skill is rebuilt around app UI modules and carries a content test, and
  [`mdk-app-rbac`](./packages/mdk-skill/src/skills/mdk-app-rbac/SKILL.md) derives an app's permissions from its code
- The `examples/mvp-site` demo gains a sign-in page, an activity page, user types, and an access policy with roles, so it exercises the new authorization path
- The benchmark harness measures an online fleet and reports failures it was previously hiding

## Removed

- `backend/apps/agent` and `backend/apps/demo`, with the `backend/apps/*` root workspace entry (see Breaking changes)
- `backend/core/mdk-worker/lib/param-validator.js`, superseded by the Kernel's `protocol/params` module behind the same public export

## Security

- The root `overrides` pin [`body-parser`](./package.json) to `2.4.0` and `@fastify/static` to `10.1.2`
- `vitest` and its companions move from `^4.1.2` to `^4.1.12` across the UI packages

## Dependencies

The backend packages install on npm 12. The `@bitfinex/bfx-facs-*` facilities pulled `bfx-facs-base` from git, which npm 12 rejects with `EALLOWGIT`.

| Package | Change |
| -------------------------- | ------------------------------------------------------------- |
| `@tetherto/mdk-gateway`    | `@bitfinex/bfx-facs-lru` `^1.0.0` replaced by `lru` `3.1.0` |
| `@tetherto/mdk-core`       | `@bitfinex/bfx-facs-scheduler` `^1.0.0` replaced by `node-schedule` `2.0.0`, `@bitfinex/bfx-facs-interval` dropped |
| `@tetherto/mdk-kernel`     | `@bitfinex/bfx-facs-interval` dropped |

The interval facilities were unused. The pool scheduler and the Gateway caches now use `node-schedule` and `lru` directly.

`@tetherto/mdk-identity` and `@tetherto/mdk-rbac` are new dependencies of `@tetherto/mdk-kernel`, `@tetherto/mdk-gateway`, `@tetherto/mdk-mcp`,
`@tetherto/mdk-app-runtime`, `@tetherto/mdk-client` and `@tetherto/mdk-cli`.

## Fixed

- `@tetherto/mdk-react-devkit` installs into a fresh project without pre-installing `zod`. Resolving the `@hookform/resolvers` peer pulled in its optional
  `@typeschema` chain, which settled on zod 3 and clashed with the zod 4 peer, failing with `ERESOLVE`
- `createMdkQueryClient` and `MdkProvider` accept a `fetcher` again. v0.12.0 removed it with the mining data path, but `passwordAuth` hands its renew-on-401
  fetcher to the query client through it
- The pool scheduler skips unscheduled jobs once it stops, and keeps `scheduler_0.del` for pool Workers that re-key a job
- A Worker sidebar item in the shell template stays active when the URL carries a query, and query-keyed items match by subset
- A Worker's unit type check stays a base error on legacy contracts, so a contract without `contractVersion` is not failed by a v1 rule
- The agent's default MCP endpoint is `3101`, and the deprecated `qwen3-600m` entry is gone
- The UI package manifests are publish-ready, as are the backend Worker packages

> For previous releases, see the [changelog archive](./docs/reference/changelog-archive/2026-archive.md)
