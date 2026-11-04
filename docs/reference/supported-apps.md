---
title: Supported apps
description: The apps MDK ships, where each one documents its routes, and how to get them
docs@tether_slug: reference/supported-apps
---

## Overview

A Gateway serves exactly the apps your stack declares in `spec.apps[]`, and nothing else. Nothing here
auto-registers: an app contributes its routes only when a stack names it. Each app MDK ships lives in its own repository,
is offered through [`mdk onboard`][mdk-onboard], and is declared by its package name (`@tetherto/mdk-app-<name>`).

The Gateway serves an app's routes under `/apps/<name>` unless the app's `spec.apps` entry sets `mount`; `mount: /` serves them
at the Gateway root.

## Availability

Install an app from its repository with `mdk add app github:tetherto/<repository>`, which writes its `spec.apps` entry, `mount` included. `mdk onboard`
installs them from the same repositories. The browser half of the agent app, the [`@tetherto/mdk-ui-agent`][ui-agent-readme] panel, is on npm and renders
without the app.

## Route tables

| App     | Package                   | Repository                       | Availability                  | Mount                                                            |
| ------- | ------------------------- | -------------------------------- | ----------------------------- | ---------------------------------------------------------------- |
| `agent` | `@tetherto/mdk-app-agent` | [`mdk-app-agent`][mdk-app-agent] | Public repository, not on npm | `/`, because its UI calls `/agent/sessions…` at the Gateway root |
| `demo`  | `@tetherto/mdk-app-demo`  | [`mdk-app-demo`][mdk-app-demo]   | Public repository, not on npm | The default, `/apps/demo`                                        |

Each repository's README carries the app's route table, configuration, and errors.

## Next steps

- [Declare an app in your stack][apps-guide]: the manifests, controllers, and how a stack runs them
- [Render the agent chat][ui-agent-readme]: the npm package that pairs with the `agent` app, and what it shows without one

## Links

[apps-guide]: ../guides/gateway/apps.md
<!-- docs@tether.io: apps-guide → guides/gateway/apps -->

[mdk-onboard]: ../guides/cli/install.md#command-groups
<!-- docs@tether.io: mdk-onboard → guides/cli/run-with-npm#command-groups -->

[mdk-app-agent]: https://github.com/tetherto/mdk-app-agent
<!-- docs@tether.io: mdk-app-agent → https://github.com/tetherto/mdk-app-agent -->

[mdk-app-demo]: https://github.com/tetherto/mdk-app-demo
<!-- docs@tether.io: mdk-app-demo → https://github.com/tetherto/mdk-app-demo -->

[ui-agent-readme]: ../../ui/packages/ui-agent/README.md
<!-- docs@tether.io: ui-agent-readme → https://github.com/tetherto/mdk/blob/main/ui/packages/ui-agent/README.md -->
