# `@tetherto/mdk-cli`

The `mdk` command-line tool. The entire command surface is wired up with
Commander.js and `@clack/prompts`, and the lifecycle spine is implemented:
`mdk onboard` (a guided wizard that detects the environment, asks the setup
questions and writes `mdk.yaml`), `mdk create` (`worker`, `plugin`, `dashboard`
— each self-registering in the spec), `mdk run` (boots the stack from the
spec), `mdk status` (environment + component health) and `mdk skill add`
(installs the `@tetherto/mdk-skill` suite). The remaining commands are no-op
stubs that mark themselves `(stub)` in help, ready for another developer to
plug in the real functionality command by command.

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
package.json       private root manifest; workers/ + plugins/ are npm workspaces
README.md          generated: layout + the run commands
workers/<name>/    worker plugins   (mdk create worker)
plugins/<name>/    gateway plugins  (mdk create plugin)
apps/dashboard/    the UI dashboard (mdk create dashboard)
.mdk/              runtime state written by `mdk run` — gitignored, disposable
```

Workers and gateway plugins are npm workspaces because the runtime resolves them
out of the project's `node_modules`, which the workspace symlink provides for
free — so `create worker` runs `npm install` **at the project root**, not in the
package. `apps/*` is deliberately left out of the workspaces: the dashboard links
the MDK UI packages by `file:` path, and hoisting its React through the root
alongside those links invites a duplicate-React bug, so it installs in place.

`.mdk/` gives each component its own data root (`kernel/`, `gateway/`, `mcp/`,
`workers/<name>/`) plus the two cross-process handoff artifacts both sides look
for: `kernel.key` (read by the Gateway and the MCP server) and `keys/` (written
by Workers, watched by the Kernel). Delete the whole directory to reset a
stack.

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

## Try it out

Run the implemented commands against a throwaway project so nothing pollutes the
repo. From this package after `npm run build`:

```bash
mkdir -p /tmp/mdk-try && cd /tmp/mdk-try
CLI=/path/to/mdk-prv/packages/cli/dist/index.js

# Install the MDK Developer Skill (via the @tetherto/mdk-skill entry point)
node "$CLI" skill add --client all --dir .
ls .cursor/skills .claude/skills   # mdk, mdk-gateway-plugin, mdk-deployment, mdk-worker-plugin, mdk-ui-component, mdk-site-sizing

# Scaffold the MDK UI shell into apps/dashboard, named <stack>-dashboard from mdk.yaml
node "$CLI" create dashboard --dir .
ls apps/dashboard                  # src/, vite.config.ts, package.json, ...
```

The onboarding wizard needs a real terminal (TTY), so run it directly (not
piped). It writes `mdk.yaml`, the root [`package.json`](./package.json), `.gitignore` and a project
[`README.md`](./README.md), optionally installs the skill + scaffolds the UI shell, and prints
the run commands:

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
under `.mdk/`. With no target, it boots the Kernel, every Worker, and the
Gateway together in one process (the MCP server is never part of `all` — it's
always started explicitly, see [Run the MCP server](#run-the-mcp-server)).
Prefer separate terminals instead? Run each component on its own (`mdk run
kernel`, `mdk run worker <name>`, `mdk run gateway`) — that's just which
commands you type, not a spec setting.

A **Worker** is a plugin package (contract + handlers) that the CLI hosts on
`WorkerRuntimeV2` — the same "caller hosts the plugin" split the monorepo examples
use. Because Worker plugins live beside the stack and are not published to npm,
reference them in `mdk.yaml` by **local path**, and describe their seed devices
under the plugin-defined `config`:

```yaml
spec:
  workers:
    - name: demo-worker-a
      package: ./workers/demo-worker   # local path (or an installed npm name)
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

A **Gateway plugin** is declared the same way, under `spec.gateway.plugins[]`. That
list is the whole of what the Gateway loads, including the three plugins MDK
ships (`telemetry`, `site-hashrate`, `site-monitor`). They are subdirectories of
one package, so each is named by its subpath:

```yaml
spec:
  gateway:
    port: 3847
    plugins:
      - package: "@tetherto/mdk-plugins/telemetry"      # one MDK ships
      - package: "@tetherto/mdk-plugins/site-monitor"
      - package: "@tetherto/mdk-plugin-demo"            # an installed npm name
      - package: ./plugins/site                         # or a local path
        config:
          agent: { provider: { kind: qvac } }
```

Undeclared means unserved: a stack that names none of the three gets `404` on
`/auth/site`, `/auth/metrics/*` and the rest. `mdk status` reports a plugin whose
package does not resolve, subpath included.

Scaffold a Worker from the bundled template (a mirror of
[`backend/workers/samples/demo-worker`](../../backend/workers/samples/demo-worker/README.md), a
firmware-v3 miner simulator) — it lands under `workers/<name>`, ready to reference by local path:

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
stopped in reverse boot order — gateway, then Workers and their mocks, then the
Kernel — but the process exits regardless of how that goes: a stop that throws is
skipped, a stop that wedges is abandoned after 5s with a forced exit, and a
second Ctrl+C exits immediately. So the ports a run holds are always released
when it is stopped. If a port is still busy afterward, the run did not actually
exit — check for a forgotten foreground `mdk run` in another terminal
(`ps -o pid,stat,etime,command -p <pid>`; a `+` in `STAT` means it is still the
foreground job of a live tab).

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

Both `create` commands install dependencies by default (`--no-install` to skip):
a Worker installs from the project root so npm links it as a workspace, while the
dashboard installs in place. If the project has no root [`package.json`](./package.json) yet,
`create worker` writes one.

```bash
node "$CLI" run --dir /tmp/mdk-try                      # everything together: kernel + workers + gateway
node "$CLI" run worker demo-miner --dir /tmp/mdk-try    # just the worker (+ its mocks)
```

### Run the MCP server

`mdk run mcp` boots a standalone [`@tetherto/mdk-mcp`](../../backend/core/mcp/README.md)
server — a separate process from the Gateway, which has no MCP code of its own.
It requires `mdk.yaml` exactly like every other `run` target, and reads the same
`spec.gateway.plugins` the Gateway itself loads: each declared plugin's
`mdk-plugin.json` contract is converted into MCP tools with no separate tool
authoring. Like `dashboard`, `mcp` is never part of the default `all` target —
it's always started explicitly, and needs the Kernel already reachable (an
in-process handle isn't available to a standalone `run mcp`, so start the
Kernel first: `mdk run kernel`).

```bash
node "$CLI" run kernel --dir /tmp/mdk-try    # first, in its own terminal
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
```

This is distinct from `mdk mcp register` (a separate, still-`(stub)` command
for registering an MCP endpoint in a coding-agent's own client config) — `run
mcp` is what actually starts the server that command would point a client at.

### Check the stack

`mdk status` is a one-shot, read-only report — it never starts, stops, or repairs
anything. It covers the **environment** (Node version, package manager, `mdk.yaml`
validity, and whether every declared Worker plugin package actually resolves) and
the **stack** (Kernel, Gateway, and each Worker with its state, health, and device
count).

```bash
node "$CLI" status --dir /tmp/mdk-try
node "$CLI" status --dir /tmp/mdk-try -o json | jq .health
```

Liveness is probed, never inferred from files: `.mdk/kernel.key` and
`.mdk/keys/*.key` survive a shutdown by design (the keys are stable across
restarts), so the Kernel is probed over HRPC with that key and the Gateway over
HTTP on its configured port.

Exit codes make it scriptable (`mdk status && deploy…`):

| Exit code | Fires when                                                             | Fix                                 |
| --------- | ---------------------------------------------------------------------- | ----------------------------------- |
| `0`       | Environment checks pass and every component reports `healthy`          | None                                |
| `1`       | `collectStatus` throws while gathering the report, an unexpected error | Check the printed error message and the project directory (`--dir`) |
| `2`       | `--output` names a format outside `table`/`json`/`yaml`                | Pass one of `table`, `json`, `yaml` |
| `4`       | An environment precondition fails: old Node, a missing or invalid `mdk.yaml`, or a declared package that doesn't resolve | Fix the precondition the report names |
| `5`       | The stack isn't fully up: Kernel or Gateway unreachable, or a declared Worker not registered/serving | Check the component the report marks unhealthy |

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
`<stack>-dashboard`, strips the on-demand `_managed/` pages, and copies
`.env.example` → `.env` with `VITE_GATEWAY_URL` pointed at this stack's gateway
port. Passing a name puts the app in `apps/<name>` instead.

| Flag           | Status   | Type     | Default  | Description                                     |
| -------------- | -------- | -------- | -------- | ----------------------------------------------- |
| `--ref`        | Optional | `string` | `main`   | Branch/tag to scaffold from; ignored in monorepo (local template always wins), applies only to the standalone GitHub path |
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

## Command surface

Stub commands are wired up (name, arguments, options, help) but not implemented: each prints
`mdk <command>: not implemented yet (stub).` to stderr and exits 0.

| Group            | Implemented commands                                                                  | Stub commands                                                               |
| ---------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Onboarding       | `mdk onboard`                                                                         |                                                                             |
| Scaffold         | `mdk create worker <name>`, `mdk create plugin <name>`, `mdk create dashboard [name]` |                                                                             |
| Run & manage     | `mdk run [target] [name]` (target: `all`\|`kernel`\|`gateway`\|`mcp`\|`worker <name>`\|`dashboard`), `mdk status` | `mdk get <resource>`, `mdk describe <resource> <name>`, `mdk logs <target>` |
| Discover         |                                                                                       | `mdk discover`                                                              |
| Agent enablement | `mdk skill add`                                                                       | `mdk mcp register`                                                          |
| Meta             | `mdk version`                                                                         | `mdk manifest` (alias `json-help`)                                          |

Global flags:

| Flag                 | Status   | Type      | Default | Description                                        |
| -------------------- | -------- | --------- | ------- | -------------------------------------------------- |
| `-o, --output <fmt>` | Optional | `string`  | `table` | Output format for data: `table`, `json`, or `yaml` |
| `-v, --verbose`      | Optional | `boolean` | `false` | Increase log detail                                |
| `--debug`            | Optional | `boolean` | `false` | Print stack traces for unexpected failures         |
| `--version`          | Optional | `boolean` | `false` | Print the CLI version and exit                     |
| `-h, --help`         | Optional | `boolean` | `false` | Print usage help and exit                          |

### Implement a command

Each command lives under [`src/commands/`](./src/commands/). To add behavior, replace the
`stub(...)` call in the command's `.action(...)` with the real implementation.
The command wiring (name, arguments, options, help) does not need to change.

## Next steps

- See [`instruction.md`](instruction.md) for the full guide (conventions, output
rules, and definition of done). Read it before contributing, especially if you
are an AI coding agent.
