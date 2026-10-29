# `@tetherto/mdk-cli`

The `mdk` command-line tool. Built with Commander.js and `@clack/prompts`; the implemented commands are:
`mdk onboard` (a guided wizard that detects the environment, asks the setup
questions and writes `mdk.yaml`), `mdk create` (`worker`, `app`, `dashboard`
— each self-registering in the spec), `mdk add` (`app`, `worker` from npm or
GitHub), `mdk validate` (`app`, `worker`), `mdk run` (boots the stack from the
spec), `mdk status` (environment + component health) and `mdk skill add`
(installs the `@tetherto/mdk-skill` suite).

## Stack

- **Runtime:** Node.js >= 24, TypeScript, ESM
- **Framework:** [Commander.js](https://github.com/tj/commander.js) for the
command tree, parsing, and help; `[@clack/prompts](https://github.com/bombshell-dev/clack)`
for interactive wizard steps
- The `mdk` binary is exposed via the package.json `bin` field pointing at
`dist/index.js` (which carries a `#!/usr/bin/env node` shebang)

## Project layout

`onboard` and `create` emit one role-grouped layout, so a path in `mdk.yaml` says
what it is:

```text
mdk.yaml           the stack spec
package.json       private root manifest; links workers/ and apps/<name>/ by file: deps
README.md          generated: layout + the run commands
workers/<name>/    worker plugins   (mdk create worker)
apps/<name>/       apps             (mdk create app)
apps/dashboard/    the UI dashboard (mdk create dashboard)
.mdk/              runtime state written by `mdk run` — gitignored, disposable
```

Workers and apps are linked from the root manifest by relative `file:`
dependencies because the runtime resolves them out of the project's
`node_modules` — so `create worker` and `create app` run `npm install` **at the
project root**, not in the package. The dashboard is deliberately not linked: it
links the MDK UI packages by `file:` path, and hoisting its React through the root
alongside those links invites a duplicate-React bug, so it installs in place.

`.mdk/` gives each component its own data root (`kernel/`, `gateway/`, `mcp/`,
`workers/<name>/`, `apps/<name>/`) plus the files components in other processes
find each other by: `kernel.key` (read by the Gateway, apps and the MCP server),
`keys/` (written by Workers, watched by the Kernel), `gateway.key` (the key app
runtimes accept), `trusted-keys/` (every caller's key, admitted by the Kernel
and Workers) and `run/` (one lock per running Kernel, Worker and app). Delete
the whole directory to reset a stack.

## Develop

Install once from the packages workspace root (this links `@tetherto/mdk-skill`
into the CLI), then work from this package:

```bash
npm install --prefix ..       # from packages/ — links workspace deps
npm run dev -- --help         # run from source via tsx
npm run build                 # compile to dist/
node dist/index.js --help     # run the built CLI
```

Link it as a global `mdk` for local testing:

```bash
npm run build && npm link
mdk --help
# when done: npm rm -g @tetherto/mdk-cli
```

Run the tests:

```bash
npm test                      # unit tests, no network (coverage gate: npm run test:coverage)
npm run test:e2e:stack        # ~1 min, needs network: scaffolds a worker and an app, runs the whole
                              # stack, then checks it over HTTP, with `mdk status` and against the
                              # app runtime's key allow-list
npm run test:e2e:scaffold     # ~2 min, needs network and a built ui/ (npm --prefix ../../ui run build):
                              # scaffolds a worker, an app with its starter UI and the dashboard,
                              # builds the UIs, serves the app's UI with `mdk run dashboard` and calls
                              # the running stack through the dashboard's Gateway proxy
npm run test:e2e              # both
```

## Try it out

Run the implemented commands against a throwaway project so nothing pollutes the
repo. From this package after `npm run build`:

```bash
mkdir -p /tmp/mdk-try && cd /tmp/mdk-try
CLI=/path/to/mdk/packages/cli/dist/index.js

# Install the MDK Developer Skill (via the @tetherto/mdk-skill entry point)
node "$CLI" skill add --client all --dir .
ls .cursor/skills .claude/skills   # mdk, mdk-gateway-plugin, mdk-deployment, mdk-worker-plugin, mdk-ui-component, mdk-site-sizing, mdk-create-app

# Scaffold the MDK UI shell into apps/dashboard, named <stack>-dashboard from mdk.yaml
node "$CLI" create dashboard --dir .
ls apps/dashboard                  # src/, vite.config.ts, package.json, ...
```

The onboarding wizard needs a real terminal (TTY), so run it directly (not
piped). It writes `mdk.yaml`, the root [`package.json`](./package.json), `.gitignore` and a project
[`README.md`](./README.md), optionally installs the skill + scaffolds the UI shell, and prints
the run commands. Answers to `secret` plugin-setup questions are not written to `mdk.yaml`
(which you commit): the spec gets a `${MDK_<PLUGIN>_<KEY>}` placeholder and the value goes to
the project's gitignored, owner-only `.env`. `mdk run` resolves `${VAR}` in
`spec.gateway.config`, `spec.apps[].config` and `spec.workers[].env` from the
process environment first, then `.env`:

```bash
cd /tmp/mdk-try && node "$CLI" onboard
```

Dev mode works the same without building — run from `packages/cli`:

```bash
npm run dev -- skill add --client cursor --dir /tmp/mdk-try
npm run dev -- create dashboard --dir /tmp/mdk-try
npm run dev -- onboard
```

### Run the stack

`mdk run` boots the components declared in `mdk.yaml` against project-local state
under `.mdk/`. With no target, it boots the Kernel, every Worker, every app
(see [Apps](#apps)) and the Gateway together (the MCP server is never part of
`all` — it's always started explicitly, see [Run the MCP server](#run-the-mcp-server)).
Prefer separate terminals instead? Run each component on its own (`mdk run
kernel`, `mdk run worker <name>`, `mdk run app <name>`, `mdk run gateway`) —
that's just which commands you type, not a spec setting.

A **Worker** is a plugin package (contract + handlers) that the CLI hosts on
`WorkerRuntimeV2` — the same "caller hosts the plugin" split the monorepo examples
use. Reference one in `mdk.yaml` by **local path** (what `mdk create worker`
writes) or by installed package name (what `mdk add worker` writes), and describe
its seed devices under the plugin-defined `config`:

```yaml
spec:
  workers:
    - name: miner-a
      package: ./workers/my-miner      # local path (or an installed npm name)
      config:
        mock: true                     # start the plugin's mock/server.js per device
        devices:
          - id: v3-0
            opts: { host: 127.0.0.1, port: 18080, serial: WM3-DEMO-0, hashrateThs: 200, powerW: 3500 }
          - id: v3-1
            opts: { host: 127.0.0.1, port: 18081, serial: WM3-DEMO-1, hashrateThs: 180, powerW: 3300 }
```

`config.devices[].opts` is the plugin's own per-device config (opaque to the CLI).
With `mock: true` the CLI starts one simulator from `<package>/mock/server.js` per
device so the Worker talks to a mock instead of hardware.

#### Apps

An **app** is declared under `spec.apps[]` as
`{ name, package, config, mount? }`; the package needs an `mdk-app.yaml` and a
`mdk-plugin.json` route table in `plugin/` or at its root (`mdk create app` scaffolds both).
`spec.gateway.plugins` is rejected. That list is the whole of what
the Gateway serves. A package that ships several apps as subdirectories names
each by its subpath (`package: "@your-org/apps/ops"`):

```yaml
spec:
  apps:
    - name: agent
      package: "@tetherto/mdk-app-agent"           # the UI calls it at /agent
      mount: /                                        # serve at the root, not /apps/agent
    - name: demo
      package: "@tetherto/mdk-app-demo"            # an installed npm name
    - name: site
      package: ./apps/site                            # or a local path
      config:
        agent: { provider: { kind: qvac } }
```

`mdk run` starts one runtime child process per app before the Gateway, restarts
one that exits unexpectedly, and stops them on shutdown; `mdk run app <name>`
runs a single app in the foreground instead. The Gateway serves each app under
`/apps/<name>` unless `mount` is set. An app accepts calls only from the key in
`.mdk/gateway.key`, and publishes its own keys to `.mdk/apps/<name>/runtime.key`
(read by the Gateway) and `.mdk/trusted-keys/app-<name>.pub` (its Kernel client key, which the Kernel admits).

Undeclared means unserved: any path no declared app serves gets `404`. `mdk
status` reports an app whose package does not resolve (subpath included) and
whether each app is running.

Scaffold a Worker from the bundled template (a device client for an HTTP JSON API, with
a simulator under `mock/`) — it lands under `workers/<name>`, ready to reference by local path:

```bash
node "$CLI" create worker demo-miner --dir /tmp/mdk-try   # → /tmp/mdk-try/workers/demo-miner
```

`create worker` also writes the new Worker into the project's `mdk.yaml` under
`spec.workers` (with a `mock: true` seed device) so it is runnable right away;
pass `--no-stack-entry` to skip and print the snippet instead. It leaves an
existing same-named entry untouched.

The seed device is given a stack-unique identity — mock port counting up from
`18080`, and a device id/serial derived from the Worker name — so scaffolding
several Workers into one project never produces a conflict. Both matter: a
duplicate port fails the boot, and a duplicate device id is worse, because the
Kernel registers ids globally and silently keeps only the first. `mdk run`
rejects a spec that repeats a Worker name or device id, naming both offenders.

`mdk run` runs in the foreground and owns Ctrl+C (and `SIGTERM`). Components are
stopped in reverse boot order — gateway, apps, then Workers and their mocks, then the
Kernel — but the process exits regardless of how that goes: a stop that throws is
skipped, a stop that wedges is abandoned after 5s with a forced exit, and a
second Ctrl+C exits immediately. So the ports a run holds are always released
when it is stopped. If a port is still busy afterward, the run did not actually
exit — check for a forgotten foreground `mdk run` in another terminal
(`ps -o pid,stat,etime,command -p <pid>`; a `+` in `STAT` means it is still the
foreground job of a live tab).

Each Kernel, Worker and app runs once per project. `mdk run` takes a lock for
every one it starts (`.mdk/run/<component>.pid`) and refuses a second copy with
the pid of the first: two copies of a Worker or app share its identity keys and
store, so the second takes over the first one's network key and the first goes
unreachable. A lock left behind by a process that is gone is taken over. The
Gateway and the MCP server are covered by their port check instead.

#### Private HyperDHT (local or air-gapped)

Every component talks HRPC over HyperDHT, which joins the public `*.hyperdht.org` bootstrap by default. Add
`spec.network.dht` to keep the whole stack on a private network bound to one interface:

```yaml
spec:
  network:
    dht:
      host: 127.0.0.1        # interface every DHT node binds (default 127.0.0.1; every interface with bootstrap)
      port: 49737            # UDP port of the bootstrap mdk run starts (default 49737)
      # bootstrap: [10.20.0.5:49737]  # join an existing private bootstrap instead
```

Without `bootstrap`, the process that runs the Kernel (`mdk run` or `mdk run kernel`) also runs the bootstrap at `host:port`
and stops it after the Kernel. The other targets and every command that calls the Kernel (`mdk status`, `mdk user`, `mdk rbac`)
join it. A bootstrap list that names a public HyperDHT node is refused. The
[local and air-gapped profile](../../docs/guides/deployment/private-dht.md) covers PM2, Docker and isolated LANs.

### Run the dashboard

`mdk run dashboard` starts the scaffolded UI shell's dev server
(`npm run dev` under `apps/dashboard`, or the first `apps/*` app with a `dev`
script if the dashboard was created with a custom `--name`). Unlike the Kernel,
Gateway and Workers — all booted in-process — the dashboard is a separate
Vite/React app with its own dependency tree (kept out of the project's npm
workspaces so its React is never hoisted alongside anyone else's, see
[Project layout](#project-layout)), so it always runs as its own child process.
It shares `mdk run`'s Ctrl+C/`SIGTERM` handling: the dev server is sent
`SIGTERM` and the command waits for it to exit before releasing its port.

```bash
node "$CLI" create dashboard --dir /tmp/mdk-try
node "$CLI" run dashboard --dir /tmp/mdk-try   # separate terminal from `mdk run`
```

Mock ports are also resolved at boot. The configured port is used whenever it is
free; when something else already holds it (another stack on the machine, a
Worker left running) the mock moves to the next free port and says so, since the
port is a private contract between the simulator and the plugin that dials it.
Workers step over ports their not-yet-booted neighbours declared, so one squatter
relocates one Worker rather than shifting all of them. The Gateway port is never
relocated — it is a published endpoint, so a conflict there is a fast, explicit
failure before anything boots.

Every `create` command installs dependencies by default (`--no-install` to skip):
a Worker or app installs from the project root, so npm links it through its `file:`
dependency, while the dashboard installs in place. If the project has no root
[`package.json`](./package.json) yet, `create worker` and `create app` write one.

```bash
node "$CLI" run --dir /tmp/mdk-try                      # everything together: kernel + workers + apps + gateway
node "$CLI" run worker demo-miner --dir /tmp/mdk-try    # just the worker (+ its mocks)
```

### Run the MCP server

`mdk run mcp` boots a standalone [`@tetherto/mdk-mcp`](../../backend/core/mcp/README.md)
server — a separate process from the Gateway, which has no MCP code of its own.
It requires `mdk.yaml` exactly like every other `run` target, and reads the same
`spec.apps` the Gateway serves: each declared app's
`mdk-plugin.json` contract is converted into MCP tools with no separate tool
authoring. Like the Gateway, it runs no app code: each tool call is forwarded to
the app's runtime, so an app's tools answer once `mdk run` has started it
(until then a call returns `ERR_APP_RUNTIME_UNAVAILABLE`). Like `dashboard`,
`mcp` is never part of the default `all` target — it's always started
explicitly, and needs the Kernel already reachable (an in-process handle isn't
available to a standalone `run mcp`, so start the Kernel first: `mdk run kernel`).

```bash
node "$CLI" run --dir /tmp/mdk-try           # first, in its own terminal
node "$CLI" run mcp --dir /tmp/mdk-try       # then, in another terminal
```

The server listens on `spec.mcp.port` if set in `mdk.yaml`, else
`spec.gateway.port + 100`:

```yaml
spec:
  gateway:
    port: 3000
  mcp:
    port: 3100   # optional — defaults to gateway.port + 100
    allowWrite: false        # optional — same as `mdk run mcp --allow-write`
    allowTools: [demo.summary]  # optional — expose only these tool ids (write tools included)
    token: ${MDK_MCP_TOKEN}  # optional — require `Authorization: Bearer <token>` on /mcp; `mdk run mcp` fails if the variable is unset
    identity: { user: agent }   # optional — needed to expose `auth: true` Gateway routes
```

Tools that are not declared read-only (`"safety": "read-only"` on the route, as the
`mdk create app` template does for its summary route) stay hidden unless you pass `--allow-write`
(or set `spec.mcp.allowWrite`) or name them in `allowTools`. The CLI owns
`Ctrl+C`/`SIGTERM` and closes the server itself.


### Check the stack

`mdk status` is a one-shot report — it never starts, stops, or repairs
anything. Its one write is the CLI's own caller key, published to
`.mdk/trusted-keys/cli.pub` so the fail-closed Kernel answers its probe. It covers
the **environment** (Node 24 or newer, package manager, `mdk.yaml` validity, and
whether every declared Worker and app package actually resolves) and the **stack**
(Kernel, Gateway, each Worker with its state, health, and device count, and each app).

```bash
node "$CLI" status --dir /tmp/mdk-try
node "$CLI" status --dir /tmp/mdk-try -o json | jq .health
```

Liveness is probed, never inferred from files: `.mdk/kernel.key` and
`.mdk/keys/*.key` survive a shutdown by design (the keys are stable across
restarts), so the Kernel is probed over HRPC with that key and the Gateway over
HTTP on its configured port (any answer below `500` counts). An app runtime accepts
calls from the Gateway's key only, so an app counts as running while a live
process holds its run lock.

Exit codes make it scriptable (`mdk status && deploy…`):

| Exit code | Fires when                                                             | Fix                                 |
| --------- | ---------------------------------------------------------------------- | ----------------------------------- |
| `0`       | Environment checks pass and every component reports `healthy`          | None                                |
| `1`       | `collectStatus` throws while gathering the report, an unexpected error | Check the printed error message and the project directory (`--dir`) |
| `2`       | `--output` names a format outside `table`/`json`/`yaml`                | Pass one of `table`, `json`, `yaml` |
| `4`       | An environment precondition fails: old Node, a missing or invalid `mdk.yaml`, or a declared package that doesn't resolve | Fix the precondition the report names |
| `5`       | The stack isn't fully up: Kernel or Gateway unreachable, a declared Worker not registered/serving, or a declared app not running | Check the component the report marks unhealthy |

Notes:

- `skill add` resolves `@tetherto/mdk-skill` through node/npm (no path walking),
assembling on demand inside the monorepo and copying the bundled skills once
published
- `create dashboard` (and the onboarding UI step) scaffold the MDK UI shell from
[`examples/mdk-ui-shell-template`](../../examples/mdk-ui-shell-template/README.md) (a real, runnable
Vite app that doubles as the template). **Inside the monorepo** it copies that template locally (no network)
and rewrites the template's `file:` MDK deps to absolute links into the
monorepo's `ui/packages/*`. **Standalone**, it downloads the same subtree from
GitHub (`tetherto/mdk .../examples/mdk-ui-shell-template`) via `degit`, which
needs network access, and pins MDK deps to a published range. Either way it
lands in `apps/dashboard`, takes the package + `APP_NAME` from
`<stack>-dashboard`, and copies
`.env.example` → `.env` with `VITE_GATEWAY_URL` pointed at this stack's gateway
port. Passing a name puts the app in `apps/<name>` instead.

| Flag           | Status   | Type     | Default  | Description                                     |
| -------------- | -------- | -------- | -------- | ----------------------------------------------- |
| `--ref`        | Optional | `string` | `v<cli version>` | Branch/tag/SHA to scaffold from; ignored in monorepo (local template always wins), applies only to the standalone GitHub path |
| `--force`      | Optional | `boolean` | `false` | Overwrite the target directory; recursively deletes it first, no confirmation prompt |
| `--no-install` | Optional | `boolean` | `false` | Skip the post-scaffold dependency install       |

- The scaffolded dashboard is a normal Vite app: `npm run build` inside it
produces a `dist/` you serve however you serve static assets. `create dashboard`
only sets `VITE_GATEWAY_URL`/`VITE_OAUTH_BASE_URL` for local dev against this
stack — update `apps/dashboard/.env` before building for any other target.
- Reset a scratch run with `rm -rf /tmp/mdk-try`

Or link it as a real `mdk` command (optional; best for testing):

```bash
cd packages/cli
npm run build && npm link   # exposes a global `mdk`

mkdir mdk-try && cd mdk-try
mdk --help
mdk skill add --client cursor
mdk create dashboard
mdk onboard

# when done: npm rm -g @tetherto/mdk-cli
```

## Adding and validating apps and workers

```bash
# From npm (a scope, a version range and, for packages that ship several apps, a subpath all work)
mdk add app @your-org/mdk-app-ops-center@^1
mdk add worker @your-org/mdk-worker-rig
# From GitHub: github:owner/repo[#ref], owner/repo or a github.com URL
mdk add app github:me/my-app#v0.2.0 --name ops

mdk validate app ops          # the app mdk.yaml lists as `ops` under spec.apps
mdk validate worker rig --json
mdk validate app --path . --smoke --strict --json   # a partner's app repo in CI
```

`mdk add` runs `npm install --ignore-scripts --save-exact <source>` in the project (so npm records the
exact version in `package.json`, and no install script of an unchecked package runs), checks the installed
package with the same rules as `mdk validate`, and only then adds it under `spec.apps` / `spec.workers` in
`mdk.yaml`, keeping the file's comments and formatting. A refused package leaves `mdk.yaml` untouched and
puts `package.json` and the lockfile back, so it neither stays installed nor replaces a version an app
already runs. Adding the same package again updates it under the name it already has; giving it another
`--name` adds it as a second app. A
GitHub source has to be installed (no `--no-install`), because its package name is only known after
npm has fetched it. A worker without a bundled mock is added without `mock: true`; fill in its
`config.devices[].opts`.

An app runs as its own service account, `app:<name>`, which `mdk add app` records on its `spec.apps` entry, with a new credential in
`.mdk/credentials/apps/<name>.json` that stays in this instance and never ships in the package. Install also writes a role
`app-<name>` and its binding into `spec.rbac`, granting exactly the Kernel access the app's `mdk-app.yaml` `permissions` request;
`mdk create app` and `mdk onboard` write the same grant for the apps they list. The
role is then the operator's: narrowing or removing it survives a re-add of the same package. When a new version requests different
access, `mdk add app` shows both rule sets and refuses until you pass one of the flags below.

| Flag                   | Effect when the app's requested Kernel access changed                     |
| ---------------------- | ------------------------------------------------------------------------- |
| `--accept-permissions` | Replaces the role with the new request, dropping any narrowing you made   |
| `--keep-permissions`   | Keeps the role as it is and records the new request as seen               |

`mdk validate app <name>` and `mdk validate worker <name>` take the name the component has in `mdk.yaml` (as
`mdk run app <name>` does), from the project in `--dir` (default `.`), and check the package that entry resolves to.
`mdk validate app` checks `mdk-app.yaml`, its version against `package.json`, the permission rules and the
route table (`plugin/mdk-plugin.json`, else `mdk-plugin.json` at the package root), by the same rules the app
runtime and the Gateway apply at boot: a reverse-DNS `id`, a semver `version`, and handlers that resolve inside
the plugin directory, paths that start with `/` and appear once per method, and handlers (and `main`) that compile. Permission
rules must name Kernel resources (`devices`, `workers`, `commands`, `actions`, `policy`, `identities`) with verbs those resources take,
and `permissions` must be there (`[]` when the app makes no Kernel call). An app named in `mdk.yaml` is also checked against
`spec.rbac`: a policy that binds nobody, no `app-<name>` role, a role that differs from what the manifest requests, or no binding
for `app:<name>` each fail the check with the command that fixes it, since the Kernel would refuse the app's calls.
Unknown `mdk-app.yaml` keys are reported, so a typo does not pass silently. `mdk validate worker` checks `package.json`
and the `mdk-contract.json` Worker Plugin contract: at least one telemetry entry or command, command `params` as lists,
and handlers resolved on disk and compiling. Nothing is run, so a module that throws when loaded only shows when the
component starts. Both exit 1 on any error.

`mdk validate worker --path <dir>` checks a package directory that no `mdk.yaml` declares, such as a partner's own
repo in CI. `--smoke` adds behavioral checks against the package's bundled mock, which `setup()` in its
`smoke.config.js` starts. While the mock runs, every telemetry channel must return its declared type and every sample
command in `commands` must succeed. After `teardown()`, every channel and command must fail with an `ERR_*` error code
within `--timeout`, except a `health` channel reporting a status other than `OK`, and the channels `offlineTelemetry`
lists because the Worker serves them from its own store. The [Worker testing guide](../../docs/guides/workers/test-a-worker.md#check-the-package)
lists every `smoke.config.js` field.

`mdk validate app --path <dir>` is the same partner-CI check for an app, and its exit code is the listing gate. `--smoke`
loads the app's routes and `main` through the app runtime's own loader and calls every route against an in-memory
Kernel that serves a mock fleet and grants the app exactly its `mdk-app.yaml` `permissions`, as `mdk add app` would.
No Kernel, Gateway or DHT runs. `--strict` turns every warning into an error, including install scripts in
`package.json` (which `mdk add` never runs) and a route `--smoke` could not call.

| Smoke check                                                  | Fails when                                                                      |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Routes load and every handler exports a function             | A handler or a module it requires throws, or does not export a function         |
| `main` runs to completion                                    | `main` rejects, throws or does not settle within `--timeout`                    |
| Each route answers with JSON or an `ERR_*`                   | The route throws a non-`ERR_*` error, returns a value JSON cannot encode, or hangs |
| Each route stays within the permissions in `mdk-app.yaml`    | The route makes a Kernel call the declared rules, `resourceNames` included, do not grant |
| A read-only route makes no Kernel write                      | A route the Gateway authorizes as `get` or `list`, or marked `safety: read-only`, sends a command or another write |
| Each route answers with JSON or an `ERR_*` while the Kernel is down | The route hangs or crashes once every Kernel call fails with `ERR_MDK_CLIENT_UNAVAILABLE` |

`smoke.config.js` at the app root is optional. Its `setup()` returns these fields, and `--smoke-config` takes the same object
as inline JSON or a `.json` file.

| Field      | Default                                         | Description                                                            |
| ---------- | ----------------------------------------------- | ---------------------------------------------------------------------- |
| `workers`  | One worker `smoke` with one device `smoke-0`    | The mock fleet: `[{ workerId, family?, brand?, devices: [{ id, telemetry?, state?, capabilities? }] }]`. `telemetry` maps a query type to its reply |
| `requests` | None                                            | A sample `{ params, query, body, headers }` per route id. A route with a path param or required input and no sample is skipped with a warning |
| `config`   | None                                            | Operator config over the manifest's `config` defaults                  |
| `teardown` | None                                            | Stops whatever `setup()` started                                       |

## Access policy

`spec.rbac` in `mdk.yaml` decides who may do what, at the Gateway (users), the MCP server (agents) and the Kernel (apps). No matching
rule means denied, and a stack without `spec.rbac` denies everything. The [RBAC library](../../backend/core/rbac/README.md) defines the
rule shape and vocabulary. Every `mdk.yaml` load validates the policy and lists each problem with its path.

```bash
mdk rbac apply          # validate spec.rbac and hand it to the running Kernel
mdk rbac show -o json   # compare spec.rbac with the policy the Kernel enforces
```

The Kernel applies `spec.rbac` each time `mdk run` starts it. `mdk rbac apply` switches a running Kernel to an edited policy at once;
if the Kernel refuses it, the policy in force stays. Both commands exit 1 when the Kernel is down or refuses.

## Users and service accounts

Every caller signs in to the Kernel's [token issuer](../../backend/core/identity/README.md) and gets a short-lived access token plus a
refresh token that rotates on every use. Users sign in with a password. Service accounts (each app as `app:<name>`, each AI agent by
name) sign in with their own Ed25519 key.

```bash
mdk run kernel &                                  # users live in the Kernel, so it must be running
mdk user add ankit@example.com --admin            # the first admin: prompts for a password, binds the user to `admin`
echo "$PW" | mdk user add ci-bot --password-stdin --group ops-team
mdk sa add operator-agent                         # an AI agent's credential, then bind it in spec.rbac
mdk sa list
```

`mdk user add --admin` writes the `admin` role (`resources: ["*"]`, `verbs: ["*"]`) when `spec.rbac` has none, binds the user to it,
and applies the policy to the running Kernel. Full access is an ordinary role, so a stack has it only once a binding grants it.
Passwords come from a prompt typed twice or from `--password-stdin`, never from a flag value.

| Command                                   | Effect                                                                                     |
| ----------------------------------------- | ------------------------------------------------------------------------------------------ |
| `mdk user add <name>`                     | Creates or updates a user (`--email`, `--group`, `--admin`, `--no-password`)               |
| `mdk user passwd <name>`                  | Sets the password and ends the user's sessions                                             |
| `mdk user disable <name>` / `enable`      | Stops or restores sign-in; disabling ends the user's sessions                              |
| `mdk user remove <name>`                  | Deletes the user; their `spec.rbac` bindings stay until you remove them                    |
| `mdk user list`                           | Lists users, with `-o json \| yaml`                                                        |
| `mdk sa add <agent>`                      | Creates an agent credential in `.mdk/credentials/agents/` and registers it with a running Kernel |
| `mdk sa rotate <name>`                    | Replaces an app's or agent's key; the old key's sessions end                               |
| `mdk sa remove <agent>`                   | Deletes an agent's credential and registration                                             |
| `mdk sa list`                             | Lists credentials here against what the running Kernel registered                          |
| `mdk sa token <name>`                     | Prints a short-lived access token for an agent's HTTP client (`-o json` adds the refresh token) |

Every `mdk run` registers exactly the stack's apps and this instance's agents with the Kernel, creating a missing app credential, so
an app removed from `spec.apps` loses its account at the next start. Deleting `.mdk/` deletes the users and credentials with it.

The Kernel checks every call against `spec.rbac`. Each app runtime signs in as its app's account with the credential above,
and the CLI signs in as its own account, `mdk-cli` (`.mdk/credentials/agents/mdk-cli.json`). So the CLI may do only what a
binding grants it. `mdk onboard` writes one binding `mdk-cli` to an `admin` role holding wildcards; for an existing stack,
`mdk rbac init` writes it, plus each app's grant from its `mdk-app.yaml`:

```bash
mdk rbac init     # bind mdk-cli to admin, mdk-gateway and mdk-mcp to policy: read, grant every app its Kernel access, apply
```

A Gateway started on its own (`mdk run gateway`) signs in as `mdk-gateway` to read the policy it enforces, and the MCP server
(`mdk run mcp`) as `mdk-mcp`; under `mdk run` the Gateway uses the in-process Kernel's policy directly. Each AI agent connects to
the MCP server with its own account's token (`mdk sa add <agent>`, then `mdk sa token <agent>` or the agent signing in itself),
sees only the tools its roles allow, and reaches apps as itself. `spec.mcp.token`, `spec.mcp.identity` and
`spec.gateway.config.authVerifier` are refused: spec.rbac replaces all three. Either way every app route needs a bearer token and a `spec.rbac` rule: users
sign in at `POST /auth/login` (a scaffolded dashboard does this with a password form), and the Gateway answers `401` or `403`.

The CLI acts as a user once you sign in:

```bash
mdk login ankit@example.com   # prompts for the password; or --password-stdin
mdk whoami                    # ankit@example.com, until the session runs out
mdk logout                    # back to mdk-cli
```

The session lives in `.mdk/session.json` (0600) and is renewed as it is used. While it lasts, `mdk status`, `mdk user`, `mdk sa`
and `mdk rbac` act as the user, with what `spec.rbac` binds the user to; an expired session is an error, never a quiet return
to `mdk-cli`.

`mdk run` and `mdk run kernel` refuse to start when `spec.rbac` lets nobody write the policy (no subject bound to a role allowing
`policy: write`, as after `mdk create app` on a stack with no admin yet): that Kernel would refuse the policy `mdk rbac init` hands
it, so `mdk rbac init` comes first. They warn at start when `mdk-cli` has no binding, or when an app has none. A role you edited is left alone by `mdk rbac init`. When a running Kernel refuses the new policy because its policy in
force does not let `mdk-cli` apply one, restarting the Kernel applies `mdk.yaml` at boot.

## Command surface

| Group            | Commands                                                                              |
| ---------------- | ------------------------------------------------------------------------------------- |
| Onboarding       | `mdk onboard`                                                                         |
| Scaffold         | `mdk create worker <name>`, `mdk create app <name>`, `mdk create dashboard [name]` |
| Add              | `mdk add app <source>`, `mdk add worker <source>`                                    |
| Validate         | `mdk validate app <name>`, `mdk validate worker <name>`                               |
| Run & manage     | `mdk run [target] [name]` (target: `all`\|`kernel`\|`gateway`\|`mcp`\|`worker <name>`\|`app <name>`\|`dashboard`), `mdk status`, `mdk rbac init`, `mdk rbac apply`, `mdk rbac show`, `mdk user …`, `mdk sa …`, `mdk login`, `mdk logout`, `mdk whoami` |
| Agent enablement | `mdk skill add`                                                                       |
| Meta             | `mdk version`                                                                         |

Global flags:

| Flag                 | Status   | Type      | Default | Description                                        |
| -------------------- | -------- | --------- | ------- | -------------------------------------------------- |
| `-o, --output <fmt>` | Optional | `string`  | `table` | Output format for data: `table`, `json`, or `yaml` |
| `-v, --verbose`      | Optional | `boolean` | `false` | Increase log detail                                |
| `--debug`            | Optional | `boolean` | `false` | Print stack traces for unexpected failures         |
| `--version`          | Optional | `boolean` | `false` | Print the CLI version and exit                     |
| `-h, --help`         | Optional | `boolean` | `false` | Print usage help and exit                          |

## Next steps

- See [`instruction.md`](instruction.md) for the full guide (conventions, output
rules, and definition of done). Read it before contributing, especially if you
are an AI coding agent.
