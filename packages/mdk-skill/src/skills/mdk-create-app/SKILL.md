---
name: mdk-create-app
description: >
  Scaffold a new MDK App package ready to publish. Use whenever a task mentions
  "create app", "scaffold app", "mdk create app", or generating an MDK App's
  mdk-app.yaml, package.json, plugin/, and ui/ modules.
argument-hint: "<name> [--org <scope>] [--id <reverse-dns>] [--display <name>] [--devices <pattern>] [--verbs <read|read,write>]"
metadata:
  suite: mdk-developer-skill
  mdk_version: "{{MDK_VERSION}}"
license: Apache-2.0
---

# Create an MDK App (`mdk-create-app`)

An MDK App is a self-contained, publishable npm package that bundles a backend plugin, a UI shell module, and an `mdk-app.yaml` manifest.

This skill governs the **creation and scaffolding phase** of an MDK App before it is added to a site or published.

---

## 1. The Package Layout

Every scaffolded app follows the canonical structure:

```text
@tetherto/mdk-app-<name>@<version>
├── package.json        # name, version, files, dependencies, peerDependencies
├── mdk-app.yaml        # app manifest
├── plugin/             # backend plugin template
│   ├── mdk-plugin.json # route table (the Gateway serves it under /apps/<name> unless mounted)
│   ├── controllers/    # route handlers
│   └── lib/            # client helper used by the handlers
└── ui/                 # built UI module with index entry point
    └── index.js
```

---

## 2. The Strict `mdk-app.yaml` Specification

`mdk-app.yaml` defines the app's identity, permissions, and configuration. It contains these 5 keys, plus an optional
one-line `description`:

```yaml
id: io.tether.sentinel              # 1. Immutable identity, reverse-DNS
version: 0.1.0                     # 2. Semver; must equal package.json version
displayName: Sentinel              # 3. Shown in shell's sidebar and CLI
permissions:                       # 4. The Kernel access the app's service account needs; required ([] for none)
  - resources: [devices]
    verbs: [read]                  # Default: read (least privilege; [read, write] for controls/tuning)
    resourceNames: ["*"]           # Default: allow all devices ("*"), or scoped: family/brand/worker/device
config:                            # 5. Operational defaults (overridable in mdk.yaml)
  driftThresholdPct: 10
```

### Critical Negative Constraints: What NOT to Add
* **DO NOT add extraneous top-level keys**: Never add `icon`, `routes`, `auth`, `mcp`, `devices`, `metadata`, or `entry`. The specification limits the manifest to these 5 keys plus `description`; `mdk validate app` reports any other key.
* **`config` must always be an object**: If the app has no default configuration parameters, write `config: {}`. Never leave it null, undefined, or an array.

---

## 3. Edge Cases & Validation Rules

### Edge Case 1: Directory & Location Context
* **Standalone Repo Mode (Outside an MDK project)**: If the current directory is an empty folder or standalone repo (no `mdk.yaml` in current or parent directories), scaffold files **directly at the root of the current directory**:
  `./package.json`, `./mdk-app.yaml`, `./plugin/`, `./ui/`.
* **Site Project Mode (Inside an MDK project)**: If an `mdk.yaml` exists in the current or parent directory, scaffold under `apps/<name>/`.
* **Distinction from Dashboard Shells**: An MDK App package (`@tetherto/mdk-app-<name>`) is a backend plugin + dynamic UI shell module. It is distinct from a standalone Vite dashboard shell created via `mdk create dashboard <name>` (which defaults to `apps/dashboard`). If developing an app inside a site repo alongside an existing dashboard, ensure distinct directory names (e.g. `apps/<name>-app` or keep the dashboard at `apps/dashboard`).

### Edge Case 2: RBAC Permissions & Device Hierarchy
* **Enforced**: `mdk create app`, `mdk add app` and `mdk rbac init` write these rules as the role `app-<name>` in `spec.rbac`,
  and the Kernel refuses every call the role does not allow (`ERR_KERNEL_ACTION_FORBIDDEN`, a `403` at the Gateway). Derive the
  rules from the plugin code with the [`mdk-app-rbac`](../mdk-app-rbac/SKILL.md) skill rather than guessing them.
* **Target resources**: only the Kernel resources `devices`, `workers`, `commands`, `actions`, `policy`, `identities`, each with its
  own verbs ([`kernel-access.md`](../mdk-app-rbac/references/kernel-access.md)). The scaffold's summary route needs
  `resources: [workers]`, `verbs: [list]`. Never `[*]`, `[plugins]` or `[kernel]`.
* **Verbs**:
  * Default: `verbs: [read]` (least privilege; for monitoring, telemetry, and metrics dashboards).
  * Control / Tuning apps (reboots, parameter tuning, commands): `verbs: [read, write]`.
* **Device Scoping (`resourceNames`)**: Defaults to `["*"]` to allow all devices. When scoped, it must follow the 4-part MDK device hierarchy:
  `family / brand / worker / device`
  * `*` — All devices across all families (Default: allow all).
  * `miner/*` — All miners across all brands.
  * `miner/antminer/*` — All Antminers across all workers.
  * `miner/antminer/antminer-a/*` — Devices under worker `antminer-a`.
  * `powermeter/*` — All power meters (note: backend family identifier is `powermeter`, not `power-meter`).
  * `sensor/*`, `container/*` — Sensors and containers.
* **Multiple Device Families**: If an app needs access to multiple hardware types, declare separate scoped rule blocks:
  ```yaml
  permissions:
    - resources: [devices]
      verbs: [read, write]
      resourceNames: ["miner/*"]
    - resources: [devices]
      verbs: [read]
      resourceNames: ["powermeter/*"]
  ```

### Edge Case 3: Naming, Scoping & Version Parity
* **`<name>`**: Lowercase kebab-case slug (`^[a-z0-9][a-z0-9._-]*$`). No uppercase letters, spaces, or slashes.
* **`id`**: Immutable reverse-DNS format (`^[a-z][a-z0-9]*(\.[a-z0-9][a-z0-9-]*)+$`, e.g. `io.tether.<name>`).
* **`package.json` Name**: Defaults to `@tetherto/mdk-app-<name>` (or `@<scope>/mdk-app-<name>` if custom org specified).
* **Version Parity**: `package.json#version` and `mdk-app.yaml#version` **must match byte-for-byte** (defaults to `0.1.0`).

### Edge Case 4: Route Namespacing in `plugin/mdk-plugin.json`
* **The Gateway adds the prefix**: The Gateway serves every route of an app under `/apps/<name>`, where `<name>` is the app's
  `spec.apps[].name` in `mdk.yaml`. Declare paths **without** that prefix:
  * Example: `/status` in `mdk-plugin.json` is served at `/apps/sentinel/status`.
  * Never write `/apps/<name>/...` in the route table; it would be served at `/apps/<name>/apps/<name>/...`.
* **Root mount**: An app whose client calls fixed root paths (the agent app's `/agent/sessions`, an identity app's `/oauth/...`)
  sets `mount: /` on its `spec.apps` entry instead, and its paths are served as written. Prefixed is the default because it
  keeps installed apps from colliding.

### Edge Case 5: Dynamic UI Shell Module Contract
* The UI entry point (`ui/index.js`) is read dynamically by the UI shell.
* It must export a default object with:
  ```javascript
  export default {
    id: 'io.tether.<name>',
    displayName: '<DisplayName>',
    routes: [],
    panels: []
  };
  ```
* **Sidebar sections (optional)**: A route may name a `section` (e.g. `section: 'Operations'`) to be listed in a sidebar
  group with the other pages of that section. To give a section an icon, add `sections: [{ label: 'Operations', icon: OperationsNavIcon }]`,
  with `label` matching the routes' `section` and `icon` a React component. Omit both for a flat list; never add a
  `sections` entry with an empty or duplicate `label`. The shell template [`README.md`](../../../../../examples/mdk-ui-shell-template/README.md)
  documents every route field.
* **Building the pages**: the scaffolded `ui-src/` has one page, one hook and one Home panel. To add pages, panels or
  reports, follow [`mdk-ui-component`](../mdk-ui-component/SKILL.md), which covers the module contract, the build and
  the data, hook and component layers.

---

## 4. Execution Workflow

### Step 1: Collect App Definition (The Interview)
Collect or confirm the definition parameters with sensible fallbacks:

| Parameter | Prompt / Meaning | Default / Fallback |
| :--- | :--- | :--- |
| **`name`** | App slug (kebab-case) | Required (e.g. `sentinel`) |
| **`id`** | Reverse-DNS identity | `io.tether.<name>` |
| **`displayName`** | Human name for shell sidebar and CLI | TitleCase `<name>` |
| **`devices`** | Target hardware hierarchy (`resourceNames`) | `*` (allow all devices) |
| **`verbs`** | Access level needed | `read` (least privilege; `read, write` for controls) |
| **`config`** | Initial default settings | `{}` |

---

### Step 2: Scaffold Files

Inside an MDK project, `mdk create app <name>` (`--org <scope>` for a scoped package name) is the canonical method: it
scaffolds `apps/<name>` with `mdk-app.yaml`, `plugin/mdk-plugin.json`, a client and one read-only route, links the package,
and adds it under `spec.apps` in `mdk.yaml`. Then adjust `id`, `permissions` and the routes as below, and check the result
with `mdk validate app <name>`.

Without the CLI (standalone repo mode, or a layout the template does not cover), create the files directly according to
the location context:

1. **`package.json`**:
```json
{
  "name": "@tetherto/mdk-app-<name>",
  "version": "0.1.0",
  "files": [
    "mdk-app.yaml",
    "plugin/",
    "ui/"
  ],
  "dependencies": {},
  "peerDependencies": {}
}
```

2. **`mdk-app.yaml`**:
```yaml
id: io.tether.<name>
version: 0.1.0
displayName: <DisplayName>
permissions:
  - resources: [devices]
    verbs: [<verbs, default: read>]
    resourceNames: ["<device-pattern, default: *>"]
config: {}
```

3. **`plugin/mdk-plugin.json`**:
```json
{
  "id": "io.tether.<name>",
  "name": "<name>",
  "routes": [
    {
      "id": "<name>.status",
      "handler": "controllers/status.js",
      "http": {
        "method": "GET",
        "path": "/status"
      }
    }
  ]
}
```

4. **`plugin/controllers/status.js`**:
```javascript
'use strict'

module.exports = async function status (req) {
  return { status: 'OK', app: '<name>' }
}
```

5. **`ui/index.js`**:
```javascript
export default {
  id: 'io.tether.<name>',
  displayName: '<DisplayName>',
  routes: [],
  panels: []
};
```

*(`mdk create app` takes only `<name>`, `--org`, `--dir`, `--force`, `--no-install` and `--no-stack-entry` today; set `id`,
`displayName` and `permissions` in the generated `mdk-app.yaml` by hand.)*

---

### Step 3: Self-Audit Checklist

Before completing the task, the agent must verify:
* [ ] **Manifest Keys**: `mdk-app.yaml` contains ONLY `id`, `version`, `displayName`, `permissions` (required, `[]` for none),
  `config`, and optionally `description`.
* [ ] **Version Parity**: `package.json` version equals `mdk-app.yaml` version.
* [ ] **RBAC Resources**: `permissions[].resources` names Kernel resources only, and every verb is one its resource takes.
* [ ] **RBAC matches the code**: `node <skills-dir>/mdk-app-rbac/scripts/derive-permissions.mjs <app> --check` exits 0.
* [ ] **RBAC Verbs**: device rules default to `[read]` (or `[read, write]` for controls); nothing administrative (`policy`,
  `identities`) without a reason.
* [ ] **Device Hierarchy / Scope**: `permissions[].resourceNames` defaults to `["*"]` (allow all) or follows `family/brand/worker/device` (using `powermeter` for power meters).
* [ ] **Route Namespacing**: No route in `plugin/mdk-plugin.json` starts with `/apps/<name>/`; the Gateway adds that prefix.
* [ ] **Validation**: `mdk validate app <name>` passes (the app's name in `mdk.yaml`), which also checks the app's grant in
  `spec.rbac`; run `mdk rbac init` after changing `permissions`.
* [ ] **UI Contract**: `ui/index.js` exports an object with `id`, `displayName`, `routes`, and `panels`, plus `sections` when a section needs an icon.
