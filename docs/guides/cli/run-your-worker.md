---
title: Run your Worker with the CLI
description: "[⏱️ ~10 min] From a tested Worker package to a running stack with a dashboard and an agent, with no app code"
docs@tether_slug: guides/cli/run-your-worker
lastReviewedAt: "0.13.1"
---

## TL;DR

- Declare your Worker package:
  - In `mdk.yaml`, by path for a checkout on disk, or
  - With `mdk add worker` for npm and GitHub
- `mdk rbac init` once, then `mdk run` boots the Kernel, your Worker, its mock devices, every app and the Gateway; the first
  operator is created in a second terminal
- `mdk create app` gives the stack a summary over your Worker, `mdk run dashboard` shows it, `mdk run mcp` hands it to an agent

## Overview

This page walks from a Worker package to the operator experience:

- The device reporting through the Kernel
- A page in the UI shell
- An agent answering questions about it over MCP

It serves two personas: a Worker provider bringing the [package they tested][test-a-worker] from a checkout on disk, and an operator installing a Worker published to npm or GitHub.

Everything runs from one project directory that `mdk onboard` writes, and the only code you add is what `mdk create app` scaffolds.
The [`mdk` CLI][cli-install] hosts the Worker plugin on `WorkerRuntimeV2` for you, so the host module from the testing guide
is not needed here.

## Prerequisites

- The [`mdk` CLI installed][cli-install]
- A Worker package: one you built that passes `mdk validate worker --path <dir> --smoke` with its bundled mock, or a
  published one from npm or GitHub
- [Outbound UDP to the HyperDHT bootstrap nodes][network-requirements], unless the project runs a [private DHT][private-dht]

<Steps>

<Step>

### Create the project

Run onboarding from an empty directory. It asks a few questions with defaults, then writes `mdk.yaml`, `package.json`,
`.gitignore` and a project `README.md`:

```bash
mkdir my-site && cd my-site
mdk onboard
```

Answer yes to the UI dashboard prompt so the shell lands in `apps/dashboard`. Skip the Worker catalogue prompt when
your package is not listed in it; the next step declares it by hand.

</Step>

<Step>

### Declare your Worker

You have two options.

#### A. From a checkout on disk

Reference the package by path under `spec.workers` and describe its seed devices. `mdk add worker` refuses a path, so
this is the one place a local package is wired in:

```yaml
spec:
  workers:
    - name: my-miner
      package: ../my-miner-worker        # relative to the project directory
      config:
        mock: true                       # start <package>/mock/server.js per device
        devices:
          - id: miner-0
            opts: { host: 127.0.0.1, port: 18080 }
```

`config.devices[].opts` is whatever your plugin reads per device, so copy the shape your `smoke.config.js` returns as
`config`. With `mock: true` the CLI starts one simulator per device and the Worker talks to it instead of hardware.

#### B. From npm or GitHub

Install a published package, or a repository, and let the CLI write the entry:

```bash
mdk add worker @your-org/mdk-worker-my-miner
mdk add worker github:your-org/my-miner-worker#v0.1.0 --name my-miner
```

`mdk add worker` runs `npm install --save-exact`, checks the package with the same rules as `mdk validate`, and only
then adds it under `spec.workers` in `mdk.yaml`. The entry's `name` is the package name with its `mdk-worker-` prefix
stripped, so the npm form lands as `my-miner` by itself and the GitHub form gets `--name` to match. A package without
a bundled mock is added without `mock: true`, so fill in `config.devices[].opts` with the address of your hardware.

Either way, check the declared entry resolves and passes the package rules:

```bash
mdk validate worker my-miner
```

</Step>

<Step>

### Give the stack a summary over the Worker

The UI shell ships only a static Home page; data arrives through apps. The app `mdk create app` scaffolds already
lists every Worker with its device count on a summary route, builds a starter UI with a Home panel and an Overview page,
and adds itself to `mdk.yaml` with the Kernel access it needs granted in `spec.rbac`:

```bash
mdk create app site
```

</Step>

<Step>

### Start the stack

A fresh stack needs an initial policy before the Kernel boots, so initialize it once, then run everything together:

```bash
mdk rbac init
mdk run
```

`mdk run` keeps the terminal in the foreground. In a second terminal, confirm the Worker is `READY` with its device
count:

```bash
mdk status
```

> [!TIP]
> `mdk run worker my-miner` starts only the Worker and its mocks, which suits iterating on the plugin while the rest
> of the stack stays up in other terminals.

</Step>

<Step>

### Create the first operator

The dashboard signs a user in, and users live in the Kernel's identity store, so this needs the stack from the previous
step running.
In a second terminal, from the project directory, create the operator and bind it to `admin`:

```bash
mdk user add ops@example.com --admin   # prompts for a password, twice
```

[Creating the first operator][first-operator] covers what `--admin` writes, signing in over HTTP or with `mdk login`, and
the failures to expect. The [users and service accounts][cli-users] commands cover everything past that first operator,
such as roles bound by group.

</Step>

<Step>

### Open the dashboard

In another terminal, start the shell's dev server. It reads `spec.apps` from `mdk.yaml` and loads each app's built UI,
so the `site` app's panel appears on Home and its page under `/app/site/` once you sign in as the operator you created:

```bash
mdk run dashboard
```

Edit `apps/site/ui-src/` and rebuild with `npm run build:ui` to show the telemetry channels your contract declares.

</Step>

<Step>

### (Optional) Hand the stack to an agent

`mdk run mcp` turns each app's routes into MCP tools, so the `site` summary becomes a tool an agent can call. It needs
the Kernel reachable, so run it after `mdk run`:

```bash
mdk run mcp
```

The server listens on `spec.mcp.port`, or the Gateway port plus 100 when unset. Routes that are not declared read-only
stay hidden unless you pass `--allow-write`. The [operator agent guides][agent-guides] cover connecting a client.

</Step>

</Steps>

## Troubleshooting

### Kernel refuses to start because the policy binds nobody

Run `mdk rbac init` before the first `mdk run`. Without a policy binding, the Kernel would boot with nobody able to
administer it, so the CLI refuses to start it.

### Worker is present but never `READY`

The same checks as in [the testing guide][test-a-worker-troubleshooting] apply. `mdk status` shows each Worker's state,
health and device count, and `mdk run worker <name>` isolates its boot log.

### Dashboard shows no panel for the app

`mdk run dashboard` reads `spec.apps` at start, so restart it after `mdk create app` or `mdk add app`. A starter UI
that failed to build at scaffold time is rebuilt with `npm run build:ui` inside the app directory.

## Next steps

- [Build a minimal dashboard][minimal-dashboard]: write the app route and page by hand when the starter UI is not enough
- [Run the Starter site example][mvp-site]: see a supervised, multi-Worker fleet
- [Connect the operator agent][agent-guides]: query and command Workers over MCP
- [Run the CLI with npx][run-with-npx]: run `mdk` commands with nothing installed, and see which of these steps still apply in CI

## Links

[cli-install]: install.md
<!-- docs@tether.io: cli-install → guides/cli/run-with-npm -->

[run-with-npx]: run-with-npx.md
<!-- docs@tether.io: run-with-npx → guides/cli/run-with-npx -->

[test-a-worker]: ../workers/test-a-worker.md
<!-- docs@tether.io: test-a-worker → guides/workers/test-a-worker -->

[test-a-worker-troubleshooting]: ../workers/test-a-worker.md#startup-and-discovery
<!-- docs@tether.io: test-a-worker-troubleshooting → guides/workers/test-a-worker -->

[network-requirements]: ../../reference/environment.md#requirements
<!-- docs@tether.io: network-requirements → reference/environment#requirements -->

[private-dht]: ../deployment/private-dht.md
<!-- docs@tether.io: private-dht → guides/deployment/private-dht -->

[first-operator]: ../security/create-the-first-operator.md
<!-- docs@tether.io: first-operator → guides/security/create-the-first-operator -->

[cli-users]: ../../reference/tooling/cli.md#auth
<!-- docs@tether.io: cli-users → reference/tooling/cli#auth -->

[agent-guides]: ../agent/index.md
<!-- docs@tether.io: agent-guides → guides/agent -->

[minimal-dashboard]: ../../tutorials/build-a-dashboard.md
<!-- docs@tether.io: minimal-dashboard → tutorials/build-a-dashboard -->

[mvp-site]: ../../../examples/mvp-site/README.md
<!-- docs@tether.io: mvp-site → https://github.com/tetherto/mdk/blob/main/examples/mvp-site/README.md -->
