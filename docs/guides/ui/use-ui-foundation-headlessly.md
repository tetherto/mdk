---
title: Use UI Foundation headlessly
description: Drive @tetherto/mdk-ui-foundation stores from any runtime without React
docs@tether_slug: guides/ui/use-ui-foundation-headlessly
---

## Overview

[`@tetherto/mdk-ui-foundation`][ui-foundation] is the framework-agnostic headless layer of the MDK App Toolkit. This page
walks through installing it on its own and driving its Zustand stores from a non-React runtime: a Node script, a Vue or
Svelte adapter you're authoring, a CLI tool, or a test helper.

## When to reach for this

Use headless UI Foundation when:

- You're authoring a framework adapter (Vue, Svelte, Web Components) and need raw access to the Zustand stores
- You're building a Node CLI or backend service that has to read MDK telemetry and act on it
- You're writing test helpers or fixtures that need to seed and inspect store state without a React renderer
- You need to subscribe to store changes from non-UI code, such as logging, websocket bridges or metrics

For a React app, the [React adapter][react-adapter] wraps UI Foundation with `<MdkProvider>` and adapter hooks. Use that
path instead so most React code never touches `@tetherto/mdk-ui-foundation` directly.

## Install

`@tetherto/mdk-ui-foundation` has no peer dependencies on React or any UI framework. It is ESM-only, so mark your project as
a module:

```bash
npm install @tetherto/mdk-ui-foundation
npm pkg set type=module
```

## Subpath imports

Pull only the pieces you need from the relevant subpath. Subpath imports give tree-shakers a smaller surface than the
top-level barrel:

```ts
import { authStore, devicesStore } from '@tetherto/mdk-ui-foundation/store'
import { createMdkQueryClient } from '@tetherto/mdk-ui-foundation/query'
import type { Rack } from '@tetherto/mdk-ui-foundation/types'
```

These are the subpath entries most apps need. The package also publishes `/app-shared-modules`, `/app-ui-paths` and
`/stores.json`. Every entry loads in plain Node and typechecks under both `"moduleResolution": "nodenext"` and `"bundler"`.

## Create a `QueryClient`

`createMdkQueryClient` returns a TanStack Query Core client wired to your Gateway. Pass an explicit `apiBaseUrl`, or let the
factory resolve one from environment variables:

```ts
import { createMdkQueryClient } from '@tetherto/mdk-ui-foundation/query'

const queryClient = createMdkQueryClient({
  apiBaseUrl: 'https://gateway.example.com',
})
```

Without an explicit `apiBaseUrl`, the factory checks `VITE_MDK_API_URL`, then `MDK_API_URL`, then the deprecated
`VITE_API_BASE_URL` / `API_BASE_URL` (which log a one-time warning), before falling back to `http://localhost:3000`.
Passing `''` is not the same as passing nothing: it means "use relative URLs", which is what you want when the Gateway
serves the UI.

### Bring your own backend

`createMdkQueryClient` accepts a `fetcher`, the seam for pointing the query layer at a different transport: a custom auth
scheme, a different protocol, or fixtures served from memory for a server-less demo.

```ts
const queryClient = createMdkQueryClient({
  apiBaseUrl,
  fetcher: myFetcher,
})
```

The resolved base URL and that fetcher are stashed on the client's query and mutation `meta`, so everything reading through
the client picks them up.

> [!NOTE]
> `createMdkQueryClient` takes no `endpoints` option and ships no prebuilt query or mutation factories. To read a route
> your Gateway app serves, call it with `useQuery` directly.

## Read store state

Each store is a Zustand vanilla singleton. `getState()` returns the current snapshot:

```ts
import { authStore } from '@tetherto/mdk-ui-foundation/store'

const { token, permissions } = authStore.getState()
console.log('current token', token)
```

## Write store state

`setState()` accepts either a partial object or a function that receives the previous state:

```ts
import { devicesStore } from '@tetherto/mdk-ui-foundation/store'

devicesStore.setState({ filterTags: ['rack-a'] })

devicesStore.setState((prev) => ({
  selectedDevices: [...prev.selectedDevices, newDevice],
}))
```

## Subscribe to changes

`subscribe()` runs a callback on every state change and returns an unsubscribe function:

```ts
import { notificationStore } from '@tetherto/mdk-ui-foundation/store'

const unsubscribe = notificationStore.subscribe((state) => {
  console.log('unread notifications:', state.count)
})

unsubscribe()
```

## A complete Node example

A small Node script that signs itself in with a token you already hold, reads a route your Gateway app serves, and prints
the unread notification count. A Gateway serves exactly the routes its declared apps provide, so substitute your own path
for `/site/devices`:

```ts
import { createMdkQueryClient } from '@tetherto/mdk-ui-foundation/query'
import {
  authStore,
  devicesStore,
  notificationStore,
} from '@tetherto/mdk-ui-foundation/store'

const apiBaseUrl = process.env.MDK_API_URL ?? 'http://localhost:3000'

const main = async (): Promise<void> => {
  const queryClient = createMdkQueryClient({ apiBaseUrl })

  authStore.setState({ token: process.env.MDK_TOKEN ?? '' })

  const devices = await queryClient.fetchQuery({
    queryKey: ['devices', 'list'],
    queryFn: async () => {
      const res = await fetch(`${apiBaseUrl}/site/devices`, {
        headers: { Authorization: `Bearer ${authStore.getState().token}` },
      })
      if (!res.ok) {
        throw new Error(`ERR_DEVICES_REQUEST: ${res.status}`)
      }
      return res.json()
    },
  })
  devicesStore.getState().setSelectedDevices(devices)

  console.log(`Found ${devices.length} devices`)

  console.log(`unread notifications: ${notificationStore.getState().count}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

Save it as `script.ts` in the module project from [Install](#install) and run it. Node 22.18 or later strips the type
annotations itself:

```bash
MDK_TOKEN=ey... MDK_API_URL=https://gateway.example.com node script.ts
```

[Query helpers][query-helpers] lists every helper, including the `resolveApiBaseUrl` resolution order.

## Next steps

- [Stores][stores]: every store with its state fields and actions
- [Query helpers][query-helpers]: `createMdkQueryClient`, `resolveApiBaseUrl` and the client accessors
- [What's an app?][whats-an-app]: where the UI devkit fits into an MDK app's anatomy
- [React adapter][react-adapter]: if you decide to layer React on top

[ui-foundation]: ../../../ui/packages/ui-foundation/README.md
<!-- docs@tether.io: ui-foundation → reference/ui -->

[react-adapter]: ../../../ui/packages/react-adapter/README.md
<!-- docs@tether.io: react-adapter → guides/ui/install -->

[stores]: ../../../ui/packages/ui-foundation/README.md#state
<!-- docs@tether.io: stores → reference/ui/stores -->

[query-helpers]: ../../../ui/packages/ui-foundation/README.md#data-fetching
<!-- docs@tether.io: query-helpers → reference/ui/query-helpers -->

[whats-an-app]: ../../concepts/whats-an-app.md
<!-- docs@tether.io: whats-an-app → concepts/whats-an-app -->
