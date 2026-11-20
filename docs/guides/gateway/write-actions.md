---
title: Submit and approve write actions
description: Expose approval-gated write actions as Gateway routes, then submit, review, approve, reject, or cancel them from a React app.
docs@tether_slug: guides/gateway/write-actions
---

## Overview

This guide shows how to expose approval-gated write actions as Gateway routes, then submit, review, approve, reject, or cancel
them from a React app. MDK ships no React hooks for actions: the app calls its own routes with `useQuery` / `useMutation`.

## Prerequisites

- The [Gateway is running][run-gateway] with an [actions app mounted](#create-an-actions-app)
- The operator's `spec.rbac` rules grant who may stage and approve writes: the Gateway checks every actions route against them, and
  [what a route's `auth` still does][gateway-security-model] is in the Gateway's security model
- A Worker that accepts the action: only a Worker with the `actions` service, and the action on its allowlist, answers the
  Kernel's `write.calls.request` with calls ([store services][worker-store-services]). A Worker without that service shows
  in the push's `errors`; one whose allowlist or devices don't match the push is left out without an error
- If present, your React app is wrapped in [`<MdkProvider apiBaseUrl={...}>`][react-adapter-surface]

Create the [actions app](#create-an-actions-app) first, then [call its routes](#call-the-routes-from-a-react-app) from the UI.

## Create an actions app

To enable approval-gated writes, create an app that exposes HTTP routes for the write-action workflow. Each route calls the
corresponding method on `req.mdk`, the request's Kernel client. For a signed-in user it acts for that user: the Kernel verifies
their token, checks both the app's grant and the user's own `spec.rbac` rules, and records the user as the voter.

> [!NOTE]
> The paths shown below (`/auth/actions*`) are illustrative examples. You may use any path structure that fits your app's routing pattern.
> Nothing in MDK declares these routes: your app's route table does, and the HTTP reference generated from it lists them.

### Required routes

| Method | Example Path | `req.mdk` method | Purpose |
|--------|--------------|------------------|---------|
| `GET` | `/auth/actions` | `queryActions()` | Query actions by lifecycle state (voting/ready/executing/done) |
| `POST` | `/auth/actions/voting` | `pushAction()` | Submit a single action for approval |
| `POST` | `/auth/actions/voting/batch` | `pushActionsBatch()` | Submit multiple actions for approval |
| `PUT` | `/auth/actions/voting/:id/vote` | `voteAction()` | Cast approval/rejection vote on an action |
| `DELETE` | `/auth/actions/voting/cancel` | `cancelActionsBatch()` | Cancel pending actions by IDs |

### App structure

Start from `mdk create app actions` and replace its summary route with one controller per route:

```text
apps/actions/
├── mdk-app.yaml
└── plugin/
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

module.exports = async function pushAction (req) {
  // req.mdk acts for the user the Gateway verified: Kernel checks their rules and the app's
  const reply = await req.mdk.pushAction({
    query: req.body.query,       // Device query/selector
    action: req.body.action,     // Action name from worker contract
    params: req.body.params,     // Action parameters
    voter: req._info.sub         // Required by the payload; Kernel records the verified user
  })

  // The Kernel refused the request itself, such as an empty action or an invalid query
  if (reply.error) throw new Error(reply.error)

  // Nothing staged: throw the Kernel's ERR_* code first, then each Worker's refusal
  if (reply.id === null) {
    const code = reply.errors.find((e) => e.startsWith('ERR_'))
    throw new Error([code, ...reply.errors.filter((e) => e !== code)].join('; '))
  }

  // Staged: errors names any Worker that failed to answer, not one the push didn't match
  return { id: reply.id, errors: reply.errors }
}
```

`pushAction` resolves rather than throws when the push is refused. A request the Kernel refuses outright comes back as
`{ error }`. Otherwise `id` is `null` when nothing was staged, and `errors` holds the Kernel's code
([why a push is refused][approval-gated-writes]) and a `<workerId>: <error>` entry for each Worker that failed to answer.
A Worker whose allowlist or devices don't match the push is left out of both, so an empty `errors` doesn't mean every
Worker took part. Returned as is, a refused push reaches the caller as `200`. Thrown with the code first, it gets the status the
[controller rule][app-route-errors] gives that code.

### Manifest example (mdk-plugin.json)

```json
{
  "name": "actions",
  "version": "1.0.0",
  "description": "Approval-gated write action APIs",
  "routes": [
    {
      "id": "actions.push",
      "handler": "./controllers/push.js",
      "auth": true,
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
      "safety": "write"
    }
  ]
}
```

> [!WARNING]
> These routes stage fleet-changing writes, so grant them narrowly in `spec.rbac`. A write is staged, not executed, until it is
> approved; `"safety": "write"` keeps the route out of `mdk run mcp` unless it runs with `--allow-write`
> ([`safety`][route-table-fields]). [Auth and permissions][app-auth] covers the patterns.

### Mount the app

Declare it in `mdk.yaml` and start the stack with `mdk run`. The React hooks call `/auth/actions*` at the Gateway root, so mount
the app at `/` rather than the default `/apps/<name>`:

```yaml
spec:
  apps:
    - name: actions
      package: actions
      mount: /
```

Running it from your own code instead goes through `startGateway({ apps })` and `createAppRuntime()`, as
[starting apps from code][apps-from-code] shows.

> [!WARNING]
> Calls through `config.mdkClient` act as the app alone: the Kernel checks only the app's grant and records the app as the voter.
> Use `req.mdk` for anything a user asked for, so their own `devices: write` and `actions` rules gate the write.

## Call the routes from a React app

Read the queue with `useQuery` and send writes with `useMutation`, both re-exported by
[`@tetherto/mdk-react-adapter`][react-adapter]. Read the configured transport with `getFetcher(queryClient)` and use it for queries and mutations. With
`<MdkProvider auth={auth} fetcher={auth.fetcher}>`, where `auth` is a `passwordAuth()` provider, this transport sends the
access token, refreshes it on `401`, retries the request, and parses the JSON body. Invalidate the queue after each write so the list refreshes:

```tsx
import { useMdkContext, useMutation, useQuery, useQueryClient } from "@tetherto/mdk-react-adapter";
import { getFetcher } from "@tetherto/mdk-ui-foundation";

const QUEUE_KEY = ["actions", "voting"];

type PendingAction = { id: string };

function PendingActions() {
  const { apiBaseUrl } = useMdkContext();
  const queryClient = useQueryClient();
  const fetcher = getFetcher(queryClient);
  if (!fetcher) throw new Error("MDK fetcher is not configured");

  const { data: pending = [] } = useQuery({
    queryKey: QUEUE_KEY,
    // Your GET route decides how it maps the request onto `queryActions()` and what it returns;
    // this example assumes it returns the voting actions as an array. `fetcher` parses the body
    // and returns it as the type you give it, so name that type or `pending` arrives as `unknown`.
    queryFn: () => fetcher<PendingAction[]>(`${apiBaseUrl}/auth/actions`),
    refetchInterval: 10_000,
  });

  const vote = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) =>
      fetcher(`${apiBaseUrl}/auth/actions/voting/${id}/vote`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approve }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUEUE_KEY }),
  });

  return pending.map((action) => (
    <button key={action.id} type="button" onClick={() => vote.mutate({ id: action.id, approve: true })}>
      Approve {action.id}
    </button>
  ));
}
```

Submit (`POST /auth/actions/voting`) and cancel (`DELETE /auth/actions/voting/cancel`) follow the same `useMutation` shape.
Approved actions become command requests once the vote thresholds are met; the item then leaves the voting queue.

For complete mdk-client method signatures and protocol details, see the [mdk-client README][client-readme] and [Kernel actions integration tests][actions-test].

## Next steps

- Understand the [approval-gated write architecture][approval-gated-writes] — including how approved actions become normal command requests
- Protect your routes with [controller-level auth and permission checks][app-auth]
- Build routes with the [app route table format][apps], including caching and manifest fields
- Run integration coverage: [`backend/core/kernel/tests/integration/actions.test.js`][actions-test]

## Links

[approval-gated-writes]: ../../concepts/control-plane.md#approval-gated-writes
<!-- docs@tether.io: approval-gated-writes → https://github.com/tetherto/mdk/blob/main/docs/concepts/control-plane.md#approval-gated-writes -->

[app-auth]: apps.md#auth-and-permissions
<!-- docs@tether.io: app-auth → guides/gateway/apps#auth-and-permissions -->

[gateway-security-model]: ../../../backend/core/gateway/README.md#security-model
<!-- docs@tether.io: gateway-security-model → https://github.com/tetherto/mdk/blob/main/backend/core/gateway/README.md#security-model -->

[route-table-fields]: ../../../backend/core/app-runtime/docs/route-table-fields.md#fields
<!-- docs@tether.io: route-table-fields → https://github.com/tetherto/mdk/blob/main/backend/core/app-runtime/docs/route-table-fields.md#fields -->

[worker-store-services]: ../../../backend/core/mdk-worker/README.md#store-services
<!-- docs@tether.io: worker-store-services → https://github.com/tetherto/mdk/blob/main/backend/core/mdk-worker/README.md#store-services -->

[app-route-errors]: ../../../backend/core/gateway/docs/http-api.md#errors-on-every-app-route
<!-- docs@tether.io: app-route-errors → https://github.com/tetherto/mdk/blob/main/backend/core/gateway/docs/http-api.md#errors-on-every-app-route -->

[apps]: apps.md
<!-- docs@tether.io: apps → guides/gateway/apps -->

[apps-from-code]: apps.md#start-apps-from-code
<!-- docs@tether.io: apps-from-code → guides/gateway/apps#start-apps-from-code -->

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

