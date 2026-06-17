# @tetherto/mdk-ui-core

Framework-agnostic headless core for the MDK Devkit.

## What's currently here

Only the primitives needed by code currently in this repo:

- **Zustand vanilla stores** currently in scope: `authStore`, `devicesStore`, `notificationStore`, `timezoneStore`, `actionsStore`
- **TanStack Query Core** `QueryClient` factory with environment-aware base URL resolution (HLD §5)

This package contains **no React imports**. It is consumed by framework adapters (`@tetherto/mdk-react-adapter`, future `@tetherto/mdk-vue-adapter`, etc.) which bind these primitives to the host framework.

## What's not here yet

Throttled telemetry subscriptions (`SubscriptionManager`), stale detection, and history ring buffers are not yet present. They will be added alongside the consuming code that requires them.

## Subpath exports

| Subpath   | Purpose                                          |
| --------- | ------------------------------------------------ |
| `.`       | Top-level barrel                                 |
| `./store` | Zustand vanilla stores                           |
| `./query` | TanStack QueryClient + query/mutation factories  |
| `./types` | Shared type contracts                            |
| `./stores.json` | Machine-readable store manifest (generated at build time) |

## Build strategy

This package is **fully pre-built** (TypeScript → ESM JS + declarations under `dist/`). Consuming framework adapters import the compiled output.
