---
name: mdk-app-rbac
description: >
  Derive an MDK App's RBAC from its code: the `permissions` in mdk-app.yaml
  (the Kernel access its service account needs, which becomes its role in
  spec.rbac) and the Gateway rule that lets users call its routes. Use
  whenever a task mentions app permissions, mdk-app.yaml permissions,
  spec.rbac for an app, an app's role or service account, "what access does
  this app need", or an app route failing with 403 or
  ERR_KERNEL_ACTION_FORBIDDEN.
argument-hint: "[app dir] [--check | --write]"
metadata:
  suite: mdk-developer-skill
  mdk_version: "{{MDK_VERSION}}"
license: Apache-2.0
---

# RBAC for an MDK App (`mdk-app-rbac`)

An app runs as its own service account, `app:<name>`, and the Kernel refuses every call its role in `spec.rbac`
does not allow (`ERR_KERNEL_ACTION_FORBIDDEN`, a `403` at the Gateway). That role is written from the app's
`permissions` in `mdk-app.yaml` by `mdk create app`, `mdk add app` and `mdk rbac init`. This skill derives
`permissions` from the plugin code instead of guessing, keeps it least privilege, and gets it into `mdk.yaml`.

The vocabulary (resources, verbs, instance names, the client-method table) is in
[`references/kernel-access.md`](./references/kernel-access.md).

## Step 1: derive the rules from the code

```bash
node <skills-dir>/mdk-app-rbac/scripts/derive-permissions.mjs <app-dir>            # evidence + the YAML to declare
node <skills-dir>/mdk-app-rbac/scripts/derive-permissions.mjs <app-dir> --check    # exit 1 if the manifest allows less than the code needs
node <skills-dir>/mdk-app-rbac/scripts/derive-permissions.mjs <app-dir> --check --strict   # also exit 1 on access no call needs
node <skills-dir>/mdk-app-rbac/scripts/derive-permissions.mjs <app-dir> --write    # write the rules into mdk-app.yaml (keeps comments)
```

The script scans the plugin's sources (`plugin/`, or the package root when `mdk-plugin.json` is there) for calls of
the Kernel client's methods, maps each to its resource and verb, and prints one rule per resource with the verbs
merged, plus where each call is. `--json` gives the same as data. `--check` and `--write` need the `yaml` package,
which an MDK project has; for an app checked out on its own, `npm install --no-save yaml` first.

Calls are found by method name on any receiver. A method the code destructures off the client
(`const { sendCommand } = client`) is missed, and an unrelated object's `getStatus()` is counted, so Step 2 reads
every site.

Expected output for the scaffold's summary route:

```text
Kernel calls in plugin:
  listWorkers            workers:list (worker.list)               plugin/controllers/summary.js:18

mdk-app.yaml needs at least:

  permissions:
    - resources: [workers]
      verbs: [list]
```

## Step 2: review each call and scope the rules

The derived rules name every instance. Before writing them:

1. Read each listed call site. A call the route cannot reach (dead code, a debug branch) does not need a rule;
   delete the code instead of granting it.
2. Scope `devices` and `workers` rules with `resourceNames` when the app serves one device family or one Worker:
   `["miner/*"]`, `["miner/antminer/*"]`, `["powermeter/*"]`. Split into two rules when reads and writes differ
   in scope.
3. Keep `write` only for routes that command devices; a monitoring app ends with `devices: read` and `workers: list`.
4. Treat `policy`, `identities` and `workers: delete` as administrative: grant them only to an app whose purpose is
   administration, and say so in its README.
5. If the script reports `withActor`, the route acts as the operator too; the user's own role must allow the same
   resource and verb (the two-identities section in [`kernel-access.md`](./references/kernel-access.md)).
6. If it reports `sendWorkerCommand` or `pullWorkerTelemetry`, those dial the Worker directly; `spec.rbac` does not
   cover them.

## Step 3: write `permissions`

Write the reviewed rules into `mdk-app.yaml` (`--write`, or by hand). The key is required, `[]` when the app makes
no Kernel call. Rules use only the Kernel resources and the verbs each takes; `mdk validate app` rejects anything
else.

```yaml
permissions:
  - resources: [devices]
    verbs: [read, write]
    resourceNames: ["miner/*"]
  - resources: [workers]
    verbs: [list]
```

## Step 4: get the grant into `mdk.yaml`

| Situation                                              | Command                                                        |
| ------------------------------------------------------ | -------------------------------------------------------------- |
| New app, or `spec.rbac` has no `app-<name>` role yet   | `mdk rbac init` (also binds the CLI and Gateway accounts)      |
| The app's request changed since it was granted         | `mdk add app <package> --accept-permissions` (or `--keep-permissions` to keep an operator-narrowed role) |
| A scaffolded (path-linked) app whose request changed   | Remove the `app-<name>` role and binding from `spec.rbac`, then `mdk rbac init` |
| Policy in force on a running Kernel                    | `mdk rbac apply`, or restart `mdk run`                         |

Then check both halves at once: `mdk validate app <name>` fails when `permissions` is missing or invalid, when
`spec.rbac` binds nobody, when the app has no role, when the role differs from the request, or when `app:<name>` is
not bound. A policy under which nobody may write the policy (only apps bound, say) also makes `mdk run` refuse to
boot the Kernel, so `mdk rbac init` comes before the first `mdk run`.

## Step 5: let callers in

`permissions` is the app's own access. Users, groups and agents reach the app's routes through a Gateway rule over
`<app>/*` with `get`, `list`, `create`, `update`, `delete` (the caller section in
[`kernel-access.md`](./references/kernel-access.md)). An agent on the MCP server sees only the tools such a rule
allows.

## Self-audit checklist

* [ ] `derive-permissions.mjs <app> --check --strict` exits 0: the manifest allows every call the code makes, and
  nothing the code does not use (least privilege).
* [ ] `devices` and `workers` rules carry `resourceNames` when the app serves one family or one Worker.
* [ ] Administrative resources (`policy`, `identities`, `workers: delete`) are granted only on purpose, and documented.
* [ ] Routes using `req.mdk` have a matching rule for the operator's role.
* [ ] `mdk validate app <name>` passes after `mdk rbac init` (or `mdk add app ... --accept-permissions`).
* [ ] A Gateway rule binds the intended users or agents to `<app>/*`.
