# @tetherto/mdk-react-adapter

React framework adapter for [`@tetherto/mdk-ui-core`](../ui-core/README.md). Binds
the Zustand vanilla stores and the TanStack `QueryClient` from the
headless core into React-native hooks.

## Surface

- `<MdkProvider apiBaseUrl={...}>` — wraps `QueryClientProvider` from
  `@tanstack/react-query` and exposes the resolved API base URL via
  React context. Required at the app root.
- Store hooks: `useAuth`, `useDevices`, `useTimezone`,
  `useNotifications`, `useActions` — one per core store, implemented
  with `useStore(<vanillaStore>)` from `zustand`.
- Re-exports of `useQuery`, `useMutation`, `useQueryClient` from
  `@tanstack/react-query` so consumers can stay on a single import path.

Higher-level telemetry / command / stale / history hooks listed in the
HLD will be added when the consuming code requires them — we don't ship
speculative infrastructure here.

## Subpath exports

| Subpath       | Purpose                                       |
| ------------- | --------------------------------------------- |
| `.`           | Top-level barrel                              |
| `./provider`  | `<MdkProvider>` + the `MdkContext` it powers  |
| `./hooks`     | Store hooks and re-exported TanStack helpers  |
| `./hooks.json` | Machine-readable hook manifest (generated at build time) |

## Build strategy

`tsc -p tsconfig.build.json` emits ESM JS + `.d.ts` declarations into
`dist/`, and the package `exports` map resolves there. External NPM
consumers get pre-built declarations and runtime JS — no compile step
required on their end.
