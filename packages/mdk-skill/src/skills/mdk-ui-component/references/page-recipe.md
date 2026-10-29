# A page in a dashboard shell

## Overview

A dashboard created with `mdk create dashboard` owns its own pages under `src/pages/`, next to the pages installed apps
add at runtime. This page is the checklist for one such page; the layers are the same as in an app, only the wiring
differs. The shell's [`USAGE.md`](../../../../../../examples/mdk-ui-shell-template/USAGE.md) is the full contract.

## Files

```text
<dashboard>/
├── src/data/<thing>.ts               # response type, query key, mdkFetch request
├── src/hooks/use-<thing>.ts          # useQuery + toQueryView, shaped into a view
├── src/components/<Thing>Panel.tsx   # renders each state
├── src/pages/<Thing>.tsx             # PageLayout with the panel, default export
├── src/routes.ts                     # one-line route entry
├── src/constants/navigation.tsx      # optional: the page's sidebar icon
└── src/App.scss                      # a .mdk-ui-shell-<thing> block
```

## Layers

| Layer     | Owns                                                       | Must not                        |
| --------- | ---------------------------------------------------------- | ------------------------------- |
| Data      | The response type and the `mdkFetch` request               | React                           |
| Hook      | `useQuery`, `toQueryView`, shaping into the view           | JSX                             |
| Panel     | Markup for each state, devkit components from the registry | `fetch`, stores, business rules |
| Page      | The hook call, `PageLayout`, header actions                | Shaping, direct HTTP            |

## The hook's URL

A dashboard page has no app context, so build the URL from the Gateway base the shell's `MdkProvider` holds:

```ts
import { toQueryView, useMdkContext, useQuery } from '@tetherto/mdk-react-adapter'

import { fetchThing, thingQueryKey } from '../data/thing'

export const useThing = () => {
  const { apiBaseUrl } = useMdkContext()
  const url = `${apiBaseUrl}/api/<domain>/thing`
  const query = useQuery({ queryKey: thingQueryKey(url), queryFn: () => fetchThing(url) })
  return toQueryView(query, url)
}
```

For a route an installed app serves, render the app's own page or panel instead of calling its routes from the
dashboard: the app's UI already resolves its mount.

## The page

```tsx
import { PageLayout } from '../components/PageLayout'
import { ThingPanel } from '../components/ThingPanel'
import { useThing } from '../hooks/use-thing'

const Thing = () => (
  <PageLayout title="Thing" className="mdk-ui-shell-thing">
    <ThingPanel view={useThing()} />
  </PageLayout>
)

export default Thing
```

`PageLayout` owns the page title and puts `actions` (a `PeriodControl`, an `ExportButton`) opposite it; a panel never
renders its own page title.

## Route entry

Append one line above the end marker in `src/routes.ts`:

```ts
export const ROUTES: AppRoute[] = [
  { path: '/thing', label: 'Thing', page: () => import('./pages/Thing') },
  // mdk:routes-end
]
```

Keep each entry on a single line and keep the marker: tooling reads the file line by line. `hidden: true` routes a
page without a sidebar entry, and `routePath` adds a deep-link segment such as `/thing/:id?`. Never add a feature page
to `router.tsx`.

A page without an entry in `src/constants/navigation.tsx` gets the default sidebar icon. To give it its own, import
the devkit icon above `mdk:nav-icons-end` and add a one-line `NAV_ICONS` entry above `mdk:nav-end`.

## Styles

Add a block for the page's `className` to `src/App.scss`, `.mdk-ui-shell-<thing>`, following the existing blocks,
and reuse the `--mdk-color-*` variables. Keep [`src/layers.css`](../../../../../../examples/mdk-ui-shell-template/src/layers.css)
the first import in `main.tsx`, so the shell's own styles rank above the devkit's.
