---
title: Packages
description: Every package in the MDK monorepo, grouped into Core, Extensions, UI, and Tools, with what each is for and how to get it.
docs@tether_slug: reference/packages
---

<!-- GENERATED FILE, DO NOT EDIT. Run `npm run generate:package-catalog` from the repo root. Sources: each package's package.json and, for integrations, its mdk-contract.json. -->

## Overview

This page lists every package in the MDK monorepo. Core is the Kernel, the Gateway, and the runtimes around them. Extensions are the Workers and
apps that connect MDK to hardware, pools, and agents. UI is the browser toolkit, and Tools are what you develop with.

Availability says how you get a package:

- `workspace`: private to the monorepo, used from a clone
- `publishable`: not marked private. A release publishes it to npm once it also sets `publishConfig.access` to `public` and its `repository`

## Core

| Package | Purpose | Availability |
| --- | --- | --- |
| [`@tetherto/mdk-agent`][mdk-agent] | MDK operator agent — headless loop over a local (QVAC) model, consuming MDK tools via MCP | `workspace` |
| [`@tetherto/mdk-app-runtime`][mdk-app-runtime] | MDK app runtime: runs one app's controllers in its own process and serves them over HRPC | `publishable` |
| [`@tetherto/mdk-client`][mdk-client] | MDK protocol client — HRPC (RPC listener) transport for Kernel | `publishable` |
| [`@tetherto/mdk-core`][mdk-core] | MDK bootstrap utilities and worker-infra services — kernel/gateway lifecycle plus injectable log/comment/alert/stats/settings/provisioning services for runtime-hosted workers | `publishable` |
| [`@tetherto/mdk-gateway`][mdk-gateway] | MDK Gateway | `publishable` |
| [`@tetherto/mdk-identity`][mdk-identity] | MDK identity: the token issuer (users, service accounts, rotating refresh tokens) and JWT verification for the Gateway, MCP server and Kernel | `publishable` |
| [`@tetherto/mdk-kernel`][mdk-kernel] | MDK Kernel - Orchestration Kernel | `publishable` |
| [`@tetherto/mdk-mcp`][mdk-mcp] | MDK MCP Server | `publishable` |
| [`@tetherto/mdk-rbac`][mdk-rbac] | MDK RBAC policy library — validates spec.rbac from mdk.yaml and evaluates callers at the Gateway, MCP server and Kernel | `publishable` |
| [`@tetherto/mdk-worker`][mdk-worker] | MDK Worker Runtime — hosts a Worker Plugin's devices behind one HRPC channel to the Kernel | `publishable` |

## Extensions

### Miners

| Name | Package | Purpose | Models | Availability |
| --- | --- | --- | --- | --- |
| Avalon | [`@tetherto/mdk-worker-avalon`][mdk-worker-avalon] | Controls Canaan Avalon Bitcoin miners over the CGMiner ASCII API | A1346 | `workspace` |

### Containers

| Name | Package | Purpose | Models | Availability |
| --- | --- | --- | --- | --- |
| Antspace | [`@tetherto/mdk-worker-antspace`][mdk-worker-antspace] | Controls Antspace container cooling systems | HK3, IMM | `workspace` |
| Bitdeer | [`@tetherto/mdk-worker-bitdeer`][mdk-worker-bitdeer] | Controls Bitdeer D40 immersion containers | D40-A1346, D40-M30, D40-M56, D40-S19XP | `workspace` |

### Power meters

| Name | Package | Purpose | Models | Availability |
| --- | --- | --- | --- | --- |
| ABB | [`@tetherto/mdk-worker-abb`][mdk-worker-abb] | Reads ABB power meters via Modbus TCP | B23, B24, M1M20, M4M20, REU615 | `workspace` |
| SATEC | [`@tetherto/mdk-worker-satec`][mdk-worker-satec] | Reads SATEC PM180 power meters via Modbus TCP | PM180 | `workspace` |
| Schneider Electric | [`@tetherto/mdk-worker-schneider`][mdk-worker-schneider] | Reads Schneider Electric power meters via Modbus TCP | P3U30, PM5340 | `workspace` |

### Sensors

| Name | Package | Purpose | Models | Availability |
| --- | --- | --- | --- | --- |
| Seneca | [`@tetherto/mdk-worker-seneca`][mdk-worker-seneca] | Reads Seneca Z-4RTD-2 temperature sensors via Modbus TCP | Z-4RTD-2 | `workspace` |

### Mining pools

| Name | Package | Purpose | Models | Availability |
| --- | --- | --- | --- | --- |
| F2Pool | [`@tetherto/mdk-worker-f2pool`][mdk-worker-f2pool] | Reports F2Pool mining pool account data: hashrate, workers, balances and revenue | F2POOL-BTC | `workspace` |

### Plugins and tooling

| Package | Purpose | Availability |
| --- | --- | --- |
| [`@tetherto/mdk-worker-mock`][mdk-worker-mock] | Generic mock framework for MDK device workers (BaseMock + transport adapters) | `workspace` |

## UI

| Package | Purpose | Availability |
| --- | --- | --- |
| [`@tetherto/mdk-react-adapter`][mdk-react-adapter] | React framework adapter for @tetherto/mdk-ui-foundation. Binds Zustand vanilla stores and TanStack QueryClient to React-native hooks. No Redux | `publishable` |
| [`@tetherto/mdk-react-devkit`][mdk-react-devkit] | MDK Devkit (React) — generic UI primitives (src/primitives) plus mining-domain components, hooks, and state bindings (src/domain) | `publishable` |
| [`@tetherto/mdk-ui-agent`][mdk-ui-agent] | Injectable operator Co-pilot chat UI for the MDK agent app. Streams the six-event agent contract over SSE and renders it as a docked panel or a full-page route | `publishable` |
| [`@tetherto/mdk-ui-foundation`][mdk-ui-foundation] | Framework-agnostic headless foundation for the MDK Devkit. Currently exposes Zustand vanilla stores and a TanStack QueryClient factory. No React | `publishable` |

## Tools

| Package | Purpose | Availability |
| --- | --- | --- |
| [`@tetherto/mdk-cli`][mdk-cli] | MDK command-line tool: onboard, scaffold, run and inspect an MDK stack | `publishable` |
| [`@tetherto/mdk-skill`][mdk-skill] | MDK Developer Skill Suite — Agent Skills (SKILL.md) bundle assembled from the MDK monorepo's real artifacts and versioned to track the MDK release line. Copy-only assembler: each library owns its artifacts, this package curates them into dist/skills/ and installs them flat into .cursor/skills/ or .claude/skills/ | `publishable` |

## Next steps

- Check [which models each Worker supports][supported-workers]
- Learn how to [connect your own hardware][build-a-worker] with a new Worker

## Links

[supported-workers]: supported-workers.md
<!-- docs@tether.io: supported-workers → reference/supported-workers -->

[build-a-worker]: ../guides/workers/build-a-worker.md
<!-- docs@tether.io: build-a-worker → guides/workers/build-a-worker -->

[mdk-agent]: ../../backend/core/agent/README.md
<!-- docs@tether.io: mdk-agent → https://github.com/tetherto/mdk/blob/main/backend/core/agent/README.md -->

[mdk-app-runtime]: ../../backend/core/app-runtime/README.md
<!-- docs@tether.io: mdk-app-runtime → https://github.com/tetherto/mdk/blob/main/backend/core/app-runtime/README.md -->

[mdk-client]: ../../backend/core/client/README.md
<!-- docs@tether.io: mdk-client → https://github.com/tetherto/mdk/blob/main/backend/core/client/README.md -->

[mdk-core]: ../../backend/core/mdk/README.md
<!-- docs@tether.io: mdk-core → https://github.com/tetherto/mdk/blob/main/backend/core/mdk/README.md -->

[mdk-gateway]: ../../backend/core/gateway/README.md
<!-- docs@tether.io: mdk-gateway → https://github.com/tetherto/mdk/blob/main/backend/core/gateway/README.md -->

[mdk-identity]: ../../backend/core/identity/README.md
<!-- docs@tether.io: mdk-identity → https://github.com/tetherto/mdk/blob/main/backend/core/identity/README.md -->

[mdk-kernel]: ../../backend/core/kernel/README.md
<!-- docs@tether.io: mdk-kernel → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md -->

[mdk-mcp]: ../../backend/core/mcp/README.md
<!-- docs@tether.io: mdk-mcp → https://github.com/tetherto/mdk/blob/main/backend/core/mcp/README.md -->

[mdk-rbac]: ../../backend/core/rbac/README.md
<!-- docs@tether.io: mdk-rbac → https://github.com/tetherto/mdk/blob/main/backend/core/rbac/README.md -->

[mdk-worker]: ../../backend/core/mdk-worker/README.md
<!-- docs@tether.io: mdk-worker → https://github.com/tetherto/mdk/blob/main/backend/core/mdk-worker/README.md -->

[mdk-worker-avalon]: ../../backend/workers/miners/avalon/README.md
<!-- docs@tether.io: mdk-worker-avalon → https://github.com/tetherto/mdk/blob/main/backend/workers/miners/avalon/README.md -->

[mdk-worker-antspace]: ../../backend/workers/containers/antspace/README.md
<!-- docs@tether.io: mdk-worker-antspace → https://github.com/tetherto/mdk/blob/main/backend/workers/containers/antspace/README.md -->

[mdk-worker-bitdeer]: ../../backend/workers/containers/bitdeer/README.md
<!-- docs@tether.io: mdk-worker-bitdeer → https://github.com/tetherto/mdk/blob/main/backend/workers/containers/bitdeer/README.md -->

[mdk-worker-abb]: ../../backend/workers/power-meter/abb/README.md
<!-- docs@tether.io: mdk-worker-abb → https://github.com/tetherto/mdk/blob/main/backend/workers/power-meter/abb/README.md -->

[mdk-worker-satec]: ../../backend/workers/power-meter/satec/README.md
<!-- docs@tether.io: mdk-worker-satec → https://github.com/tetherto/mdk/blob/main/backend/workers/power-meter/satec/README.md -->

[mdk-worker-schneider]: ../../backend/workers/power-meter/schneider/README.md
<!-- docs@tether.io: mdk-worker-schneider → https://github.com/tetherto/mdk/blob/main/backend/workers/power-meter/schneider/README.md -->

[mdk-worker-seneca]: ../../backend/workers/temperature/seneca/README.md
<!-- docs@tether.io: mdk-worker-seneca → https://github.com/tetherto/mdk/blob/main/backend/workers/temperature/seneca/README.md -->

[mdk-worker-f2pool]: ../../backend/workers/minerpools/f2pool/README.md
<!-- docs@tether.io: mdk-worker-f2pool → https://github.com/tetherto/mdk/blob/main/backend/workers/minerpools/f2pool/README.md -->

[mdk-worker-mock]: ../../backend/workers/mock/README.md
<!-- docs@tether.io: mdk-worker-mock → https://github.com/tetherto/mdk/blob/main/backend/workers/mock/README.md -->

[mdk-react-adapter]: ../../ui/packages/react-adapter/README.md
<!-- docs@tether.io: mdk-react-adapter → https://github.com/tetherto/mdk/blob/main/ui/packages/react-adapter/README.md -->

[mdk-react-devkit]: ../../ui/packages/react-devkit/README.md
<!-- docs@tether.io: mdk-react-devkit → https://github.com/tetherto/mdk/blob/main/ui/packages/react-devkit/README.md -->

[mdk-ui-agent]: ../../ui/packages/ui-agent/README.md
<!-- docs@tether.io: mdk-ui-agent → https://github.com/tetherto/mdk/blob/main/ui/packages/ui-agent/README.md -->

[mdk-ui-foundation]: ../../ui/packages/ui-foundation/README.md
<!-- docs@tether.io: mdk-ui-foundation → https://github.com/tetherto/mdk/blob/main/ui/packages/ui-foundation/README.md -->

[mdk-cli]: ../../packages/cli/README.md
<!-- docs@tether.io: mdk-cli → https://github.com/tetherto/mdk/blob/main/packages/cli/README.md -->

[mdk-skill]: ../../packages/mdk-skill/README.md
<!-- docs@tether.io: mdk-skill → https://github.com/tetherto/mdk/blob/main/packages/mdk-skill/README.md -->
