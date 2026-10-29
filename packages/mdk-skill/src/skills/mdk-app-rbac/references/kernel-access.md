# Kernel access an app can request

`permissions` in `mdk-app.yaml` is a list of RBAC rules over the Kernel's own resources. Each rule names resources,
the verbs it allows on them, and optionally `resourceNames` patterns that narrow it to some instances. The vocabulary
is owned by `@tetherto/mdk-rbac` (`backend/core/rbac/lib/vocabulary.js`); this page mirrors it.

## Resources and verbs

| Resource     | Verbs                          | Instance name a rule's `resourceNames` matches     |
| ------------ | ------------------------------ | -------------------------------------------------- |
| `devices`    | `read`, `write`                | `family/brand/worker/device`, e.g. `miner/antminer/antminer-a/AM-001` |
| `workers`    | `list`, `read`, `delete`       | `family/brand/worker` (`list` has no instance)     |
| `commands`   | `read`                         | none: the write-command log                        |
| `actions`    | `read`, `write`, `vote`, `delegate` | none                                          |
| `policy`     | `read`, `write`                | none: the `spec.rbac` in force                     |
| `identities` | `read`, `write`                | none: users and service accounts                   |

A rule with `resourceNames` never matches an action that has no instance (`list`, `commands`, `actions`, `policy`,
`identities`), so scope only `devices` and `workers`. Patterns are glob-like over the `/`-separated name: `*` matches
everything, `miner/*` every miner, `miner/antminer/*` every Antminer, `powermeter/*` every power meter (the family
identifier is `powermeter`).

## Client method to rule

Every call an app makes through its Kernel client (`config.mdkClient`, or `req.mdk` for the operator) sends one
action, and the Kernel evaluates that action as one resource and verb for each instance it touches. The script
[`derive-permissions.mjs`](../scripts/derive-permissions.mjs) carries this table and finds the calls.

| Client method            | Kernel action           | Needs                | Instance checked                       |
| ------------------------ | ----------------------- | -------------------- | -------------------------------------- |
| `listWorkers()`          | `worker.list`           | `workers: list`      | none                                   |
| `terminateWorker(id)`    | `worker.terminate`      | `workers: delete`    | the worker                             |
| `getCapabilities(id)`    | `device.capabilities`   | `devices: read`      | the device                             |
| `pullTelemetry(id, q)`   | `telemetry.pull`        | `devices: read`      | the device                             |
| `pullState(id)`          | `state.pull`            | `devices: read`      | the device                             |
| `getCommandStatus(cid)`  | `command.status`        | `devices: read`      | the command's target device(s)         |
| `sendCommand(id, c, p)`  | `command.request`       | `devices: write`     | the device, or every device of a worker-scoped command |
| `getCommandLog(q)`       | `command.log`           | `commands: read`     | none                                   |
| `getAction`, `getActionsBatch`, `queryActions` | `action.get`, `action.get-batch`, `action.query` | `actions: read` | none |
| `pushAction`, `pushActionsBatch`, `cancelActionsBatch` | `action.push`, `action.push-batch`, `action.cancel-batch` | `actions: write` | none |
| `voteAction`             | `action.vote`           | `actions: vote`      | none                                   |
| `getRbac()`              | `rbac.get`              | `policy: read`       | none                                   |
| `applyRbac(rbac)`        | `rbac.apply`            | `policy: write`      | none                                   |
| `listUsers`, `listServiceAccounts` | `identity.user.list`, `identity.sa.list` | `identities: read` | none           |
| `upsertUser`, `deleteUser`, `upsertServiceAccount`, `deleteServiceAccount`, `rotateSigningKey` | `identity.*` | `identities: write` | none |

Helpers that first ask the Kernel for the fleet need `workers: list` as well: `getStatus`, `waitForWorkers`,
`waitForDevice`, `getWorkerKey`. `sendWorkerCommand` and `pullWorkerTelemetry` then dial the Worker directly, which
the Kernel does not evaluate; the Worker's own allow-list decides.

## Two identities on one call

A route that calls `req.mdk` (the client `withActor(token)` builds) sends the app's own token and the operator's.
The Kernel evaluates both: the app's role must allow the resource and verb, and so must a role the operator is bound
to. Granting the app `devices: write` is not enough for a user whose role only allows the app's routes; bind the user
to a role with the same Kernel rule, or route the call through the app's own client when the app, not the user, is
meant to be the actor.

## Who may call the app

`permissions` says nothing about callers. Who may call the app's routes is a Gateway rule in `spec.rbac`, over the
resource `<app>/<path>` with the verbs `get`, `list`, `create`, `update`, `delete`, bound to users, groups or agents:

```yaml
spec:
  rbac:
    roles:
      - name: ops-viewer
        rules:
          - resources: ["ops/*"]
            verbs: [get, list]
    bindings:
      - role: ops-viewer
        subjects: [{ kind: Group, name: ops-team }]
```
