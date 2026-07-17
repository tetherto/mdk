---
title: Submit and approve write actions
description: Stage, submit, review, approve, reject, or cancel write actions from a React app through the Gateway.
docs@tether_slug: guides/gateway/write-actions
---

## Overview

This guide demonstrates how to submit approval-gated write actions from a React app, review the server-side voting queue, and approve,
reject, or cancel pending actions through the Gateway.

## Prerequisites

- The [Gateway is running][run-gateway] with auth enabled
- The signed-in user has the Gateway [`actions:w` permission][plugins-permissions]
- The signed-in user also has the target device-family write permissions required by the action, such as `miner:w` or `container:w`
- The React app is wrapped in [`<MdkProvider apiBaseUrl={...}>`][react-adapter-surface]
- The feature stages write actions in [`actionsStore`][react-adapter-hooks] from `@tetherto/mdk-ui-foundation` or provides actions through an existing 
feature such as [Pool Manager][pool-manager-blueprint]

<Steps>

<Step>

### Submit staged actions

#### 1.1 Submit a single action

Use `useSubmitSingleAction()` when the UI lets an operator submit one staged action by id.

```tsx
import { useSubmitSingleAction } from "@tetherto/mdk-react-adapter/hooks";

function SubmitActionButton({ actionId }: { actionId: number }) {
  const submit = useSubmitSingleAction();

  return (
    <button
      type="button"
      disabled={!submit.canSubmit || submit.submittingActionId === actionId}
      onClick={() => submit.submitSingle(actionId)}
    >
      Submit action
    </button>
  );
}
```

#### 1.2 Submit all staged actions

Use `useSubmitPendingActions()` when the UI has a review tray or bulk-submit control that should send the whole local staging queue.

```tsx
import { useSubmitPendingActions } from "@tetherto/mdk-react-adapter/hooks";

function SubmitActionsButton() {
  const submitPending = useSubmitPendingActions();

  return (
    <button
      type="button"
      disabled={submitPending.isSubmitting || !submitPending.canSubmit}
      onClick={() => submitPending.submit()}
    >
      Submit staged actions
    </button>
  );
}
```

</Step>

<Step>

### Review the server-side queue

After submission, actions move from the local staging queue into the Gateway `/auth/actions*` voting surface.

#### 2.1 Review with `usePendingActions()`

Use `usePendingActions()` for a pending-action review table. Pass `refetchInterval` to override the default poll cadence (see [hook reference][react-adapter-hooks]).

```tsx
import { usePendingActions } from "@tetherto/mdk-react-adapter/hooks";

function PendingActionsList() {
  const { data: pending = [], isLoading } = usePendingActions({
    refetchInterval: 5000,
  });

  if (isLoading) return <p>Loading pending actions...</p>;

  return (
    <ul>
      {pending.map((action) => (
        <li key={action.id}>{action.id}</li>
      ))}
    </ul>
  );
}
```

#### 2.2 Review with `useLiveActions()`

Use `useLiveActions()` when the UI needs to separate the current user's actions from others and gate approve/reject controls on `canApprove`. 
For polling cadence and role logic, see the [hook reference][react-adapter-hooks].

</Step>

<Step>

### Approve or reject an action

Use `useVoteOnAction()` to cast an approval or rejection. The hook calls `PUT /auth/actions/voting/:id/vote` and invalidates
the relevant action caches. Disable direct vote buttons when `canVote` is false. Review-tray UIs that approve other users'
actions should combine this mutation with `useLiveActions().canApprove`.

```tsx
import { useVoteOnAction } from "@tetherto/mdk-react-adapter/hooks";

function VoteButtons({ actionId }: { actionId: string }) {
  const vote = useVoteOnAction();

  return (
    <>
      <button
        type="button"
        disabled={!vote.canVote}
        onClick={() => vote.vote({ id: actionId, approve: true })}
      >
        Approve
      </button>
      <button
        type="button"
        disabled={!vote.canVote}
        onClick={() => vote.vote({ id: actionId, approve: false })}
      >
        Reject
      </button>
    </>
  );
}
```

</Step>

<Step>

### Cancel pending actions

Use `useCancelAction()` when the current operator should withdraw one or more pending actions before the vote thresholds are met.
The Gateway exposes the voting cancel route at `DELETE /auth/actions/voting/cancel`.

```tsx
import { useCancelAction } from "@tetherto/mdk-react-adapter/hooks";

function CancelActionButton({ actionId }: { actionId: string }) {
  const cancel = useCancelAction();

  return (
    <button type="button" onClick={() => cancel.cancel({ ids: [actionId] })}>
      Cancel
    </button>
  );
}
```

</Step>

<Step>

### Verify the result

Approved actions become command requests after the configured vote thresholds are met. Watch the feature state that initiated the
action, or poll the action list with `usePendingActions()` / `useLiveActions()` until the item leaves the voting queue.

> [!NOTE]
> For Pool Manager screens, use the existing [actions sidebar USAGE][actions-sidebar-usage] and 
> [Pool Manager blueprint][pool-manager-blueprint] as the integration examples.

</Step>

</Steps>

## Next steps

- Understand the [approval-gated write architecture][approval-gated-writes] — including how approved actions become normal command requests
- Understand [plugin permission syntax, auth, permissions, and caching][plugins-permissions]
- Configure route permissions in [Gateway plugins][plugins]
- Review hook exports in [`@tetherto/mdk-react-adapter`][react-adapter]
- Run integration coverage: [`backend/core/kernel/tests/integration/actions.test.js`][actions-test]

## Links

[approval-gated-writes]: ../../concepts/control-plane.md#approval-gated-writes
<!-- docs@tether.io: approval-gated-writes → concepts/control-plane#approval-gated-writes -->

[plugins-permissions]: plugins.md#auth-permissions-and-caching
<!-- docs@tether.io: plugins-permissions → guides/gateway/plugins#auth-permissions-and-caching -->

[plugins]: plugins.md
<!-- docs@tether.io: plugins → guides/gateway/plugins -->

[run-gateway]: run.md
<!-- docs@tether.io: run-gateway → guides/gateway/run -->

[actions-test]: ../../../backend/core/kernel/tests/integration/actions.test.js
<!-- docs@tether.io: actions-test → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/tests/integration/actions.test.js -->

[react-adapter]: ../../../ui/packages/react-adapter/README.md
<!-- docs@tether.io: react-adapter → https://github.com/tetherto/mdk/blob/main/ui/packages/react-adapter/README.md -->

[react-adapter-surface]: ../../../ui/packages/react-adapter/README.md#surface
<!-- docs@tether.io: react-adapter-surface → https://github.com/tetherto/mdk/blob/main/ui/packages/react-adapter/README.md#surface -->

[react-adapter-hooks]: ../../../ui/packages/react-adapter/README.md#write-action-hooks
<!-- docs@tether.io: react-adapter-hooks → https://github.com/tetherto/mdk/blob/main/ui/packages/react-adapter/README.md#write-action-hooks -->

[pool-manager-blueprint]: ../../../ui/packages/react-devkit/blueprints/pool-manager.md
<!-- docs@tether.io: pool-manager-blueprint → https://github.com/tetherto/mdk/blob/main/ui/packages/react-devkit/blueprints/pool-manager.md -->

[actions-sidebar-usage]: ../../../ui/packages/react-devkit/src/domain/components/pool-manager/actions-sidebar/USAGE.md
<!-- docs@tether.io: actions-sidebar-usage → https://github.com/tetherto/mdk/blob/main/ui/packages/react-devkit/src/domain/components/pool-manager/actions-sidebar/USAGE.md -->
