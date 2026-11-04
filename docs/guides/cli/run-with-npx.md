---
title: Run the CLI with npx
description: "[⏱️ ~2 min] Run one `mdk` command from the registry without installing it"
docs@tether_slug: guides/cli/run-with-npx
lastReviewedAt: "0.13.1"
---

## TL;DR

- `npx --yes @tetherto/mdk-cli@0.13 <command>` runs one `mdk` command with nothing installed on your PATH
- Pin an exact version in CI so every run executes the same build, for example `npx --yes @tetherto/mdk-cli@0.13.0 status`
- The authorization gate still applies: a stack runs `mdk rbac init` before its first `mdk run`, however the CLI was started

## Overview

`npx` fetches the published CLI into the npm cache and runs it once. That suits commands that need no project, such as
`mdk skill add` or `mdk create worker`, checks in CI against a committed `mdk.yaml`, and trying a version before you adopt it.
For day-to-day operation of a stack, [install the CLI][cli-install] instead: every `npx` call resolves the package again, and
`mdk run` keeps the terminal in the foreground for as long as the stack is up.

Packages scaffolded this way depend on the published MDK packages, so the project's own `npm install` reaches the registry.
That differs from a source checkout, where `mdk create worker` links the packages in the checkout.

## Prerequisites

- [Node.js][node] >=24 (LTS)
- npm 11 [(< 12)][npm-version]
- Network access to the npm registry on the first run of each version

The first run downloads the CLI and the MDK runtime it bundles. Later runs of the same exact version reuse the npm cache.

## Run a command

Try `mdk status` to check your environment:

```bash
npx --yes @tetherto/mdk-cli@0.13 status
```

`@0.13` resolves to the newest published `0.13.x` release, the line these docs describe. `@latest` would follow every
new release instead, including ones these steps were not written for. `--yes` skips the install prompt that
`npx` shows before fetching a package it has not seen; npm assumes it when standard input is not a terminal.

Commands that write into a project, such as `mdk onboard`, `mdk create` and `mdk skill add`, run from the directory you are
working in; the rest take `--dir <path>` to point at a project elsewhere. Only `mdk --version` and `mdk version` are global.

## Choose the binary explicitly

When the binary name matters, for example in a script that calls `mdk` by name, use the package form:

```bash
npx --yes -p @tetherto/mdk-cli@0.13 mdk --version
```

## Use it in CI

Pin an exact version. A tag such as `@latest` or a caret range can resolve to a build already in the runner's cache, so two
runners can execute different builds from the same workflow line; an exact version forces one build everywhere. The repo's
own [link checker][linkinator-pin] is pinned for the same reason.

Replace `<version>` with the exact published CLI version your workflow uses:

```bash
npx --yes @tetherto/mdk-cli@<version> validate worker rig
npx --yes @tetherto/mdk-cli@<version> status
```

- Cache `~/.npm` between jobs so later runs skip the download
- Pass `--prefer-online` when a run must re-check the registry rather than trust the cache
- Run only non-interactive commands: `mdk validate`, `mdk status`, and `mdk run` against a committed `mdk.yaml`.
  Run `mdk onboard` interactively before committing the configuration.

## What still applies

`npx` changes how the CLI starts, not what it enforces. A fresh stack is set up in the same order as with an installed
`mdk`, each step from the project directory or with `--dir`:

```bash
npx --yes @tetherto/mdk-cli@0.13 onboard       # interactive: writes mdk.yaml
npx --yes @tetherto/mdk-cli@0.13 rbac init     # edits mdk.yaml in place: binds the CLI to admin, grants each app its permissions
npx --yes @tetherto/mdk-cli@0.13 run
```

Then, from a second terminal, [create the first operator][first-operator] the same way:
`npx --yes @tetherto/mdk-cli@0.13 user add <name> --admin`. The [site security blueprint][site-security] covers what
`spec.rbac` holds and how to go beyond the starter policy.

## Troubleshooting

### Missing project configuration

`mdk status` reports a missing `mdk.yaml`; it does not create one.

Expected output from `mdk status` when `mdk.yaml` is missing:

```text
MDK status  (no stack)

Environment
  Node             v24.x.x     ok
  Package manager  npm
  Spec             mdk.yaml    missing
    No mdk.yaml found in <directory>.
    Run `mdk onboard` to create one.
```

Running `mdk run` or `mdk rbac init` without `mdk.yaml` fails:

```text
error: No mdk.yaml found in <directory>.
Run `mdk onboard` to create one.
```

For an existing project, check that you are in its directory or pass `--dir <path>`. If you deleted `mdk.yaml`, restore it
from Git or a backup to recover the project's configuration.

For a new project, run onboarding from the project directory:

```bash
npx --yes @tetherto/mdk-cli@0.13 onboard
```

Onboarding interactively creates `mdk.yaml` and `package.json`. It creates a new configuration; it does not recover a deleted one.

### Kernel refuses to start because the policy binds nobody

Run `mdk rbac init` before starting a fresh stack. Without an initial policy binding, `mdk run` refuses to boot the Kernel.

Expected error:

```text
spec.rbac binds nobody, so the Kernel would boot with nobody able to administer it: `mdk rbac init` would be refused.
Run `mdk rbac init` first, then `mdk run`.
```

Initialize the policy, then start the stack from the project directory:

```bash
npx --yes @tetherto/mdk-cli@0.13 rbac init
npx --yes @tetherto/mdk-cli@0.13 run
```

### Onboarding exits without creating a project

`mdk onboard` needs an interactive terminal. Run it locally in a terminal, then commit the generated configuration for CI.

### Dashboard template cannot be fetched

`mdk create dashboard` fetches its template from GitHub at the tag matching the CLI version. Check that `git` is on your PATH
and that you can reach GitHub. A named dashboard lands in `apps/<name>`.

### npm offers an upgrade to npm 12

Stay on npm 11 to avoid [npm 12 restrictions on Git dependencies][npm-version]. The upgrade notice does not require action.

## Next steps

- [Install the CLI][cli-install]: put `mdk` on your PATH for daily use
- [Run a mining site end to end][try-the-demo]: see a stack running with mock hardware
- [Explore CLI commands and flags][cli-reference]: the full command surface

## Links

[cli-install]: install.md
<!-- docs@tether.io: cli-install → guides/cli/run-with-npm -->

[node]: https://nodejs.org/
<!-- docs@tether.io: external link — preserve URL -->

[npm-version]: ../../reference/environment.md#why-npm-stays-below-12
<!-- docs@tether.io: npm-version → reference/environment -->

[linkinator-pin]: ../../reference/maintainers/linters.md#nightly-and-pr-diff-link-verification--linkinator
<!-- docs@tether.io: no parity link -->

[site-security]: ../security/index.md
<!-- docs@tether.io: site-security → guides/security -->

[try-the-demo]: ../../tutorials/run-a-site.md
<!-- docs@tether.io: try-the-demo → tutorials/run-a-site -->

[cli-reference]: ../../reference/tooling/cli.md
<!-- docs@tether.io: cli-reference → reference/tooling/cli -->

[first-operator]: ../security/create-the-first-operator.md
<!-- docs@tether.io: first-operator → guides/security/create-the-first-operator -->
