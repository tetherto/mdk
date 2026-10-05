# Agent-first architecture

The MDK monorepo is set up so AI agents can build features from
plain-language intents without parsing the package source. This page is
both the **quickstart** (how to test it in 30 seconds) and the
**architecture tour** (how every piece fits together), plus the
**end-to-end recipe** for running the `mdk-ui-shell` template against a
real backend.

It is intentionally not the contract — the strict contract lives in
[`../packages/react-devkit/AGENT_READY.md`](../packages/react-devkit/AGENT_READY.md).

## TL;DR

- **Write code** → add JSDoc with `@tier` + `@category` + `@domain`.
- **If `agent-ready`** → also ship `USAGE.md` + `*.example.tsx` (+
  `@kernelCapability` if domain-specific).
- **`npm run fullcheck`**: when green, the repo is shippable.
- **Agents** read `blueprints.json` first, then drill into
  `registry.json` / `hooks.json` / `stores.json`, `USAGE.md`, and
  examples — all local files, no network.
- **Baseline is empty** → should be empty in CI; run
  `npm run check:agent-ready --workspace @tetherto/mdk-react-devkit -- --no-baseline`
  locally to see full debt.

## What this is

MDK is a mining UI toolkit. We made it so an **AI agent** (Cursor,
Claude, etc.) can read a small set of JSON files, understand every
component, hook, and store, and scaffold real features without guessing.

It ships three TypeScript packages and one font package:

- [`@tetherto/mdk-ui-foundation`](../packages/ui-foundation/README.md) — framework-agnostic
  state (Zustand stores), the command lifecycle state machine, telemetry
  primitives.
- [`@tetherto/mdk-react-adapter`](../packages/react-adapter/README.md) — React
  bindings for the stores and TanStack Query.
- [`@tetherto/mdk-react-devkit`](../packages/react-devkit/README.md) — the
  component library: generic UI primitives in [`src/primitives/`](../packages/react-devkit/src/primitives/), mining-domain
  components and hooks in [`src/domain/`](../packages/react-devkit/src/domain/).

Think of it as three layers:

1. **The code**: components, hooks, Zustand stores, utilities (what you
   ship).
2. **The contract**: JSDoc tags + co-located docs that describe each
   export.
3. **The agent surface**: the generated JSON manifests an LLM reads first.

The agent-first design lives mostly in `react-devkit`. Everything below
describes the artifacts that turn "code in `src/`" into "an agent can
build with this".

## The big picture

```mermaid
flowchart LR
  src["src/**/*.tsx + JSDoc tags"]
  blueprintsMd["blueprints/*.md"]
  adapterSrc["react-adapter/src/hooks/**"]
  coreSrc["ui-foundation/src/store/** + query/**"]
  gen["scripts/generate-registry.mts"]
  genHooks["generate-hooks.mts"]
  genStores["generate-stores.mts"]
  reg["dist/registry.json"]
  bp["dist/blueprints.json"]
  hooks["dist/hooks.json"]
  stores["dist/stores.json"]
  baseline["agent-ready-baseline.json"]
  check["check:agent-ready"]
  smoke["registry.test.ts"]
  agent["LLM / agent"]
  app["Consumer app"]

  src --> gen
  blueprintsMd --> gen
  adapterSrc --> genHooks
  coreSrc --> genStores
  gen --> reg
  gen --> bp
  genHooks --> hooks
  genStores --> stores
  reg --> check
  bp --> check
  baseline --> check
  reg --> smoke
  reg --> agent
  bp --> agent
  hooks --> agent
  stores --> agent
  agent --> scaffold["write src/pages/&lt;Name&gt;.tsx + routes.ts entry"]
  scaffold --> verify["tsc --noEmit + eslint"]
  verify --> app
```

The artifacts an agent ultimately sees are: `registry.json`,
`blueprints.json`, `hooks.json`, `stores.json`, `USAGE.md` files, and
`*.example.tsx` files. Everything else is either authoring inputs
(source + tags) or quality gates. That JSON is the agent's source of
truth; the blueprints and docs just make it easier to navigate.

## The three tiers

Every public export carries a `@tier` tag that tells agents how to treat
it:

| Tier          | Who uses it                                                 | Requirements                                                                                                          |
| ------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `agent-ready` | The agent picks these first. Stable, documented, safe defaults. | JSDoc summary + `@category` + `@domain` + `USAGE.md` + `*.example.tsx`. If `@domain ≠ generic`, also `@kernelCapability`. |
| `advanced`    | Humans composing custom UIs. Works fine, but agents avoid unless asked. | JSDoc summary + `@category` + `@domain`.                                                                              |
| `internal`    | Implementation detail. Not exported to agents.              | Just `@tier internal`.                                                                                               |

A missing `@tier` is a hard failure — the contract check catches
untagged exports immediately.

## The artifacts

### 1. JSDoc on source

Every public export carries a small set of structured JSDoc tags:

- `@tier` — `agent-ready` | `advanced` | `internal`. The audience.
- `@category` — `charts`, `tables`, `cards`, … (free-form bucket).
- `@domain` — `mining-operations` | `financial-reporting` | `device-management` | `generic`.
- `@kernelCapability` — required on `agent-ready` exports; repeatable.

`agent-ready` exports additionally ship a co-located `USAGE.md` and
`*.example.tsx`. `advanced` exports get JSDoc only. `internal` exports
are hidden from the registry entirely.

The full contract — including paste-ready templates and the error
catalogue the CI gate emits — lives in
[`../packages/react-devkit/AGENT_READY.md`](../packages/react-devkit/AGENT_READY.md).

### 2. `dist/registry.json` (the discovery surface)

Generated by
[`scripts/generate-registry.mts`](../packages/react-devkit/scripts/generate-registry.mts)
on every build. Slim by design — ~250 KB for the current 240 components
+ 16 hooks (down from 3.2 MB before trimming).

What it contains, per entry (component or hook):

- `name`, `path`, `tier`, `description` (truncated to 200 chars),
  `category`, `domainContext`, `kernelCapabilities`.
- `props[]` (components) or `signature` (hooks). **Inherited standard props are
  intentionally excluded** — generic DOM/HTML/ARIA attributes and framework props
  such as `className`, `children`, `style`, `onClick`, `aria-label`, and native
  element attributes. Agents already know this surface, and emitting it per
  component would bloat the registry ~10x. Only props declared on the component's
  own `*Props` type are emitted; to surface a specific inherited prop (e.g. a Radix
  controlled-state prop), **re-declare it locally with JSDoc**.
  - **Consequence for `USAGE.md` (maintainers):** these standard props are absent
    from the registry *and* from the generated docs tables **by design**. `USAGE.md`
    must not hand-maintain a prop table for them; when a legacy USAGE prop table is
    migrated to JSDoc and stripped, its rows for these standard props are dropped
    deliberately — that is not a lost fact, it's the standard React/DOM surface.
    (Concrete current examples of intentionally-absent rows: `DialogContent.className`,
    `Label.className`, `Label.children`, `Tabs.className`, `Accordion.className`,
    `Accordion.children`, `TextArea.className`, `Typography.children` — all inherited
    via a Radix/DOM spread rather than declared on the component's own `*Props` type.)
- For `agent-ready`: `examples[]` (paths) and `usageDoc` (path).

It also ships O(1) **lookup indexes** so agents skip linear scans:

```jsonc
"indexes": {
  "componentsByName":          { "LineChartCard": 12, … },
  "componentsByCategory":      { "charts": [...], … },
  "componentsByDomain":        { "mining-operations": [...], … },
  "componentsByKernelCapability": { "hashrate-monitoring": [...], … },
  "componentsByTier":          { "agent-ready": [...], "advanced": [...] }
}
```

Schema lives in
[`registry-types.ts`](../packages/react-devkit/scripts/registry-types.ts);
the current version is `1.2.0`.

### 3. `dist/hooks.json` (adapter hook surface)

Generated by
[`packages/react-adapter/scripts/generate-hooks.mts`](../packages/react-adapter/scripts/generate-hooks.mts)
on every build. Covers every hook exported from
`@tetherto/mdk-react-adapter`, grouped by category:

| Category | What it contains |
| --- | --- |
| `store` | React bindings for the five Zustand singletons (`useAuth`, `useDevices`, …). |
| `utility` | Generic UI helpers (`usePagination`, `useLocalStorage`, `useWindowSize`, …). |
| `permission` | Auth-gate hooks (`useCheckPerm`, `useHasPerms`, `useIsFeatureEditingEnabled`). |
| `ui` | Domain-specific UI hooks (`useMinerDuplicateValidation`, `usePduViewer`, …). |
| `external` | Re-exported TanStack Query hooks (`useQuery`, `useMutation`, …). |

Also records the `MdkProvider` component (description + prop list) so
agents know what to import and how to configure the root wrapper.

Import directly: `require('@tetherto/mdk-react-adapter/hooks.json')`.

### 4. `dist/stores.json` (ui-foundation state surface)

Generated by
[`packages/ui-foundation/scripts/generate-stores.mts`](../packages/ui-foundation/scripts/generate-stores.mts)
on every build. For each Zustand store it captures: the singleton name,
category, description, factory name, state field types, and action
signatures. Also captures the TanStack Query helper signatures
(`authQuery`, `devicesQuery`, `telemetryQuery`, …).

Import directly: `require('@tetherto/mdk-ui-foundation/stores.json')`.

### 5. Blueprints (intent → recipe)

Curated Markdown recipes under
[`packages/react-devkit/blueprints/`](../packages/react-devkit/blueprints/README.md),
each with YAML frontmatter listing the components and hooks an agent
should reach for given a high-level intent. The generator parses these
and emits `dist/blueprints.json` with its own indexes (`byId`,
`byDomain`, `byKernelCapability`, `byComponent`).

V1 ships four blueprints:

| Blueprint                       | Use when…                                                       |
| ------------------------------- | --------------------------------------------------------------- |
| `mining-operations-dashboard`   | "Show me my miners" / live operator dashboard                   |
| `reporting`                     | "Monthly report" / CSV export / historical numbers              |
| `device-management`             | "Manage miners" / drill into one device                         |
| `custom-feature`                | The user's domain is out-of-scope for MDK (weather, inventory…) |

Blueprints are validated by `check:agent-ready`: every referenced
component must exist in the registry **and** be `tier: agent-ready` —
agents following a blueprint can never land on an advanced API.

### 6. The decision flow

Everything above is a plain file read — no tooling, no network, no model
calls. The deterministic path from intent to code:

```mermaid
flowchart TD
  intent["Plain-language intent"]
  bp["blueprints.json — scan `intent` fields"]
  match{"Matching blueprint?"}
  body["Read the blueprint's markdown `body`"]
  facets["registry.json — intersect `indexes`\n(byDomain / byKernelCapability / byCategory / byTier)"]
  state{"Needs state or data?"}
  hooks["hooks.json — adapter hooks"]
  stores["stores.json — stores + query helpers"]
  contract["Read the entry's `usageDoc` + `examples`"]
  scaffold["Write src/pages/&lt;Name&gt;.tsx\n+ routes.ts entry + nav icon"]
  verify["tsc --noEmit + eslint"]

  intent --> bp
  bp --> match
  match -- yes --> body
  match -- no --> facets
  body --> facets
  facets --> state
  state -- yes --> hooks
  state -- yes --> stores
  hooks --> contract
  stores --> contract
  state -- no --> contract
  contract --> scaffold
  scaffold --> verify
```

## How an agent uses it

Imagine a user says *"build me a mining dashboard with weather"*:

1. **Agent reads `dist/blueprints.json`** → high-level recipes
   (`mining-operations-dashboard`, `device-management`, `custom-feature`)
   that map intent → concrete components/hooks. "Weather" matches no
   mining blueprint, so it lands on `custom-feature`.
2. **Agent reads `dist/registry.json`** → O(1) lookup tables:
   `componentsByTier`, `componentsByDomain`, `componentsByKernelCapability`,
   `componentsByCategory`. Intersecting them narrows to the dashboard
   components the intent implies.
3. **Agent reads `dist/hooks.json` and `dist/stores.json`** to find the
   right React bindings (`useAuth`, `useDevices`, …) and what state and
   query helpers already exist.
4. **Agent reads each entry's `usageDoc` and `examples`** — the paths are
   in the registry entry, relative to the package root — so prop names and
   types are copied, never guessed.
5. **Agent writes the page** (`src/pages/<Name>.tsx` + a one-line
   `routes.ts` entry + a nav icon) and **verifies** with `tsc --noEmit`
   and `eslint`.
6. **Agent composes only `agent-ready` exports** by default. Advanced
   ones require an explicit user request.

Result: the agent never hallucinates props or imports — it pulls real
metadata, real examples, real types.

## The gates

The contract is kept honest by four automated gates. None of them are
new tooling on top of what already existed — they reuse the registry and
plug into the normal `fullcheck` / CI flow.

### Gate 1: `check:agent-ready`

Runs three steps in order:

1. **`build:registry`** — regenerates `dist/registry.json` and `dist/blueprints.json` from source
2. **[`check-registry-completeness.mts`](../packages/react-devkit/scripts/check-registry-completeness.mts)** — scans source directly for `@tier agent-ready` declarations and fails if any are absent from the registry. This closes the source-vs-registry drift gap: the registry generator walks the public barrel and can silently skip an export it cannot resolve, so source and registry can diverge without anyone noticing. Deliberate exceptions live in [`scripts/registry-completeness-exceptions.json`](../packages/react-devkit/scripts/registry-completeness-exceptions.json) — every exemption is an explicit, reviewable entry in the PR diff
3. **[`check-agent-ready.mjs`](../packages/react-devkit/scripts/check-agent-ready.mjs)** — the strict contract gate described below

The strict gate. Loads `dist/registry.json` and `dist/blueprints.json`,
applies the agent-ready contract rules, and compares against
[`agent-ready-baseline.json`](../packages/react-devkit/scripts/agent-ready-baseline.json).
It yells if:

- An export has no `@tier`.
- An `agent-ready` component is missing `USAGE.md` or `*.example.tsx`.
- An `agent-ready` non-generic component has no `@kernelCapability`.
- A blueprint references a non-existent or non-`agent-ready` component.
- Anything else drifts from the contract in
  [`AGENT_READY.md`](../packages/react-devkit/AGENT_READY.md).

The baseline lets pre-existing debt slide while strictly enforcing
**new** code:

- A violation **not** in the baseline → hard error (exit 1).
- A violation **in** the baseline → reported as debt, does not fail.
- The baseline can only ever shrink. Run with `--update-baseline` after
  fixing JSDoc / docs to reduce it.

This is what makes the contract "strict for new code, lenient for the
existing backlog of JSDoc gaps" — no flag-day refactor required. Today
the baseline is **empty**: zero violations, fully compliant.

### Gate 2: Registry smoke test

[`src/domain/specs/registry.test.ts`](../packages/react-devkit/src/domain/specs/registry.test.ts).
Asserts schema version, per-tier shape, presence of `agent-ready`
entries, no `internal` leakage, and that `componentsByName` indexes
point at the right entries. Catches generator regressions even when the
contract gate passes.

### Gate 3: `fullcheck`

```
npm run fullcheck
  ├─ npm run build              # builds packages + registry + blueprints
  ├─ npm run lint
  ├─ npm run typecheck
  ├─ npm run format
  ├─ npm run check:agent-ready  # the strict contract gate
  └─ npm run test:coverage      # includes the registry smoke test
```

### Gate 4: CI workflow

The `quality` job in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)
adds an "Agent-readiness contract" step that runs `check:agent-ready`.
PRs fail there if they introduce new violations.

## How to test it yourself

### 1. Smoke test the whole contract (30 seconds)

```bash
npm run build:registry --workspace @tetherto/mdk-react-devkit
npm run check:agent-ready --workspace @tetherto/mdk-react-devkit -- --no-baseline
```

Should print `0 violations`. If you delete a `USAGE.md` or strip a
`@tier` tag, it fails; try it.

### 2. Try it as an agent would

Every step is a file read against the built manifests — run this from the
UI workspace after `npm run build`:

```bash
node --input-type=module -e '
import registry from "./packages/react-devkit/dist/registry.json" with { type: "json" }
import blueprints from "./packages/react-devkit/dist/blueprints.json" with { type: "json" }
import hooks from "./packages/react-adapter/dist/hooks.json" with { type: "json" }
import stores from "./packages/ui-foundation/dist/stores.json" with { type: "json" }

// Find a curated recipe
console.log(blueprints.blueprints.map((b) => `${b.id}: ${b.intent}`))

// Discover the component layer, narrowed by facet
const { componentsByDomain: byDomain, componentsByKernelCapability: byCap } = registry.indexes
console.log((byDomain["mining-operations"] ?? []).filter((n) => (byCap["hashrate-monitoring"] ?? []).includes(n)))

// Discover the state layer
console.log(hooks.hooks.filter((h) => h.category === "store").map((h) => h.name))
console.log(stores.stores.map((s) => s.name), stores.queryHelpers.map((q) => q.name))

// Read a component contract — usageDoc + examples are package-relative paths
const entry = registry.components[registry.indexes.componentsByName.LineChartCard]
console.log(entry.usageDoc, entry.examples, entry.props.map((p) => p.name))
'
```

Then verify generated code the way CI does: `npx tsc --noEmit` and
`npx eslint <file>`.

### 3. Prove the gate works (negative test)

Temporarily remove a tag and re-run the check:

```bash
# In any agent-ready component, delete its `* @tier agent-ready` line, then:
npm run check:agent-ready --workspace @tetherto/mdk-react-devkit -- --no-baseline
# → should fail with `missing-tier` or `agent-ready-missing-usage`.
# Revert and re-run to confirm green again.
```

### 4. Verify full repo health

```bash
npm run fullcheck
```

Runs build + lint + typecheck + format + `check:agent-ready` +
test:coverage. If this is green, the repo is shippable and agent-ready.

### 5. Eyeball the registry

After `npm run build` (or
`npm run build:registry --workspace @tetherto/mdk-react-devkit`), open
`packages/react-devkit/dist/registry.json` on disk (not committed —
generated output). In a consuming app, load
`@tetherto/mdk-react-devkit/registry.json` instead. Look at:

- `indexes.componentsByTier["agent-ready"]`: the components an agent
  picks from first.
- `indexes.componentsByDomain`: grouped by `@domain`
  (`mining-operations`, `financial-reporting`, `device-management`,
  `generic`, …).
- `indexes.hooksByDomain`: grouped hooks by domain.

That JSON is the agent's source of truth. Everything else (blueprints,
docs) just makes it easier to navigate.

## Glossary

- **Tier** — audience classification on every public export
  (`agent-ready` / `advanced` / `internal`). Drives the registry's
  `componentsByTier` index, the CI gate, and `USAGE.md` / example
  requirements.
- **Kernel capability** - Kernel (Orchestration Kernel) capability identifier
  (`hashrate-monitoring`, `incident-alerts`, …). Lets an agent filter
  the registry to the capabilities a given site exposes.
- **Domain** — mining business area
  (`mining-operations`, `financial-reporting`, `device-management`,
  `generic`).
- **Blueprint** — curated Markdown recipe mapping a user intent to a
  concrete set of `agent-ready` components and hooks.
- **Agent-ready** — a component or hook stable and well-documented
  enough that an LLM can pick it directly when generating code. Ships
  JSDoc, `USAGE.md`, and a runnable example.

## Where to go next

| If you want to…                                          | Read                                                                                                                |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Contribute or tier a new component                       | [`../packages/react-devkit/AGENT_READY.md`](../packages/react-devkit/AGENT_READY.md)                                |
| Author a new blueprint                                   | [`../packages/react-devkit/blueprints/README.md`](../packages/react-devkit/blueprints/README.md)                    |
| Consume MDK from an app (or wire an agent into one)      | [`../AGENTS.md`](../AGENTS.md) — the manifests and how to read them                                                 |
| Understand the registry generator internals              | [`../packages/react-devkit/scripts/generate-registry.mts`](../packages/react-devkit/scripts/generate-registry.mts)  |
| Understand the build & monorepo layout                   | [`ARCHITECTURE.md`](ARCHITECTURE.md), [`BUILD.md`](BUILD.md)                                                         |

# Run the `mdk-ui-shell` template end-to-end

End-to-end recipe for running the **MDK UI Shell** Operations Dashboard
locally, against a local
[`mdk-gateway`](../../backend/core/gateway/README.md)
backend, which ships in this repo at [`backend/core/gateway`](../../backend/core/gateway/README.md).
The frontend is scaffolded with one CLI command.

You can run it two ways, with or without authentication:

- **[Without sign-in](#run-it-without-sign-in)** — where to start. Two edits to
  the scaffolded app and the dashboard loads against your Gateway.
- **[With Google sign-in](#add-google-sign-in)** — needs your
  [identity plugin](../../docs/guides/gateway/plugins.md) you write. Do this when you
  need real sessions.

> **Audience:** community developers evaluating MDK, contributors writing
> demos, LLM agents bootstrapping a similar dashboard. If you're already
> deep inside the production MDK system, you don't need this section.

## Shell setup — TL;DR

```bash
# Backend (one-time setup) — the Gateway ships in this repo
cd backend/core/gateway
./setup-config.sh
npm install
npm start                          # http://localhost:3000

# Frontend (this is the part MDK provides)
cd <somewhere-outside-the-backend>
cp -R <mdk-repo>/examples/mdk-ui-shell-template my-dashboard
cd my-dashboard
npm install
cp .env.example .env
npm run dev                        # http://localhost:3030
```

Open `http://localhost:3030` and the app redirects to `/signin`, because the
shell is built around a session it has no way to obtain yet. Pick
[Run it without sign-in](#run-it-without-sign-in) or
[Add Google sign-in](#add-google-sign-in).

## Auth in this shell — what ships

The Gateway is a plugin host with no API of its own, and no built-in auth or
OAuth2 facilities. That has two consequences here:

- **No OAuth implementation ships.** Sign-in is a Gateway plugin you write.
  `@tetherto/mdk-plugin-auth` is bundled but unwired, and it consumes a token
  rather than issuing one.
- **The Gateway does not validate tokens.** Plugin routes can declare
  `"auth": true`, but nothing enforces it — a controller gets no injected
  identity layer to check against. An unauthenticated frontend talks to it
  fine, which is what makes [running it without sign-in](#run-it-without-sign-in) work.

The frontend half is all present — the auth seam (`AuthProvider`,
`gatewayRedirectAuth`, `MdkProvider`'s `auth` prop), `<SignInGoogleButton>`,
`RequireAuth`, `useAuthToken`, `useTokenPolling`, `authStore`. It is waiting
on a backend that completes the redirect contract described under
[add Google sign-in](#add-google-sign-in).

## Run it without sign-in

Set `VITE_AUTH_BYPASS=true` in `.env` (the template's `.env.example` ships it
already set) and restart the dev server. [`router.tsx`](../../examples/mdk-ui-shell-template/src/router.tsx) then renders the app
directly instead of behind `<RequireAuth>` (see its `AUTH_BYPASS` comment),
and [`main.tsx`](../../examples/mdk-ui-shell-template/src/main.tsx) seeds `authStore` with a stub token so token-reading
components render (see its "Dev-only auth bypass" comment). `useTokenPolling`'s
refresh cadence is disabled for this stub session in [`App.tsx`](../../examples/mdk-ui-shell-template/src/App.tsx).

Never carry this past local evaluation: the stub token is sent as a real
`Authorization` header, and the Gateway does not check it.

The dashboard then loads against the Gateway. Write affordances (vote, submit,
cancel, comment) may still be inert, since nothing has granted a permission set.

## Add Google sign-in

Two pieces: a Google OAuth client, and the identity plugin that uses it.

### Step 1: Register a Google OAuth client

The backend doesn't ship usable credentials by default. You need a fresh
Google OAuth 2.0 client.

1. Open <https://console.cloud.google.com/apis/credentials> (sign in with
   the Google account you'll be testing with).
2. **Create credentials** → **OAuth client ID**.
3. Application type: **Web application**.
4. **Authorised redirect URIs** — add the callback URL your identity plugin
   serves (step 2). The path is yours to choose; the conventional one, with
   the Gateway on its default port, is:
   ```
   http://localhost:3000/oauth/google/callback
   ```
5. Hit **Create**. Copy the **Client ID** and **Client secret**.
6. If this is your first OAuth client in this Google Cloud project,
   Google prompts you to configure an "OAuth consent screen". Pick
   **External** + **Testing**. Add your own email under "Test users" so
   you can sign in.

Step 2 hands these to your identity plugin.

### Step 2: Supply the identity plugin

MDK ships no OAuth implementation, so this is the part you write. Mount it with
`startGateway({ extraPluginDirs: [...] })`; the
[plugin authoring guide](../../docs/guides/gateway/plugins.md) covers the
manifest and controller contract.

The frontend only requires that plugin to honour two ends of a redirect:

- a **start endpoint** at `${VITE_OAUTH_BASE_URL}/oauth/google`, which
  `<SignInGoogleButton>` navigates to;
- a **return redirect** to the frontend carrying the token as
  `?authToken=<jwt>` — `http://localhost:3030/?authToken=…` on the MDK UI
  Shell default port. `gatewayRedirectAuth()`'s `bootstrap`, run by
  `MdkProvider` on mount, captures it and scrubs it from the address bar;
  `useTokenPolling` then refreshes it before it expires.

Everything else — which provider, where the client id and secret live, who
counts as an allowed user — is your plugin's business.

Restart the Gateway with the plugin mounted. The template needs no change:
`gatewayRedirectAuth()`'s `bootstrap` already captures the returned
`?authToken=` into `authStore` and scrubs it from the address bar, and
`useTokenPolling` refreshes it before expiry.

> **No-CORS reality:** the backend has no CORS plugin. All API calls must
> go through a same-origin proxy. The MDK UI Shell Vite config already
> proxies `/auth`, `/oauth`, `/api`, and `/pub` to
> `http://localhost:3000` — keep them aligned.

## Scaffold and start MDK UI Shell

Needed for either path. From a directory **outside** the backend repo:

```bash
# Option A — the root MDK CLI stands the template up alongside a stack:
npx @tetherto/mdk-cli create dashboard my-dashboard

# Option B — copy the template and run it in place. It is a real Vite app,
# not a scaffold-only tree:
cp -R <mdk-repo>/examples/mdk-ui-shell-template my-dashboard
cd my-dashboard && npm install
```

With option B, point the three `@tetherto/mdk-*` dependencies in
`package.json` at your local monorepo (`file:` paths) if you are working
against an unpublished checkout.

Then:

```bash
cd my-dashboard
cp .env.example .env
# Defaults already point at http://localhost:3000 — change only if you
# moved the backend.
npm run dev
```

Open `http://localhost:3030`. On the no-sign-in path the dashboard renders
straight away. With sign-in wired, click **Sign in with Google** and use an
account your identity plugin allows: you land back at `/?authToken=…`, the FE
extracts the token, strips it from the URL, and shows the dashboard.

## Known limitation — no data without miners

`@tetherto/mdk-gateway` is the **API surface**, not the data producer. It
relays data from Kernel (orchestrator) clusters with real mining hardware.
**Without that data flowing, the dashboard renders empty states.**

This is the expected first-run experience for someone evaluating MDK. The
empty states are intentional — the dashboard tells the truth about "no
data" rather than synthesizing mock telemetry.

If you need to exercise the charts:

- Run the backend's integration test harness (see
  [`backend/core/gateway/tests/integration/`](../../backend/core/gateway/tests/integration/)) — it stubs Kernel clusters with
  mock data.
- Or write a small fixture loader that POSTs telemetry into the backend's
  SQLite DB.

Both are out of scope for this guide and for the MDK UI Shell template.

## Troubleshooting

### Sign-in redirect lands at the wrong port

The redirect your identity plugin sends the token to doesn't match the FE port.
MDK UI Shell's [`vite.config.ts`](../../examples/mdk-ui-shell-template/vite.config.ts) defaults to **3030**. Change one side to
match the other.

### Every API request returns 401

The backend issued a token but doesn't recognize it on subsequent calls.
Common causes:

1. Your Google email isn't on your identity plugin's allowed-users list.
2. The backend's auth-cache TTL is < the FE polling interval — restart the
   backend after changing it.
3. Token TTL is too short — the backend default is 300 s;
   `useTokenPolling` refreshes at 250 s so this should never happen on a
   healthy backend.

### CORS errors in the browser console

The Vite proxy isn't catching your requests. Don't call the backend
directly (`fetch('http://localhost:3000/...')`); use the data hooks,
which read base URL from the `<MdkProvider apiBaseUrl>` you set in
[`main.tsx`](../../examples/mdk-ui-shell-template/src/main.tsx). If you've changed the FE port, make sure the proxy in
[`vite.config.ts`](../../examples/mdk-ui-shell-template/vite.config.ts) still covers all four paths (`/auth`, `/oauth`, `/api`,
`/pub`).

### Charts are empty

You're hitting the "no miners reporting" reality above. The dashboard is
working correctly — the data source just doesn't have anything to show.
Inspect a chart query in the Network tab: it'll succeed with `[[]]`
(empty inner array).

## What lives where

```
mdk monorepo                            # This repo
 ├── backend/core/gateway/              # The Gateway — serves the routes below
 │    ├── /auth/...                     # All authenticated endpoints
 │    ├── /oauth/google                 # OAuth start
 │    └── /oauth/google/callback        # OAuth callback → FE w/ ?authToken=
 ├── ui/packages/ui-foundation/         # API contracts + mappers + Bearer fetch
 ├── ui/packages/react-adapter/         # Data hooks + auth hooks
 ├── ui/packages/react-devkit/          # Chart components + RequireAuth + dashboard widgets
 └── examples/mdk-ui-shell-template/    # The runnable app template — what `create` produces

your scaffolded app                     # What you cd into to run `npm run dev`
 ├── src/main.tsx                       # MdkProvider wiring
 ├── src/App.tsx                        # Shell + useTokenPolling
 ├── src/pages/SignIn.tsx               # Google button
 ├── src/pages/Dashboard.tsx            # The ~70-line reference composition
 └── vite.config.ts                     # Proxy + port 3030
```

For the architecture rules governing how the template composes packages
(and what *not* to do when extending), read the template's own
[`USAGE.md`](../../examples/mdk-ui-shell-template/USAGE.md) — it's the source-of-truth assembly contract.
