# RBAC

## Overview

`@tetherto/mdk-rbac` is the policy library behind every way into an MDK stack. The Gateway (users), the MCP server (AI agents) and
the Kernel (apps) evaluate the same `spec.rbac` from `mdk.yaml` with one evaluator. `mdk.yaml` is the only place policy is written:
the Kernel applies it at boot and on `mdk rbac apply`, and keeps the copy in force in its Hyperbee.

- **Default deny.** No matching rule, no bound role, or no policy at all is a refusal.
- **No superadmin.** Full access is an ordinary role holding wildcards. Claims such as `admin` or `perms` on a token grant nothing.
- **Fails closed.** A malformed identity or request is denied, never thrown. An invalid policy is refused at load, with every problem listed.

## Usage

```js
const { compilePolicy, kernelRequest, deviceName } = require('@tetherto/mdk-rbac')

const rbac = compilePolicy(stack.spec.rbac) // throws ERR_RBAC_POLICY_INVALID

// Gateway and MCP server: an app route is <app>/<path>
rbac.evaluate(claims, { resource: 'ops-center/miners/command', verb: 'create', resourceName: 'rack-3-07' })

// Kernel: each HRPC action maps to a resource and verb (KERNEL_ACTIONS)
const dev = deviceName({ family: 'miner', brand: 'antminer', worker: 'antminer-a', device: 'AM-001' })
rbac.evaluate(claims, kernelRequest('command.request', dev))
// { allowed: true, reason: 'matched', role: 'app-antminer-tuner', rule: 0, policyVersion: '…' }
```

`claims` are the verified JWT claims: `{ kind: 'user' | 'serviceaccount', sub, email?, groups? }`.

## Policy

```yaml
spec:
  rbac:
    enforcement: deny            # the only accepted value
    roles:
      - name: rack3-tech
        rules:
          - resources: [ops-center/miners/command]
            verbs: [create]
            resourceNames: ["rack-3-*"]
    bindings:
      - role: rack3-tech
        subjects: [{ kind: User, name: tech@example.com }]
```

| Subject kind     | Matches                                                                                       |
| ---------------- | --------------------------------------------------------------------------------------------- |
| `User`           | A user token's `sub` or `email`                                                               |
| `Group`          | An entry in the token's `groups`                                                              |
| `ServiceAccount` | A service-account token's `sub`: `app:<name>` for an app, or an agent account                 |

`*` is the only wildcard. It matches any run of characters, `/` included, so `miner/*` covers every miner and `*` covers everything.
A rule with `resourceNames` never matches a request that names no instance.

## Vocabulary

| Resource                            | Verbs                                       | `resourceName`               |
| ----------------------------------- | ------------------------------------------- | ---------------------------- |
| `devices`                           | `read`, `write`                             | `family/brand/worker/device` |
| `workers`                           | `list`, `read`, `delete`                    | `family/brand/worker`        |
| `commands`                          | `read`                                      | None                         |
| `actions`                           | `read`, `write`, `vote`, `delegate`         | None                         |
| `policy`                            | `read`, `write`                             | None                         |
| `identities`                        | `read`, `write`                             | None                         |
| `<app>/<path>` (any other resource) | `get`, `list`, `create`, `update`, `delete` | Declared by the route        |

The `brand` segment is the Worker contract's `metadata.brand` as a slug (`brandSlug`): lowercase, with runs of anything
else turned into `-`, so `Antminer` is `antminer` and `Schneider Electric` is `schneider-electric`. `actions: delegate`
lets a caller name the voter of an action (an app voting for the user it authenticated); without it the voter is the
caller. `commands: read` reads the Kernel's write-command log (`command.log`), which records every `command.request`
attempt, refused ones included.

A verb applies only to its own domain. So `viewer` with `resources: ["*"]` and `verbs: [get, list]` reads every route and no device.
The validator rejects a rule whose verb fits none of its resources. `KERNEL_ACTIONS` maps every HRPC action the Kernel accepts from a
caller to one of these checks; an action missing from it is refused. The sign-in actions (`auth.*`, listed in
`PUBLIC_KERNEL_ACTIONS`) are the exception: the caller has no token yet, so the issuer authenticates them itself.

## Routes

`routeAccess(appName, route)` gives how an app route is governed, the same at the Gateway (users) and the MCP server
(agents): the resource `<app>/<path>` from the route template, and the route's `verb` or one from its method (`GET` `get`,
`POST` `create`, `PUT`/`PATCH` `update`, `DELETE` `delete`). `routeRequest(access, req)` adds the instance name from the
route's declared `resourceName` (`{ param | query | body: "<field>" }`). `routeAccessError(route)` checks those two route
fields; the app runtime's route loader rejects a route that fails it.

## Policy store

`PolicyStore` keeps the applied policy in a Hyperbee (the Kernel's `kernel-rbac` sub-bee). `apply(rbac)` validates first, so a
refused policy leaves the one in force untouched; applying the policy already in force is a no-op. Every applied record is kept
under `history/`, with the version it replaced. `current()` returns the evaluator in force, which denies everything until a policy is
loaded or applied.

## App grants

`appGrant(name, permissions)` turns an app's `mdk-app.yaml` `permissions` into what `mdk add app` writes into `spec.rbac`: a role
`app-<name>`, bound to the service account `app:<name>`. An app requests Kernel resources only, and its name must not shadow one.
`validateAppPermissions` reports the same problems against the manifest's own paths, for `mdk validate app`, and `permissionsDigest`
lets a later install tell a changed request from a role the operator narrowed.

| Code                                | Fires when                                                                   | Fix                                                        |
| ----------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `ERR_RBAC_POLICY_INVALID`           | `spec.rbac` breaks a rule; `err.errors` lists each problem with its path     | Fix each listed path in `mdk.yaml`                         |
| `ERR_RBAC_APP_PERMISSIONS_INVALID`  | An app requests a non-Kernel resource, or a verb its resource does not take  | Request Kernel resources and their verbs in `mdk-app.yaml` |
| `ERR_RBAC_APP_NAME_INVALID`         | An app name is not lowercase letters, digits and dashes, starting with a letter | Rename the app                                          |
| `ERR_RBAC_APP_NAME_RESERVED`        | An app name equals a Kernel resource                                         | Rename the app                                             |
| `ERR_RBAC_NAME_INVALID`             | A device or worker name segment is empty or holds `/` or `*`                 | Pass plain name segments to `deviceName` / `workerName`    |
| `ERR_RBAC_STORE_BEE_REQUIRED`       | `PolicyStore` is built without a Hyperbee                                    | Pass `{ bee }`                                             |

## Next steps

- [Kernel](../kernel/README.md): how the Kernel admits callers and serves `rbac.get` and `rbac.apply`
- [CLI](../../../packages/cli/README.md): `mdk add app` grants and `mdk rbac apply`
