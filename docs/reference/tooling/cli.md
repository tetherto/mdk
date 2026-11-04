---
title: CLI reference
description: Every `mdk` command, its arguments, flags and defaults, grouped as `mdk --help` groups them
docs@tether_slug: reference/tooling/cli
lastReviewedAt: "0.13.1"
notes: "hand-maintained from the Commander definitions in packages/cli/src/commands until a generator target lands; the plan for that generator is in reference/maintainers/single-source-of-truth.md#cli-reference"
---

## Overview

`mdk` is the command-line tool that scaffolds, runs and checks an MDK stack from the `mdk.yaml` spec in a project directory.
This page lists every command with its arguments, flags and defaults, in the groups `mdk --help` uses. It states what each
command takes and does, not how to sequence them: the [install guide][cli-install] puts `mdk` on your PATH, the
[Worker guide][run-your-worker] runs a stack end to end, and the [first operator page][first-operator] creates the user who
signs in. Every command reads `mdk <verb> [noun]`, and `mdk <command> --help` prints the same options from the binary.

Every command that reads an existing project takes `--dir <path>`, the directory holding `mdk.yaml`, and defaults to the
current directory. `mdk onboard` is the exception: it creates the project and asks for the directory as its first prompt,
so it has no `--dir`. Commands that print data honor the global `--output` flag.

## Global flags

| Flag                 | Status   | Type      | Default | Description                                        |
| -------------------- | -------- | --------- | ------- | -------------------------------------------------- |
| `-o, --output <fmt>` | Optional | `string`  | `table` | Output format for data: `table`, `json`, or `yaml` |
| `-v, --verbose`      | Optional | `boolean` | `false` | Increase log detail                                |
| `--debug`            | Optional | `boolean` | `false` | Print stack traces for unexpected failures         |
| `--version`          | Optional | `boolean` | `false` | Print the CLI version and exit                     |
| `-h, --help`         | Optional | `boolean` | `false` | Print usage help and exit                          |

## Set up

### `mdk onboard`

Sets up a new project interactively: checks the environment, asks which Workers, apps and dashboard to include, writes
`mdk.yaml`, `package.json`, `.gitignore` and a project `README.md`, and prints the commands to run it. The policy it writes
binds the CLI's own account and each app, so the stack boots; the [first operator][first-operator] is created afterwards.
It takes no flags and needs an interactive terminal.

## Build

### `mdk create worker <name>`

Scaffolds a Worker Plugin (`mdk-contract.json`, handlers and a mock device) into `workers/<name>`, links it into
`package.json` and adds it to `mdk.yaml` under `spec.workers` with a mock device. `<name>` is lowercase letters, digits,
`.`, `_` or `-`.

| Flag               | Status   | Type      | Default | Description                                                  |
| ------------------ | -------- | --------- | ------- | ------------------------------------------------------------ |
| `--org <scope>`    | Optional | `string`  | none    | npm scope for the package name: `your-org` gives `@your-org/<name>` |
| `--dir <path>`     | Optional | `string`  | `.`     | Project directory                                            |
| `--force`          | Optional | `boolean` | `false` | Overwrite the target if it already exists                    |
| `--no-install`     | Optional | `boolean` | `false` | Skip `npm install`                                           |
| `--no-stack-entry` | Optional | `boolean` | `false` | Do not add the Worker to `mdk.yaml`; the entry is printed instead |

### `mdk create app <name>`

Scaffolds an app (`mdk-app.yaml`, a `plugin/` route table with controllers, and a starter UI built into `ui/`) into
`apps/<name>`, links it into `package.json`, adds it to `mdk.yaml` under `spec.apps` and grants it the Kernel access its
manifest requests in `spec.rbac`. `<name>` follows the Worker rule.

| Flag               | Status   | Type      | Default | Description                                                  |
| ------------------ | -------- | --------- | ------- | ------------------------------------------------------------ |
| `--org <scope>`    | Optional | `string`  | none    | npm scope for the package name                               |
| `--dir <path>`     | Optional | `string`  | `.`     | Project directory                                            |
| `--flat`           | Optional | `boolean` | `false` | Scaffold into `<dir>` itself as the root of a standalone app repo, for `mdk add app github:…`; nothing is linked or added to `mdk.yaml` |
| `--force`          | Optional | `boolean` | `false` | Overwrite the target if it already exists                    |
| `--no-install`     | Optional | `boolean` | `false` | Skip `npm install` and the starter UI build                  |
| `--no-stack-entry` | Optional | `boolean` | `false` | Do not add the app to `mdk.yaml`; the entry is printed instead |

### `mdk create dashboard [name]`

Scaffolds the MDK UI shell into `apps/dashboard`, named `<stack>-dashboard` from `mdk.yaml`. With a name it lands in
`apps/<name>` instead. Inside the monorepo the template is copied locally; elsewhere it is fetched from GitHub at `--ref`.

| Flag              | Status   | Type      | Default           | Description                                        |
| ----------------- | -------- | --------- | ----------------- | -------------------------------------------------- |
| `--dir <path>`    | Optional | `string`  | `.`               | Project directory                                  |
| `--ref <git-ref>` | Optional | `string`  | `v<cli version>`  | Branch, tag or SHA to fetch the UI shell from; ignored inside the monorepo |
| `--force`         | Optional | `boolean` | `false`           | Overwrite the target if it already exists          |
| `--no-install`    | Optional | `boolean` | `false`           | Skip `npm install`                                 |

### `mdk add app <source>` and `mdk add worker <source>`

Installs a package from npm or GitHub with `npm install --ignore-scripts --save-exact`, checks it with the same rules as
`mdk validate`, then adds it to `mdk.yaml` under `spec.apps` or `spec.workers`. A refused package leaves `mdk.yaml` and
`package.json` unchanged. A path on disk is refused: reference a local package by path in `mdk.yaml` instead.

`<source>` is one of:

| Form                                   | Example                                   |
| -------------------------------------- | ----------------------------------------- |
| npm package, optionally with a range   | `@your-org/mdk-worker-rig@^1`             |
| npm package with a subpath inside it   | `@your-org/apps/ops`                      |
| GitHub shorthand, optionally with a ref | `github:owner/repo#v0.2.0`, `owner/repo` |
| GitHub URL                             | `https://github.com/owner/repo`           |

| Flag                   | Status   | Type      | Default | Applies to | Description                                                  |
| ---------------------- | -------- | --------- | ------- | ---------- | ------------------------------------------------------------ |
| `--dir <path>`         | Optional | `string`  | `.`     | both       | Project directory                                            |
| `--name <name>`        | Optional | `string`  | derived | both       | Name in `mdk.yaml`; the default strips the `mdk-app-` or `mdk-worker-` prefix from the package name |
| `--no-install`         | Optional | `boolean` | `false` | both       | Skip `npm install`; the npm package must already be installed. Not for GitHub sources |
| `--accept-permissions` | Optional | `boolean` | `false` | app        | When the app's requested Kernel access changed, replace its role in `spec.rbac` with the new request |
| `--keep-permissions`   | Optional | `boolean` | `false` | app        | When the app's requested Kernel access changed, keep its role as it is and record the new request as seen |

An app installs as service account `app:<name>`, with a credential under `.mdk/credentials/apps/` and a role in `spec.rbac`
granting exactly what its `mdk-app.yaml` requests. A Worker without a bundled mock is added without `mock: true`.

### `mdk validate app [name]` and `mdk validate worker [name]`

Checks a package and lists every problem; exits `1` when it is not valid. Name a component `mdk.yaml` declares, or check
any package directory with `--path`. For an app the check covers `mdk-app.yaml`, its version against `package.json`, the
permission rules, the route table, every handler file and the UI build; a named app's grant in `spec.rbac` is checked too.
For a Worker it covers `package.json` and `mdk-contract.json` against the schema and its semantic rules, with every handler
resolved on disk and compiled but not run.

| Flag                         | Status   | Type      | Default | Description                                                  |
| ---------------------------- | -------- | --------- | ------- | ------------------------------------------------------------ |
| `--dir <path>`               | Optional | `string`  | `.`     | Project directory                                            |
| `--path <dir>`               | Optional | `string`  | none    | Check this package directory instead of a name declared in `mdk.yaml` |
| `--strict`                   | Optional | `boolean` | `false` | App: fail on warnings too. Worker: hold a legacy contract to the full v1 requirements |
| `--smoke`                    | Optional | `boolean` | `false` | App: call every route against a mock Kernel that grants only the declared permissions. Worker: run the behavioural checks against the mock `smoke.config.js` sets up |
| `--smoke-config <json\|path>` | Optional | `string`  | none    | Mock fleet or device spec for `--smoke`: inline JSON, a `.json` file, or a module with `setup()` |
| `--timeout <ms>`             | Optional | `string`  | `10000` | Deadline per smoke call                                      |
| `--json`                     | Optional | `boolean` | `false` | Print `{ ok, kind, name, path, errors, warnings }`            |

The [Worker testing guide][test-a-worker-smoke] lists every `smoke.config.js` field for a Worker, and the
[apps guide][apps-guide] covers the app smoke checks.

## Run

### `mdk run [target] [name]`

Starts the Kernel, Workers, app runtimes and Gateway from `mdk.yaml`, or one component. Runs in the foreground; Ctrl+C
stops everything in reverse boot order. Each Kernel, Worker and app runs once per project, held by a lock under
`.mdk/run/`. A `spec.rbac` that binds nobody is refused before boot, with `mdk rbac init` as the fix.

| Target      | Starts                                                        | Takes `[name]` |
| ----------- | ------------------------------------------------------------- | -------------- |
| `all`       | Kernel, every Worker with its mocks, every app, the Gateway. The default | no    |
| `kernel`    | The Kernel alone                                              | no             |
| `gateway`   | The Gateway alone, signing in as `mdk-gateway`                | no             |
| `worker`    | One Worker and its mock devices                               | yes            |
| `app`       | One app runtime in the foreground                             | yes            |
| `dashboard` | The scaffolded UI shell's dev server, as its own process      | no             |
| `mcp`       | A standalone MCP server over the apps `spec.apps` declares; never part of `all` and needs the Kernel reachable | no |

| Flag               | Status   | Type      | Default | Description                                                  |
| ------------------ | -------- | --------- | ------- | ------------------------------------------------------------ |
| `-d, --dir <path>` | Optional | `string`  | `.`     | Project directory                                            |
| `--allow-write`    | Optional | `boolean` | `false` | `mcp` only: expose tools whose routes are not declared read-only |

> [!NOTE]
> `--detach` is reserved and refused until background runs land. `mdk run` stays in the foreground, and `mdk --help`
> does not list the flag.

`mdk run mcp` reads these optional keys from `spec.mcp` in `mdk.yaml`:

| Key          | Type      | Default                    | Description                                                  |
| ------------ | --------- | -------------------------- | ------------------------------------------------------------ |
| `port`       | `number`  | `spec.gateway.port` + 100  | Port the MCP server listens on                               |
| `allowWrite` | `boolean` | `false`                    | Same as `--allow-write`                                      |
| `allowTools` | `string[]`| none                       | Expose only these tool ids, write tools included             |

`spec.mcp.token` and `spec.mcp.identity` are refused: each agent signs in with its own service account, and `spec.rbac`
decides what it may call.

### `mdk status`

A one-shot report on the environment (Node version, package manager, `mdk.yaml` validity, whether every declared package
resolves) and the stack (Kernel, Gateway, each Worker with its state, health and device count, each app). It starts, stops
and repairs nothing; its one write is the CLI's caller key under `.mdk/trusted-keys/`.

| Flag               | Status   | Type     | Default | Description       |
| ------------------ | -------- | -------- | ------- | ----------------- |
| `-d, --dir <path>` | Optional | `string` | `.`     | Project directory |

| Exit code | Fires when                                                                 | Fix                                       |
| --------- | -------------------------------------------------------------------------- | ----------------------------------------- |
| `0`       | Environment checks pass and every component reports `healthy`              | None                                      |
| `1`       | Gathering the report threw an unexpected error                             | Read the printed error and check `--dir`  |
| `2`       | `--output` names a format other than `table`, `json` or `yaml`             | Pass one of the three                     |
| `4`       | An environment precondition fails: old Node, a missing or invalid `mdk.yaml`, a declared package that does not resolve | Fix the precondition the report names |
| `5`       | The stack is not fully up: Kernel or Gateway unreachable, a Worker not `READY`, an app not running | Check the component the report marks unhealthy |

## Auth

`spec.rbac` in `mdk.yaml` is the only place policy is written, and no matching rule means denied. The
[security blueprint][security-policy] covers the policy itself; the [first operator page][first-operator] walks the sign-in
sequence. Every command in this group takes `-d, --dir <path>` (default `.`).

### `mdk rbac`

| Command          | Effect                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------- |
| `mdk rbac init`  | Binds the CLI's account `mdk-cli` to an `admin` role (written if missing), `mdk-gateway` and `mdk-mcp` to a policy-reading role, and grants each app its requested Kernel access, then applies the policy to a running Kernel. A role you edited is left alone |
| `mdk rbac apply` | Validates `spec.rbac`, listing every problem, and hands it to the running Kernel, which switches at once. A refused policy leaves the one in force untouched |
| `mdk rbac show`  | Compares `spec.rbac` with the policy the Kernel enforces                                                 |

`apply` and `show` exit `1` when the Kernel is down or refuses the policy. `init` still writes `mdk.yaml` with the Kernel
down and exits `0`, since the Kernel applies the file when it next starts; it exits `1` when an app's grant cannot be
written. All three exit `1` on an invalid `spec.rbac`.

### `mdk user`

Users live in the Kernel's token issuer, so every subcommand needs the Kernel running.

| Command                         | Effect                                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------ |
| `mdk user add <name>`           | Creates or updates a user and sets their password; `<name>` is the `sub` of their tokens and an email works |
| `mdk user passwd <name>`        | Sets the password and ends the user's sessions                                             |
| `mdk user disable <name>`       | Stops the user signing in and ends their sessions                                          |
| `mdk user enable <name>`        | Lets a disabled user sign in again                                                         |
| `mdk user remove <name>`        | Deletes the user; their `spec.rbac` bindings stay until you remove them                    |
| `mdk user list`                 | Lists users, honoring `-o json` and `-o yaml`                                              |

Flags of `mdk user add`:

| Flag               | Status   | Type      | Default | Description                                                  |
| ------------------ | -------- | --------- | ------- | ------------------------------------------------------------ |
| `--email <email>`  | Optional | `string`  | none    | Email, also matched by `User` bindings                       |
| `--group <group>`  | Optional | `string`  | none    | Group matched by `Group` bindings; repeatable, and replaces the current groups |
| `--admin`          | Optional | `boolean` | `false` | Bind the user to the `admin` role in `spec.rbac`, writing the role if missing, and apply the policy |
| `--no-password`    | Optional | `boolean` | `false` | Create the user without a password; they cannot sign in until `mdk user passwd` |
| `--password-stdin` | Optional | `boolean` | `false` | Read the password from `stdin` instead of prompting twice   |

`mdk user passwd` takes `--password-stdin` too. A password is never accepted as a flag value, and the Kernel refuses one
shorter than twelve characters.

### `mdk serviceaccount`

`mdk sa` is the alias. A service account signs in with its own key: `app:<name>` for each app, created by `mdk add app`, and
a named account per AI agent. The private key stays in `.mdk/credentials/` and never ships in a package.

| Command                 | Effect                                                                                             |
| ----------------------- | -------------------------------------------------------------------------------------------------- |
| `mdk sa add <agent>`    | Creates an agent credential and registers it with a running Kernel; bind it to a role in `spec.rbac` next |
| `mdk sa rotate <name>`  | Replaces the key of `app:<app>` or an agent; the old key's sessions end                            |
| `mdk sa remove <agent>` | Deletes an agent's credential and registration                                                      |
| `mdk sa token <name>`   | Signs in as the account and prints a short-lived access token for an HTTP client; `-o json` adds the refresh token |
| `mdk sa list`           | Lists the credentials here against what the running Kernel registered                              |

### `mdk login <username>`, `mdk logout`, `mdk whoami`

`mdk login` signs in to the Kernel's token issuer and keeps the session in `.mdk/session.json`, readable by you alone. While
it lasts, `mdk status`, `mdk user`, `mdk sa` and `mdk rbac` act as you, with what `spec.rbac` binds you to; an expired
session is an error, never a quiet return to the service account. `mdk logout` ends the session, and `mdk whoami` prints
who the CLI acts as, honoring `-o json` and `-o yaml`.

| Flag               | Status   | Type      | Default | Applies to | Description                     |
| ------------------ | -------- | --------- | ------- | ---------- | ------------------------------- |
| `--password-stdin` | Optional | `boolean` | `false` | `login`    | Read the password from `stdin`  |

## Agent enablement

### `mdk skill add`

Installs the MDK Developer Skill suite into the project, so a coding agent knows MDK conventions.

| Flag                | Status   | Type     | Default | Description                              |
| ------------------- | -------- | -------- | ------- | ---------------------------------------- |
| `--client <client>` | Optional | `string` | `all`   | Target client: `cursor`, `claude` or `all` |
| `--dir <path>`      | Optional | `string` | `.`     | Project directory                        |

## Meta

### `mdk version`

Prints the package name and version to stdout. `mdk --version` prints the version alone.

## Next steps

- [Install the CLI][cli-install]: put `mdk` on your PATH from npm, or from a source checkout to work on the CLI itself
- [Run your Worker with the CLI][run-your-worker]: the commands in sequence, from a declared package to a dashboard and an agent
- [Create the first operator][first-operator]: the user every dashboard and route sign-in needs
- [Read the CLI package notes][cli-package]: how the CLI is built, tested and run from source

## Links

[cli-install]: ../../guides/cli/install.md
<!-- docs@tether.io: cli-install → guides/cli/run-with-npm -->

[run-your-worker]: ../../guides/cli/run-your-worker.md
<!-- docs@tether.io: run-your-worker → guides/cli/run-your-worker -->

[first-operator]: ../../guides/security/create-the-first-operator.md
<!-- docs@tether.io: first-operator → guides/security/create-the-first-operator -->

[security-policy]: ../../guides/security/index.md#step-4-write-the-policy-and-put-identity-in-the-gateway
<!-- docs@tether.io: security-policy → guides/security#step-4-write-the-policy-and-put-identity-in-the-gateway -->

[apps-guide]: ../../guides/gateway/apps.md
<!-- docs@tether.io: apps-guide → guides/gateway/apps -->

[test-a-worker-smoke]: ../../guides/workers/test-a-worker.md#check-the-package
<!-- docs@tether.io: test-a-worker-smoke → guides/workers/test-a-worker#check-the-package -->

[cli-package]: ../../../packages/cli/README.md
<!-- docs@tether.io: cli-package → https://github.com/tetherto/mdk/blob/main/packages/cli/README.md -->
