---
title: Supported apps
description: The apps MDK ships and where each one documents its routes
docs@tether_slug: reference/supported-apps
---

## Overview

A Gateway serves exactly the apps your stack declares in `spec.apps[]`, and nothing else. Nothing here
auto-registers: an app contributes its routes only when a stack names it. Each app MDK ships lives in its own repository,
is offered through [`mdk onboard`][mdk-onboard], and is declared by its package name (`@tetherto/mdk-app-<name>`).

The Gateway serves an app's routes under `/apps/<name>` unless the app's `spec.apps` entry sets `mount`; `mount: /` serves them
at the Gateway root.

## Route tables

| App     | Package                   | Repository                      | Mount                                                            |
| ------- | ------------------------- | ------------------------------- | ---------------------------------------------------------------- |
| `agent` | `@tetherto/mdk-app-agent` | [`mdk-app-agent`][mdk-app-agent] | `/`, because its UI calls `/agent/sessions…` at the Gateway root |
| `demo`  | `@tetherto/mdk-app-demo`  | [`mdk-app-demo`][mdk-app-demo]   | The default, `/apps/demo`                                        |

Each repository's README carries the app's route table, configuration, and errors.

## Next steps

- [Declare an app in your stack][gateway-plugins-guide]: the manifests, controllers, and how a stack runs them

## Links

[gateway-plugins-guide]: ../guides/gateway/apps.md
<!-- docs@tether.io: gateway-plugins-guide → guides/gateway/apps -->

[mdk-onboard]: ../guides/cli/install.md#command-groups
<!-- docs@tether.io: mdk-onboard → guides/cli/install#command-groups -->

[mdk-app-agent]: https://github.com/tetherto/mdk-app-agent
<!-- docs@tether.io: mdk-app-agent → https://github.com/tetherto/mdk-app-agent -->

[mdk-app-demo]: https://github.com/tetherto/mdk-app-demo
<!-- docs@tether.io: mdk-app-demo → https://github.com/tetherto/mdk-app-demo -->
