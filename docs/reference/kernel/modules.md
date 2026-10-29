---
title: Kernel modules
description: An index of Kernel's internal modules
docs@tether_slug: reference/kernel/modules
---

## Overview

[Kernel][kernel-package]'s coordination splits across single-purpose modules. Each owns its own state, persistence boundary, and scaling
characteristics. It communicates with the others only through its declared interface.

> [!NOTE]
> The [Kernel's Architecture overview][kernel-architecture] provides the canonical spec for each module's
> interfaces, state machine, and recovery behavior.

## Modules

- [`WorkerRegistry`][worker-registry]: holds two flat indexes, `deviceId` to its owning Worker and `workerId` to that Worker's record, and drives each Worker through its registration lifecycle
- [`CommandDispatcher`][command-dispatcher]: validates an incoming command, resolves the target device or devices, and hands off to the Command State Machine
- [`CommandStateMachine`][command-state-machine]: tracks every command's execution lifecycle in a write-ahead log
- [`CommandLog`][command-log]: records every command request, accepted or refused, with its caller, target, params and outcome
- [`TelemetryCollector`][telemetry-collector]: a proxy that routes telemetry queries to the Worker that owns the data, persisting none of it
- [`Scheduler`][scheduler-module]: the system metronome that fires the recurring telemetry, health, and state jobs
- [`HealthMonitor`][health-monitor]: pings every ready Worker process over HRPC on a cadence and marks dead ones unroutable; it never contacts a device
- [`ActionManager`][action-manager]: handles the write action approval lifecycle at the Kernel layer
- [`ActionCaller`][action-caller]: resolves an approved action into the per-Worker write calls that carry it out

## Next steps

- Review the [Protocol messages][protocol-messages]: the actions these modules route and execute
- See the [Kernel architecture][kernel-concept]: the architectural narrative behind this module split
- Understand [approval-gated writes][control-plane-writes]: the cross-layer flow [`ActionManager`][action-manager] and [`ActionCaller`][action-caller] implement

## Links

[kernel-package]: ../../../backend/core/kernel/index.js
<!-- docs@tether.io: kernel-package → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/index.js -->

[kernel-concept]: ../../../backend/core/kernel/README.md
<!-- docs@tether.io: kernel-concept → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md -->

[kernel-architecture]: ../../../backend/core/kernel/README.md#architecture
<!-- docs@tether.io: kernel-architecture → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md#architecture -->

[worker-registry]: ../../../backend/core/kernel/README.md#workerregistry
<!-- docs@tether.io: worker-registry → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md#workerregistry -->

[command-dispatcher]: ../../../backend/core/kernel/README.md#commanddispatcher
<!-- docs@tether.io: command-dispatcher → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md#commanddispatcher -->

[command-state-machine]: ../../../backend/core/kernel/README.md#commandstatemachine
<!-- docs@tether.io: command-state-machine → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md#commandstatemachine -->

[command-log]: ../../../backend/core/kernel/README.md#write-command-log
<!-- docs@tether.io: command-log → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md#write-command-log -->

[telemetry-collector]: ../../../backend/core/kernel/README.md#telemetrycollector
<!-- docs@tether.io: telemetry-collector → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md#telemetrycollector -->

[scheduler-module]: ../../../backend/core/kernel/README.md#scheduler
<!-- docs@tether.io: scheduler-module → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md#scheduler -->

[health-monitor]: ../../../backend/core/kernel/README.md#healthmonitor
<!-- docs@tether.io: health-monitor → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md#healthmonitor -->

[action-manager]: ../../../backend/core/kernel/README.md#actionmanager
<!-- docs@tether.io: action-manager → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md#actionmanager -->

[action-caller]: ../../../backend/core/kernel/README.md#actioncaller
<!-- docs@tether.io: action-caller → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md#actioncaller -->

[protocol-messages]: ../protocol/messages.md
<!-- docs@tether.io: protocol-messages → reference/protocol/messages -->

[control-plane-writes]: ../../concepts/control-plane.md#approval-gated-writes
<!-- docs@tether.io: control-plane-writes → https://github.com/tetherto/mdk/blob/main/docs/concepts/control-plane.md#approval-gated-writes -->
