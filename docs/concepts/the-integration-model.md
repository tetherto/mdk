---
title: The integration model
description: What MDK can be extended with, and by which of its two extension points
docs@tether_slug: concepts/the-integration-model
---

## MDK integration

Kernel is extended by building Worker and Gateway capabilities:

| Aspect                      | Worker Plugin | App |
| --------------------------- | ------------- | --- |
| Extends                     | The Worker tier | The Gateway tier |
| Declares itself with        | `mdk-contract.json` (the Worker contract) | `mdk-app.yaml`, plus `mdk-plugin.json` for the route table |
| That declaration is read by | Kernel today (routing, validation); no other reader exists in this repo today | The app runtime (routes, config) and the Gateway (route table only) |
| Job                         | Speak one device family's native protocol; expose it as telemetry + commands | Add an HTTP route: aggregate, authenticate, or otherwise sit between a caller and `@tetherto/mdk-client` |
| Shipped as                  | A package a stack declares under `spec.workers` | A package a stack declares under `spec.apps`, installable with `mdk add app` |

> [!NOTE]
> ["Worker Plugin"][glossary] refers to the **Worker Plugin** package on disk
> ([`mdk-contract.json`][contract-schema] plus its handler files.

## `mdk-plugin.json` gets the same treatment, for an app's routes

An app's route table declares its routes (`id`, `handler`, `http.method`/`http.path`, response schema,
constraints, examples, errors, `safety`). The app runtime reads it to mount routes and validate the
manifest shape at load time, and the Gateway reads it to know where to forward; nothing about it is hand-wired into
the Gateway's own code path per app.

## Workers are not only hardware

A Worker Plugin wraps whatever answers to "one device, one connection, one set of telemetry/commands"; that's
just as often a non-hardware integration:

- A **pool API** Worker: telemetry is your hashrate/earnings from the pool's own API, "commands" might be switching
  workers between pools; no physical device involved at all.
- An **accounting sync** Worker: telemetry is a ledger balance or a sync status pulled from a third-party service,
  with no ASIC anywhere in the picture.

Both get the exact same treatment from Kernel as a physical miner: identity, capabilities, telemetry pull, command
dispatch. Kernel does not know or care that there is no hardware behind either one.

## What this buys you

Write the integration once (one Worker Plugin per device family, one app per product surface you ship) and
every consumer built against the standard round trip works with it for free: the same dashboard code, the same
agent tooling, the same Gateway auth model, regardless of which device family or which route it's actually talking
to underneath.

## Next steps

- [Build a Worker Plugin][build-a-worker] for a new device family
- Understand the [app authoring flow][apps]: build it, publish it, install it
- Understand [the storage model][storage-model]: what a Worker Plugin decides to persist
- Understand [architecture][architecture]: where both extension points sit in the round trip

## Links

[architecture]: architecture.md
<!-- docs@tether.io: architecture → concepts/architecture -->

[glossary]: ../reference/glossary.md
<!-- docs@tether.io: glossary → reference/glossary -->

[contract-schema]: ../../backend/core/mdk-worker/mdk-contract.schema.json
<!-- docs@tether.io: contract-schema → https://github.com/tetherto/mdk/blob/main/backend/core/mdk-worker/mdk-contract.schema.json -->

[storage-model]: the-storage-model.md
<!-- docs@tether.io: storage-model → concepts/the-storage-model -->

[build-a-worker]: ../guides/workers/build-a-worker.md
<!-- docs@tether.io: build-a-worker → guides/workers/build-a-worker -->

[apps]: ../guides/gateway/apps.md
<!-- docs@tether.io: apps → guides/gateway/apps -->
