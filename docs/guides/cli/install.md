---
title: Install the CLI
description: "[⏱️ ~3 min] Get `mdk` installed and verified from npm"
docs@tether_slug: guides/cli/run-with-npm
lastReviewedAt: "0.13.1"
---

## TL;DR

- Operate the stack from your terminal
- Install `mdk` on your PATH with `npm install -g @tetherto/mdk-cli@0.13`
- Confirm it with `mdk --version`

## Overview

`mdk` is MDK's command-line tool for standing up and operating a stack from your terminal. It scaffolds a stack
(`mdk create`), boots it (`mdk run`), and reports its health (`mdk status`), all driven by the `mdk.yaml` spec
`mdk onboard` writes for you.

## Prerequisites

- [Node.js][node] >=24 (LTS)
- npm 11 [(< 12)][npm-version]

## Install

Install the published CLI from npm. A source checkout is only needed to work on the CLI itself.

<Steps>

<Step>

### Put `mdk` on your PATH

> [!NOTE]
> If `mdk --version` already prints a version, skip to verifying your install.

#### A. Install from npm

```bash
npm install -g @tetherto/mdk-cli@0.13
```

`@0.13` installs the newest `0.13.x` release, the line these docs describe, so a later major or minor release can't change
the commands under you. Name an exact version, such as `@0.13.0`, to pin one build.

> [!TIP]
> `npx @tetherto/mdk-cli@0.13 <command>` [runs a single command without installing anything globally][run-with-npx], which
> suits CI and one-off scaffolding.

#### B. Install from a source checkout

Contributors who are changing the CLI's own source build it and link that build onto their PATH instead.

```bash
git clone https://github.com/tetherto/mdk.git
cd mdk
npm install && cd packages/cli && npm run build && npm link
```

The last line runs from the repository root, `mdk/`. `npm install` there installs every workspace, which the CLI's
sibling packages need, and the line can be run again from `mdk/` after a `git pull` or a tag checkout. When switching
tags after a build, run `npm run clean` in `packages/cli` first, since neither install nor build empties `dist/`.

To pin a tagged release, pick a tag from [mdk tags][mdk-tags] and check it out before installing, for example
`git checkout -b local/v0.12.1 v0.12.1`.

</Step>

<Step>

### Verify the install

```bash
mdk --version
```

</Step>

<Step>

### Run project commands from your project

Commands such as `mdk skill add` and `mdk onboard` write into your current directory, so run them from the app or UI
project you are working in. Only `mdk --version` is global.

</Step>

</Steps>

## Command groups

Commands grouped by purpose:

| Group            | Commands                                                                                                  |
| ---------------- | --------------------------------------------------------------------------------------------------------- |
| Set up           | `mdk onboard`                                                                                             |
| Build            | `mdk create worker\|app\|dashboard`, `mdk add app\|worker <source>`, `mdk validate app\|worker <name>`    |
| Run              | `mdk run [target]`, `mdk status`                                                                          |
| Auth             | `mdk rbac init\|apply\|show`, `mdk user`, `mdk serviceaccount`, `mdk login`, `mdk logout`, `mdk whoami`   |
| Agent enablement | `mdk skill add`                                                                                           |
| Meta             | `mdk version`                                                                                             |

The [CLI's command surface][cli-reference] documents the full flag reference.

## Update

```bash
npm install -g @tetherto/mdk-cli@0.13
```

This picks up the newest `0.13.x` patch. To move to a newer release line, install it by version, for example
`@tetherto/mdk-cli@0.14`, with the docs for that release.

### Update a source checkout

How a [source checkout](#b-install-from-a-source-checkout) updates depends on whether it tracks `main` or is pinned to a
tag. Run every command from the repository root, `mdk/`, and build only the CLI workspace: `npm run build` at the root
builds every workspace in the monorepo.

On `main`, pull the latest commits:

```bash
git pull
npm install && npm --workspace packages/cli run clean && npm --workspace packages/cli run build
```

On a pinned tag, such as a `local/v0.12.1` branch, `git pull` fails with `There is no tracking information for the current
branch`, since a branch created from a tag tracks no remote branch. Fetch the tags and check out the new one instead, for
example `v0.13.0`:

```bash
git fetch --tags
git checkout -b local/v0.13.0 v0.13.0
npm install && npm --workspace packages/cli run clean && npm --workspace packages/cli run build
```

The earlier `npm link` still points at `packages/cli`, so `mdk --version` reports the new version without linking again.

## Uninstall

```bash
npm rm -g @tetherto/mdk-cli
```

## Next steps

- Try the [demo][try-the-demo] to see a stack running end to end
- [Run a Worker][run-your-worker] in a stack with a dashboard and an agent, with no app code
- [Create the first operator][first-operator] once a stack runs, so the dashboard and every route have someone to sign in as
- [Build with your agent][agent-skills] so a coding agent knows MDK conventions

## Links

[node]: https://nodejs.org/
<!-- docs@tether.io: external link — preserve URL -->

[npm-version]: ../../reference/environment.md#why-npm-stays-below-12
<!-- docs@tether.io: npm-version → reference/environment -->

[mdk-tags]: https://github.com/tetherto/mdk/tags
<!-- docs@tether.io: external link — preserve URL -->

[agent-skills]: ../ui/agent-skills.md
<!-- docs@tether.io: agent-skills → guides/ui/agent-skills -->

[cli-reference]: ../../reference/tooling/cli.md
<!-- docs@tether.io: cli-reference → reference/tooling/cli -->

[first-operator]: ../security/create-the-first-operator.md
<!-- docs@tether.io: first-operator → guides/security/create-the-first-operator -->

[try-the-demo]: ../../tutorials/run-a-site.md
<!-- docs@tether.io: try-the-demo → tutorials/run-a-site -->

[run-with-npx]: run-with-npx.md
<!-- docs@tether.io: run-with-npx → guides/cli/run-with-npx -->

[run-your-worker]: run-your-worker.md
<!-- docs@tether.io: run-your-worker → guides/cli/run-your-worker -->
