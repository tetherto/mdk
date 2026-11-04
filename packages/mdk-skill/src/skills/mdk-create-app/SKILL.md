---
name: mdk-create-app
description: >
  Scaffold a new MDK App package ready to publish. Use whenever a task mentions
  "create app", "scaffold app", "mdk create app", or generating an MDK App's
  mdk-app.yaml, package.json, plugin/, ui-src/ and ui/ modules.
argument-hint: "<name> [--org <scope>] [--flat] [--id <reverse-dns>] [--display <name>] [--devices <pattern>] [--verbs <read|read,write>]"
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

Every scaffolded app follows the canonical structure, as `mdk create app` writes it:

```text
<name>/
├── package.json        # name, version, files (mdk-app.yaml, plugin/, ui/, README.md), build:ui/dev:ui/typecheck:ui scripts
├── mdk-app.yaml        # app manifest
├── README.md
├── plugin/             # backend plugin
│   ├── mdk-plugin.json # route table (the Gateway serves it under /apps/<name> unless mounted)
│   ├── controllers/    # route handlers (the starter has summary.js)
│   └── lib/client.js   # the app's ambient MDK client
├── ui-src/             # UI source, not published: defineMdkApp module, data/hooks/components/pages, Vite build
│   ├── index.tsx
│   ├── vite.config.ts
│   └── package.json    # the UI's own build dependencies
└── ui/                 # built UI module, published and committed
    ├── index.js
    └── style.css
```

[`mdk-ui-component/references/app-ui-module.md`](../mdk-ui-component/references/app-ui-module.md) describes every file
under `ui-src/` and the build.

---

## 2. The Strict `mdk-app.yaml` Specification

`mdk-app.yaml` defines the app's identity, permissions, and configuration. It contains these 5 keys, plus an optional
one-line `description`:

```yaml
id: io.tether.sentinel              # 1. Immutable identity, reverse-DNS
version: 0.1.0                     # 2. Semver; must equal package.json version
displayName: Sentinel              # 3. Shown in shell's sidebar and CLI
permissions:                       # 4. The Kernel access the app's service account needs; required ([] for none)
  - resources: [workers]           # The scaffold's summary route lists workers
    verbs: [list]
  - resources: [devices]           # Add a rule like this only for a route that reads or commands devices
    verbs: [read]                  # read (least privilege); [read, write] for controls/tuning
    resourceNames: ["miner/*"]     # "*" for all devices, or scoped: family/brand/worker/device
config:                            # 5. Operational defaults (overridable in mdk.yaml)
  driftThresholdPct: 10
```

### Critical Negative Constraints: What NOT to Add
* **DO NOT add extraneous top-level keys**: Never add `icon`, `routes`, `auth`, `mcp`, `devices`, `metadata`, or `entry`. The specification limits the manifest to these 5 keys plus `description`; `mdk validate app` reports any other key.
* **`config` must always be an object**: If the app has no default configuration parameters, write `config: {}`. Never leave it null, undefined, or an array.

---

## 3. Edge Cases & Validation Rules

### Edge Case 1: Directory & Location Context
* **Site Project Mode (Inside an MDK project)**: If an `mdk.yaml` exists in the project directory, run `mdk create app <name>`.
  It scaffolds `apps/<name>/`, links the package into the project's `package.json`, adds it under `spec.apps` and grants
  its permissions in `spec.rbac`.
* **Standalone Repo Mode (an app repo, installed with `mdk add app github:<owner>/<repo>#<tag>`)**: run
  `mdk create app <name> --flat` at the repo root. It scaffolds `./package.json`, `./mdk-app.yaml`, `./plugin/`,
  `./ui-src/` and `./ui/` directly in the directory, and links nothing: no project, no `mdk.yaml`. It refuses a
  directory that has `mdk.yaml`, and one that already has any of those files unless `--force` is given. Never scaffold
  into a throwaway project and move `apps/<name>/` out.
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
* **`package.json` Name**: `mdk create app` writes `<name>`, or `@<scope>/<name>` with `--org <scope>`. Rename it
  before publishing if you want the `mdk-app-<name>` convention (`@<scope>/mdk-app-<name>`).
* **Version Parity**: `package.json#version` and `mdk-app.yaml#version` **must match byte-for-byte** (defaults to `0.1.0`).

### Edge Case 4: Route Namespacing in `plugin/mdk-plugin.json`
* **The Gateway adds the prefix**: The Gateway serves every route of an app under `/apps/<name>`, where `<name>` is the app's
  `spec.apps[].name` in `mdk.yaml`. Declare paths **without** that prefix:
  * Example: the scaffold's `/api/sentinel/summary` in `mdk-plugin.json` is served at `/apps/sentinel/api/sentinel/summary`.
  * Never write `/apps/<name>/...` in the route table; it would be served at `/apps/<name>/apps/<name>/...`.
* **Root mount**: An app whose client calls fixed root paths (the agent app's `/agent/sessions`, an identity app's `/oauth/...`)
  sets `mount: /` on its `spec.apps` entry instead, and its paths are served as written. Prefixed is the default because it
  keeps installed apps from colliding.

### Edge Case 5: Dynamic UI Shell Module Contract
* The dashboard imports the built `ui/index.js` at runtime. Its source is `ui-src/index.tsx`, which default-exports
  `defineMdkApp` from `@tetherto/mdk-react-adapter`:
  ```tsx
  import { defineMdkApp, MDK_APP_PANEL_SLOT } from '@tetherto/mdk-react-adapter'

  import { OverviewPage, SummaryHomePanel } from './pages/overview-page'
  import './styles.css'

  export default defineMdkApp({
    id: '<id from mdk-app.yaml>', // the dashboard refuses a mismatch
    displayName: '<DisplayName>',
    routes: [{ path: '', component: OverviewPage }],
    panels: [{ id: 'summary', slot: MDK_APP_PANEL_SLOT.HOME, component: SummaryHomePanel }],
  })
  ```
* Pages reach the app's own routes through `useMdkApp().apiUrl('/api/<name>/...')` and `mdkFetch`, never a hardcoded
  `/apps/<name>/...` URL: the operator chooses the installed name.
* Rebuild with `npm run build:ui` after every change under `ui-src/`, and commit `ui/`: `mdk add app github:...` runs no build.
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
| **`id`** | Reverse-DNS identity | The CLI writes `com.example.<name>`; set your own |
| **`displayName`** | Human name for shell sidebar and CLI | The CLI writes `<name>`; TitleCase it |
| **`location`** | In a site project, or the root of its own repo | Project when `mdk.yaml` exists, else ask (`--flat`) |
| **`devices`** | Target hardware hierarchy (`resourceNames`) | No device rule (the starter lists workers only) |
| **`verbs`** | Access level needed | `read` (least privilege; `read, write` for controls) |
| **`config`** | Initial default settings | `{}` |

---

### Step 2: Scaffold Files

`mdk create app` is the canonical method; it needs Node >= 24.

* **In a site project**: `mdk create app <name>` (`--org <scope>` for a scoped package name) scaffolds `apps/<name>`,
  links the package, adds it under `spec.apps` in `mdk.yaml` and grants its permissions in `spec.rbac`.
* **In an app repo**: `mdk create app <name> --flat` scaffolds at the repo root and links nothing.

Both write `mdk-app.yaml`, `plugin/` (a client and one read-only `/api/<name>/summary` route) and the starter UI in
`ui-src/`, then install the UI's build dependencies and build it into `ui/`. Inside an MDK checkout the MDK packages
link to the checkout with relative `file:` paths, and the UI packages must be built there first
(`npm run setup:ui && npm run build:ui` at the checkout root); the CLI says so instead of building when they are not.

Then adjust `id`, `displayName`, `permissions` and the routes, rebuild the UI with `npm run build:ui`, and check the
result with `mdk validate app <name>` (in a project).

Without the CLI, copy the CLI's templates (`packages/cli/templates/app/` and `packages/cli/templates/app-ui/ui-src/`)
and replace their `__PLUGIN_NAME__`, `__PLUGIN_APP__`, `__PACKAGE_NAME__`, `__APP_*__` placeholders. The files that
matter, in their scaffolded form:

1. **`package.json`**:
```json
{
  "name": "@<scope>/<name>",
  "version": "0.1.0",
  "files": ["mdk-app.yaml", "plugin/", "ui/", "README.md"],
  "engines": { "node": ">=24" },
  "scripts": {
    "build:ui": "npm --prefix ui-src run build",
    "dev:ui": "npm --prefix ui-src run dev",
    "typecheck:ui": "npm --prefix ui-src run typecheck"
  },
  "dependencies": { "@tetherto/mdk-client": "^<mdk version>" }
}
```

2. **`mdk-app.yaml`**:
```yaml
id: com.example.<name>
version: 0.1.0
displayName: <DisplayName>
permissions: [{ resources: [workers], verbs: [list] }]
config: {}
```

3. **`plugin/mdk-plugin.json`**:
```json
{
  "name": "<name>",
  "version": "0.1.0",
  "routes": [
    {
      "id": "<name>.summary",
      "handler": "./controllers/summary.js",
      "safety": "read-only",
      "http": { "method": "GET", "path": "/api/<name>/summary" }
    }
  ]
}
```

4. **`plugin/controllers/summary.js`**: `module.exports = async function summary (req) { ... }`, calling the Kernel
   through `require('../lib/client')` (the app's ambient MDK client, `config.mdkClient` from `@tetherto/mdk-gateway/plugin`).

5. **`ui-src/`**: `index.tsx` default-exporting `defineMdkApp` (Edge Case 5), with `vite.config.ts` and `package.json`
   as in [`app-ui-module.md`](../mdk-ui-component/references/app-ui-module.md). Build it with `npm run build:ui`.

*(`mdk create app` takes `<name>`, `--org`, `--dir`, `--flat`, `--force`, `--no-install` and `--no-stack-entry`; set
`id`, `displayName` and `permissions` in the generated `mdk-app.yaml` by hand.)*

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
* [ ] **UI Contract**: `ui-src/index.tsx` default-exports `defineMdkApp({ id, displayName, routes, panels })` (plus
  `sections` when a section needs an icon), its `id` equals `id` in `mdk-app.yaml`, and `ui/` is rebuilt and committed.
* [ ] **Location**: in a site project the app is under `apps/<name>/`; an app repo has it at the root (`--flat`).
