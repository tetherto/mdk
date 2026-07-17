---
title: Get started
description: Three rungs from a first run to a live dashboard demo — observe, interact, then run
docs@tether_slug: tutorials/backend-stack/
---

> [!TIP]
> See the [whole stack demo at once][quickstart-full-stack] booting all the Worker families for a live site, mock hardware, 
> a Gateway API, and a React dashboard in one command.

## Overview

This page presents three short tutorials that build on each other. Each rung adds one layer of capability: first you watch the stack run, then 
you drive it, then you run a browser demo on top.

| Rung | You'll | You'll end with | Mock hardware | Time |
|---|---|---|---|---|
| [1. Run the stack](run.md) | **Observe** — run one command and watch a stack come up | Device list, telemetry, and commands printed | Whatsminer M56S | `< 3 min` |
| [2. Control devices from the CLI](cli.md) | **Interact** — drive a running stack from a REPL | Live telemetry and commands over HRPC via the kernel key file | Whatsminer M56S | `< 3 min` |
| [3. Run the dashboard demo](dashboard.md) | **Run** — launch a browser dashboard on the stack | A React dashboard with live charts at `:3030` | Whatsminer M56S | `< 15 min` after a one-time UI build |

**New to MDK? Start with [1. Run the stack](run.md).** Each rung links to the next, so you can climb straight through.

> [!NOTE]
> All three rungs use the same Whatsminer example to keep things simple. To see MDK working with different hardware, check out the 
> [full site example][quickstart-full-stack] which runs multiple Worker families (Antminers, Whatsminers, containers, power meters) simultaneously — 
> all using the same MDK API.

Each rung is self-contained and repeats the clone-and-install step, so you can start at whichever one you need.

## Next steps

- If Kernel, Worker, manager, or thing are unfamiliar, read [`terminology.md`][terminology]
- Build the [smallest version of the full MDK stack: **one Worker, one Gateway route, one static HTML page][quickstart-build-dash]
- Run the [full stack demo][quickstart-full-stack]

## Links

[terminology]: ../../reference/glossary.md
<!-- docs@tether.io: terminology → reference/glossary -->

[quickstart-full-stack]: ../quickstart/full-stack.md
<!-- docs@tether.io: quickstart → tutorials/quickstart/full-stack -->

[quickstart-build-dash]: ../quickstart/build-a-dashboard.md
<!-- docs@tether.io: quickstart → tutorials/quickstart/build-a-dashboard -->

