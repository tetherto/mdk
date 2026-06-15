---
title: Get started
description: "Three rungs from a first run to a live dashboard demo — observe, interact, then run."
docs@tether_slug: tutorials/backend-stack/
---

> [!NOTE]
> If ORK, worker, manager, or thing are unfamiliar, read [`terminology.md`](../../concepts/terminology.md) first.

## Overview

Get started with MDK in three short tutorials that build on each other. Each rung adds one layer of capability: first you watch the stack run, then you drive it, then you run a browser demo on top.

| Rung | You'll | You'll end with | Mock hardware | Time |
|---|---|---|---|---|
| [1. Run the stack](run.md) | **Observe** — run one command and watch a stack come up | ORK plus one registered device, IDs printed | Antminer S19XP | `< 3 min` |
| [2. Control devices from the CLI](cli.md) | **Interact** — drive a running stack from a REPL | Live telemetry and commands over an IPC socket | Whatsminer M56S | `< 3 min` |
| [3. Run the dashboard demo](dashboard.md) | **Run** — launch a browser dashboard on the stack | A React dashboard with live charts at `:3030` | Whatsminer M56S | `< 15 min` after a one-time UI build |

**New to MDK? Start with [1. Run the stack](run.md).** Each rung links to the next, so you can climb straight through.

> [!NOTE]
> Rungs uses different mock hardware on purpose — Antminer on rung 1, Whatsminer on rungs 2 and 3. Notice, the MDK API stays identical: every rung calls the same `getOrk()`, `startWorker()`, and `registerThing()` shape. Only the worker class and the mock device change. That sameness is the point — one interface, any hardware.

Each rung is self-contained and repeats the clone-and-install step, so you can start at whichever one you need.
