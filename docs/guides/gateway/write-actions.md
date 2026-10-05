---
title: Submit and approve write actions
description: Stage, submit, review, approve, reject, or cancel write actions from a React app through the Gateway.
docs@tether_slug: guides/gateway/write-actions
---

## Overview

This guide demonstrates how to submit approval-gated write actions from a React app, review the server-side voting queue, and approve,
reject, or cancel pending actions through the Gateway.

## Prerequisites

- The [Gateway is running][run-gateway] with an [actions plugin mounted](#create-an-actions-plugin)
- Your actions plugin controllers validate tokens and check permissions themselves, since [an unprotected route is reachable by anyone][plugins-auth]
- Your controllers pass the caller's device-family write permissions (`miner:w`, `container:w`) to Kernel as `authPerms`, which Kernel requires before
resolving or approving a write
- If present, your React app is wrapped in [`<MdkProvider apiBaseUrl={...}>`][react-adapter-surface]
- The feature stages write actions in [`actionsStore`][react-adapter-hooks] from `@tetherto/mdk-ui-foundation` or provides
actions through an existing feature such as [Pool Manager][pool-manager-blueprint]

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

After submission, actions move from the local staging queue into the Gateway's voting surface (typically exposed by a plugin at routes like `/auth/actions*`).

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

Use `useVoteOnAction()` to cast an approval or rejection. The hook calls the Gateway's voting endpoint (for example, `PUT /auth/actions/voting/:id/vote` if using that plugin pattern) and invalidates the relevant action caches. Disable direct vote buttons when `canVote` is false. Review-tray UIs that approve other users' actions should combine this mutation with `useLiveActions().canApprove`.

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

Use `useCancelAction()` when the current operator should withdraw one or more pending actions before the vote thresholds are met. The hook calls the Gateway's cancel endpoint (for example, `DELETE /auth/actions/voting/cancel` if using that plugin pattern).

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

## Create an actions plugin

To enable approval-gated writes, create a plugin that exposes HTTP routes for the write-action workflow. Each route should call the corresponding method on the plugin's own `mdkClient` (built from `require('@tetherto/mdk-gateway/plugin')`, [as any Gateway plugin does][plugins]).

> [!NOTE]
> The paths shown below (`/auth/actions*`) are illustrative examples. You may use any path structure that fits your plugin's routing pattern.

### Required routes

| Method | Example Path | `mdkClient` method | Purpose |
|--------|--------------|------------------|---------|
| `GET` | `/auth/actions` | `queryActions()` | Query actions by lifecycle state (voting/ready/executing/done) |
| `POST` | `/auth/actions/voting` | `pushAction()` | Submit a single action for approval |
| `POST` | `/auth/actions/voting/batch` | `pushActionsBatch()` | Submit multiple actions for approval |
| `PUT` | `/auth/actions/voting/:id/vote` | `voteAction()` | Cast approval/rejection vote on an action |
| `DELETE` | `/auth/actions/voting/cancel` | `cancelActionsBatch()` | Cancel pending actions by IDs |

### Plugin structure

```text
backend/plugins/actions/
├── mdk-plugin.json
└── controllers/
    ├── query.js
    ├── push.js
    ├── push-batch.js
    ├── vote.js
    └── cancel.js
```

### Example controller (push.js)

```javascript
'use strict'

const { validateToken } = require('../lib/my-identity-layer')
const mdkClient = require('../lib/client')

module.exports = async function pushAction (req) {
  // Identity comes from your own layer: nothing populates req._info
  const { email: voter, permissions: authPerms } = validateToken(req.headers.authorization)

  return await mdkClient.pushAction({
    query: req.body.query,       // Device query/selector
    action: req.body.action,     // Action name from worker contract
    params: req.body.params,     // Action parameters
    voter,                       // Current user identifier
    authPerms                    // User's permissions (e.g., ['miner:w'])
  })
}
```

[`lib/client.js`][plugins] builds the client once for the whole plugin, per the pattern in the plugin authoring guide.

### Manifest example (mdk-plugin.json)

```json
{
  "name": "@yourorg/mdk-plugin-actions",
  "version": "1.0.0",
  "description": "Approval-gated write action APIs",
  "routes": [
    {
      "id": "actions.push",
      "handler": "./controllers/push.js",
      "http": {
        "method": "POST",
        "path": "/auth/actions/voting",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["query", "action", "params"],
                "properties": {
                  "query": { "type": "object" },
                  "action": { "type": "string" },
                  "params": { "type": "array" }
                }
              }
            }
          }
        }
      },
      "description": "Submit a write action for approval",
      "safety": "Stage-only: does not execute until approved"
    }
  ]
}
```

> [!WARNING]
> This manifest declares no protection, and none is applied on its behalf. The route accepts any caller until its controller validates the request,
> which matters more here than on a read route because it stages fleet-changing writes. [Auth and permissions][plugins-auth] covers the patterns.

### Mount the plugin

```javascript
const { startGateway } = require('@tetherto/mdk-core')
const path = require('path')

await startGateway({
  kernel,
  extraPluginDirs: [
    path.join(__dirname, 'backend/plugins/actions')
  ]
})
```

For complete mdk-client method signatures and protocol details, see the [mdk-client README][client-readme] and [Kernel actions integration tests][actions-test].

## Next steps

- Understand the [approval-gated write architecture][approval-gated-writes] — including how approved actions become normal command requests
- Protect your routes with [controller-level auth and permission checks][plugins-auth]
- Build routes with the [Gateway plugin format][plugins], including caching and manifest fields
- Review hook exports in [`@tetherto/mdk-react-adapter`][react-adapter]
- Run integration coverage: [`backend/core/kernel/tests/integration/actions.test.js`][actions-test]

## Links

[approval-gated-writes]: ../../concepts/control-plane.md#approval-gated-writes
<!-- docs@tether.io: approval-gated-writes → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md#actionmanager -->

[plugins-auth]: plugins.md#auth-and-permissions
<!-- docs@tether.io: plugins-auth → guides/gateway/plugins#auth-and-permissions -->

[plugins]: plugins.md
<!-- docs@tether.io: plugins → guides/gateway/plugins -->

[run-gateway]: run.md
<!-- docs@tether.io: run-gateway → guides/gateway/run -->

[client-readme]: ../../../backend/core/client/README.md
<!-- docs@tether.io: client-readme → https://github.com/tetherto/mdk/blob/main/backend/core/client/README.md -->

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
