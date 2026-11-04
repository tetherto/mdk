---
title: Supported Workers
description: The Workers MDK can run today, for miners, containers, power meters, sensors and mining pools, partner-maintained and MDK-maintained, derived from each Worker's contract.
---

## TL;DR

Find device integrations and their owning repositories in the [Worker catalogue][catalogue-full].
Check each provider's documentation for model and firmware compatibility.

## Overview

MDK integrates miners, containers, power meters, sensors and mining pools through Workers. Each Worker declares what it supports in
its `mdk-contract.json`. For an MDK-maintained Worker, that contract is the single source of truth for coverage. For a
partner-maintained Worker, [`external-workers.json`][external-workers-manifest] decides whether it appears in the catalogue at all, and
its contract may not enumerate every supported model or firmware version. Where it doesn't, the partner's own documentation is
authoritative, not this page.

## Who maintains a Worker

A Worker is published either by the partner whose device or pool it integrates, or by MDK in this repository.

### Partner-maintained Workers

Device manufacturers and mining pools build and publish their own MDK Worker, maintained in their own repository rather than this one.
MDK fetches and schema-validates each partner's `mdk-contract.json` at generation time, so the catalogue reflects the current contract
without copying it into this repo. The partner's repository, not MDK, is the authority on what device, firmware or pool account
combinations it actually supports. The [generated catalogue][catalogue-full] lists each one with its repository link, and the
[run guide][run-miner-worker] shows how a partner-maintained miner Worker is hosted, and [the pool Worker notes][minerpool-workers] do
the same for a mining pool.

### MDK-maintained Workers

Everything else ships in this repo, with a bundled mock and unit and integration tests.

## Full catalogue

For brand, model list (where the contract enumerates one), and Worker type, see the [generated catalogue][catalogue-full], generated
from every in-repo `mdk-contract.json` plus the partner-maintained registry. Where a partner's contract doesn't enumerate models, the
catalogue says so explicitly rather than implying none are supported. Check that partner's own documentation instead.

A row marked `(v1 strictness gaps)` carries a contract with no `contractVersion` stamp, so the
[v1 requirements][contract-validation] come back as warnings rather than errors and the
contract passes validation in legacy mode. Strict mode reports those gaps as errors.

## Next steps

- [Terminology][terminology]: Kernel, Worker, manager, thing, mock
- [Deployment topologies][deployment-topologies]: decide how to run the Worker service
- [Run a miner Worker][run-miner-worker]: host a partner-maintained or MDK-maintained Worker

## Links

[catalogue-full]: ../../backend/workers/docs/supported-workers.md
<!-- docs@tether.io: catalogue-full → https://github.com/tetherto/mdk/blob/main/backend/workers/docs/supported-workers.md -->

[external-workers-manifest]: ../../backend/workers/external-workers.json
<!-- docs@tether.io: external-workers-manifest → https://github.com/tetherto/mdk/blob/main/backend/workers/external-workers.json -->

[terminology]: ../reference/glossary.md
<!-- docs@tether.io: terminology → reference/glossary -->

[deployment-topologies]: ../concepts/deployment-topologies.md
<!-- docs@tether.io: deployment-topologies → https://github.com/tetherto/mdk/blob/main/docs/concepts/deployment-topologies.md -->

[run-miner-worker]: ../guides/miners/index.md
<!-- docs@tether.io: run-miner-worker → guides/miners -->

[contract-validation]: ../../backend/core/mdk-worker/README.md#contract-validation
<!-- docs@tether.io: contract-validation → https://github.com/tetherto/mdk/blob/main/backend/core/mdk-worker/README.md#contract-validation -->

[minerpool-workers]: ../../backend/workers/minerpools/README.md
<!-- docs@tether.io: minerpool-workers → https://github.com/tetherto/mdk/blob/main/backend/workers/minerpools/README.md -->
