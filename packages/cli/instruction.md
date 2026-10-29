# Agent instructions — `@tetherto/mdk-cli`

Guidance for AI coding agents working on this package. Read this **before**
making changes. The CLI grows one command at a time, without churning the
wiring.

## What this package is

The `mdk` command-line tool. Every command registered in
[`program.ts`](./src/program.ts) is implemented; there are no stub commands.

- **`onboard`**: a guided wizard that detects the environment, asks setup
  questions (pre-filled defaults), writes `mdk.yaml`, and prints the run commands.
- **`create`** (`worker`, `app`, `dashboard`), **`add`** (`app`, `worker`) and
  **`validate`** (`app`, `worker`): scaffold, install and check packages.
- **`run`** (`all`, `kernel`, `gateway`, `mcp`, `worker`, `app`, `dashboard`) and
  **`status`**: boot the stack from `mdk.yaml` and report its health.
- **`rbac`**, **`user`**, **`sa`**, **`login`**, **`logout`**, **`whoami`**:
  access policy, users, service accounts and the CLI's own session.
- **`skill add`** and **`version`**.

The earlier planned commands `get`, `describe`, `logs`, `discover`, `manifest` and
`mcp register` are not part of the CLI and are not registered, so they do not
appear in `--help`. Do not re-add a placeholder that only prints "not implemented":
register a command once it works.

## Project layout

```text
src/
  index.ts            # entry point (shebang); parses argv, maps errors -> exit 1
  program.ts          # builds the Commander tree; registers every command group
  commands/           # one file per command group
    onboard.ts        # onboard — reference for style & UX
    create.ts         # create worker | app | dashboard
    add.ts            # add app | worker (npm or GitHub)
    validate.ts       # validate app | worker
    run.ts            # run [target] [name]
    inspect.ts        # status
    rbac.ts           # rbac init | apply | show
    user.ts, sa.ts    # user and service-account management
    session.ts        # login | logout | whoami
    agent.ts          # skill add
    meta.ts           # version
  lib/                # every file in src/lib, grouped by purpose
    # project and spec
    pkg.ts            # reads package.json (name, version)
    detect.ts         # environment detection used by onboard
    spec.ts           # builds + loads the mdk.yaml stack spec
    project.ts        # the emitted layout: root manifest, .gitignore, README
    names.ts          # name and --org validation for workers, apps, dashboards, stacks
    env-file.ts       # the project's gitignored .env (secret setup answers)
    checkout.ts       # finds the MDK monorepo checkout the CLI runs from, if any
    catalog.ts        # the packages onboard offers, and where each resolves from
    plugin-setup.ts   # an app's mdk-plugin.json setup questions
    # scaffolding
    scaffold.ts       # shared scaffold helpers (backend package deps, mdk.yaml writes)
    worker-scaffold.ts# create worker: template copy + mdk.yaml registration
    app-scaffold.ts   # create app: template copy + mdk.yaml registration
    dashboard.ts      # create dashboard: UI shell template -> apps/dashboard
    dashboard-apps.ts # the installed-apps handoff from `mdk run dashboard` to the dashboard
    fetch-template.ts # degit wrapper for fetching a GitHub subtree
    # add and validate
    add-package.ts    # add: install, validate, then register in mdk.yaml
    package-source.ts # `add` sources: npm package or GitHub repo
    app-package.ts, worker-package.ts  # the rules behind `validate`
    app-ui-check.ts, app-ui-runner.ts  # contract check of an app's built ui/
    worker-smoke.ts   # smoke-runs a worker against its contract
    # run and status
    runtime.ts        # boots kernel/gateway/workers; owns the .mdk state paths
    status.ts         # read-only status: env + spec + probes kernel/gateway/workers
    kernel-client.ts  # lazy @tetherto/mdk-client wrapper for talking to the Kernel
    ports.ts          # free-port probing for local components
    run-lock.ts       # one running copy per component and project
    shutdown.ts       # Ctrl+C handling: stops components in reverse boot order
    # access and sign-in
    rbac.ts, rbac-init.ts, rbac-kernel.ts, identity-kernel.ts  # access policy
    session.ts, session-kernel.ts, credentials.ts              # sign-in
    # misc
    npm.ts            # `npm install` helpers (workspace-aware)
    skill.ts          # installs the @tetherto/mdk-skill suite
    help.ts           # help grouping and example formatting
    theme.ts          # colors, badge, banner, aligned kv/cmd blocks
```

Each `commands/*.ts` file exports `register<Name>(program)` functions that
[`program.ts`](./src/program.ts) calls. To add a command group, create a `register*` and call it in
`buildProgram()`.

## Tech stack & conventions

- **Node.js >= 24, TypeScript, ESM.** [`tsconfig.json`](./tsconfig.json) uses `NodeNext` module
  resolution, so **relative imports must include the `.js` extension** (e.g.
  `import { pkg } from '../lib/pkg.js'`), even though the source is `.ts`.
- **Commander.js** for the command tree, parsing, and help.
- **`@clack/prompts`** for interactive wizard steps (see [`onboard.ts`](./src/commands/onboard.ts)).
- **`picocolors`** for color; go through [`src/lib/theme.ts`](./src/lib/theme.ts) for a consistent
  look and correct `NO_COLOR` / non-TTY fallback. Do not hardcode ANSI codes
  outside [`theme.ts`](./src/lib/theme.ts).
- **`yaml`** for reading/writing `mdk.yaml`.
- Keep the code `strict`-clean: no new TypeScript or lint errors.

## Build, run, test

```bash
npm install --prefix ..      # from this directory (packages/cli) — links workspace deps
npm run dev -- <args>        # run from source via tsx, e.g. npm run dev -- onboard
npm run build                # compile to dist/
node dist/index.js <args>    # run the built CLI
npm run clean                # remove dist/
```

This package is a member of the `packages/` npm workspace root (alongside
`@tetherto/mdk-skill`) — a workspace scoped to `packages/`, separate from the
monorepo root's own `workspaces` field, which does not (yet) list `packages/cli`
— so this package's own deps install via a single `npm install` from
`packages/`.

Always `npm run build` after changes and smoke-test the affected command before
finishing. Run `npm test` (vitest) — it covers `src/lib` and `src/commands` —
and add tests for anything you implement.

## CLI behavior rules (agent- and pipe-friendly)

- **stdout is for machine-facing data; stderr is for humans.** Data that a user
  might pipe (`version`, `status -o json`, `user list`, ...) goes to stdout; status notices,
  prompts, and errors go to stderr.
- **Respect `-o, --output <table|json|yaml>`** for any command that emits data.
  Default is `table`; `json`/`yaml` output must be clean and parseable.
- **Exit codes are semantic:** `0` success, non-zero on failure. Unexpected
  errors surface via [`index.ts`](./src/index.ts) as exit `1`; use `--debug` to decide whether to
  print stack traces.
- **Guard interactivity:** anything that prompts must check `process.stdin.isTTY`
  and fail with a clear message when not attached to a terminal (see [`onboard.ts`](./src/commands/onboard.ts)).
- **Honor `NO_COLOR` and non-TTY** — always color through [`theme.ts`](./src/lib/theme.ts).
- **`mdk.yaml` is the declarative source of truth** for the stack. Build/modify
  it via [`lib/spec.ts`](./src/lib/spec.ts) (`buildStackSpec`) rather than string-templating YAML. When
  editing an existing spec, go through the `yaml` document API (see
  [`worker-scaffold.ts`](./src/lib/worker-scaffold.ts)) so the user's formatting and comments survive.
- **The emitted layout lives in [`lib/project.ts`](./src/lib/project.ts)** (`DIRS`, `WORKSPACES`). A new
  scaffold command belongs in one of those role directories — never hardcode a
  path, and never invent a new top-level directory without updating `DIRS`,
  the generated README, and the package README together.
- **Runtime state belongs under `.mdk/`** via the helpers in [`lib/runtime.ts`](./src/lib/runtime.ts).
  Nothing a command writes at run time may land in the project root.

## Coding style

- Match the existing style in [`onboard.ts`](./src/commands/onboard.ts) and [`program.ts`](./src/program.ts).
- **Do not add narrating comments** (e.g. `// import x`, `// loop over items`).
  Comments should explain non-obvious intent, trade-offs, or constraints only.
- Prefer small, pure helpers (see [`lib/spec.ts`](./src/lib/spec.ts)) so logic is testable without a
  TTY.
- When adding a dependency, use the package manager (`npm install <pkg>`) so the
  lockfile updates; do not hand-edit versions.

## Where to look for domain context

- **CLI design:** the command wiring in [`src/program.ts`](./src/program.ts) and `src/commands/*.ts`
  is the source of truth (see [Project layout](#project-layout) above).
- **MDK architecture** (Kernel, Gateway, Worker) lives in the backend core
  packages ([`../../backend/core/kernel`](../../backend/core/kernel/README.md), [`../../backend/core/gateway`](../../backend/core/gateway/README.md),
  [`../../backend/core/mdk`](../../backend/core/mdk/README.md)) and [`../../backend/core/docs`](../../backend/core/docs/README.md). Commands like `run`,
  `status`, `rbac` and `user` integrate against these.
- **Liveness is always probed, never read from files.** `.mdk/kernel.key` and
  `.mdk/keys/*.key` intentionally survive shutdown (the keys are stable across
  restarts), so their presence proves only that a component once ran. [`status.ts`](./src/lib/status.ts)
  probes the Kernel over HRPC (`@tetherto/mdk-client`) and the Gateway over HTTP.

## Definition of done for a command

1. Command is registered in [`program.ts`](./src/program.ts) with a `HELP_GROUPS` heading, and only once it works: no placeholder commands in `--help`.
2. Output obeys the stdout/stderr split and `--output` format.
3. Sensible exit codes; interactivity guarded; color via [`theme.ts`](./src/lib/theme.ts).
4. `npm run build` passes with no new type/lint errors.
5. The command was smoke-tested (happy path + one failure path).
6. [`README.md`](./README.md) command table updated if behavior/status changed.
