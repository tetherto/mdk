# ActionsSidebar

Full-height side panel that surfaces the MiningOS voting/approval workflow.
Lists local draft actions pending submission, actions already submitted (in
review), and actions raised by other operators that await your vote. Mirrors the
`the reference app` sidebar but is built on MDK primitives — no Redux, no Ant Design.

## Props

| Prop        | Type     | Required | Default | Description                            |
| ----------- | -------- | -------- | ------- | -------------------------------------- |
| `className` | `string` | no       | —       | Extra class on the sidebar root element. |

The sidebar is intentionally prop-light: it reads all state from `actionsStore`
and the `useLiveActions` hook internally.

## Minimal example

```tsx
import { ActionsSidebar } from '@tetherto/mdk-react-devkit'

// Mount once at the app root alongside the main content outlet.
// No props are required — the sidebar manages its own state.
export function App() {
  return (
    <div className="app-layout">
      <main><Outlet /></main>
      <ActionsSidebar />
    </div>
  )
}
```

## Pinned layout example

```tsx
// When the operator pins the sidebar, it enters a side-by-side flex layout.
// Wrap both the content area and ActionsSidebar in a flex row so the
// sidebar pushes the main content left instead of overlapping it.
export function AppWithPinSupport() {
  return (
    <div className="app-shell">
      <main className="app-shell__main"><Outlet /></main>
      <ActionsSidebar />
    </div>
  )
}
```

```scss
.app-shell {
  display: flex;
  flex-direction: row;
  height: 100%;

  &__main {
    flex: 1;
    min-width: 0;
  }
}
```

## Data contracts

- **Drafts** — reads staged actions from `actionsStore` via `useActions()`.
  Each entry is a `PendingSubmissionAction` enqueued by the add / edit /
  assign-pool flows via `setAddPendingSubmissionAction`.
- **Live actions** — polls `GET /auth/actions` via `useLiveActions()` and
  partitions results into "In review" (mine) and "Requested" (others awaiting
  vote) buckets. The current user's email is resolved from `/auth/userinfo`.
- **Submit** — calls `useSubmitSingleAction` / `useSubmitPendingActions`;
  gated by the `actions:w` permission. After a successful submit the card
  briefly shows "Action Submitted" then disappears.
- **Vote** — calls `useVoteOnAction` for actions awaiting approval; also gated
  by `actions:w`.
- **Cancel** — calls `useCancelAction` for submitted actions awaiting execution.

## Notes

- Mount it **once** at the application root, outside the route `<Outlet>`, so
  drafts accumulated across Pool Manager sub-views remain visible.
- Requires `MdkProvider` (TanStack Query client + auth) above it in the tree.
- The **pin** feature switches to a flex-based layout — ensure the parent
  container uses `display: flex; flex-direction: row` so the sidebar pushes
  content rather than overlapping it.
