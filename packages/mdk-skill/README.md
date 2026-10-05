# @tetherto/mdk-skill

The **MDK Developer Skill suite**: version-controlled procedural context, in
the universal Agent Skills format (`SKILL.md`), that makes any
skills-compatible coding agent (Cursor, Claude Code, …) fluent in MDK
conventions the moment the repo is cloned.

The suite ships six flat skills: the `mdk` router plus full workflows for
device Workers, Gateway plugins, UI pages, stack deployment, and site sizing
from a measured envelope. Composite prompts (e.g. "create a UI to show
\<metric\> for \<device family\>") are routed as an ordered chain in
[`mdk/SKILL.md`](./src/skills/mdk/SKILL.md).

## Layout

```text
src/
├── skills/                 # Suite content (flat: one dir per skill), hand-authored except where noted
│   ├── mdk/                # Router + suite-wide references/
│   ├── mdk-worker-plugin/  # Worker plugin workflow + scripts/assets
│   ├── mdk-gateway-plugin/ # Gateway plugin workflow (scaffold via `mdk create plugin`)
│   ├── mdk-ui-component/   # Dashboard page workflow + ui-registry (generated)
│   ├── mdk-deployment/     # mdk.yaml / mdk run workflow
│   └── mdk-site-sizing/    # Size a site from a description + measured envelope
├── sources.map.json        # Source-of-truth -> bundle mapping (contract schema comes from backend/core/mdk-worker)
├── index.mjs               # Programmatic entry point (assemble / installSkills)
├── index.d.ts              # TypeScript types for the entry point
├── assemble.mjs            # CLI wrapper -> dist/skills/
└── install.mjs             # CLI wrapper: dist/skills/* -> .cursor|.claude/skills/
dist/skills/                # Assembled suite — build output, gitignored, never hand-edited
```

[`skills/mdk-ui-component/references/ui-registry.json`](./src/skills/mdk-ui-component/references/ui-registry.json) is generated, not hand-authored. It is a verbatim copy of the devkit's
`dist/registry.json`, written by [`docs/scripts/sync-ui-registry.mjs`](../../docs/scripts/sync-ui-registry.mjs). Regenerate it with
`npm run generate:ui-registry` from the repo root, which rebuilds the devkit registry and rewrites this file. Hand-edits do not survive the next run,
and a stale copy tells coding agents to use component props that no longer exist. The
`docs-freshness` workflow watches this file and its devkit source on PRs and
fails the check when it drifts. The job summary shows what differs; fix it by running `npm run generate:ui-registry` (or
`npm run regenerate-docs`) and committing the result.

Skills are assembled and installed **flat** — clients discover
`<skills-dir>/<name>/SKILL.md` one level deep, and each skill's `description`
frontmatter is its routing trigger. Copied artifacts (the Worker template, the
contract schema) are taken from their owning packages by [`assemble.mjs`](./src/assemble.mjs), never
hand-maintained, so the bundle cannot drift from the source of truth.

## Build and install

```bash
node src/assemble.mjs        # build dist/skills/ (also runs on npm prepack)
npm run install:skills       # assemble + copy into the enclosing repo's
                             # .cursor/skills/ and .claude/skills/ (gitignored)
node src/install.mjs --client cursor   # one client only
```

## Programmatic API

Consume the package (e.g. from the MDK CLI) instead of shelling out to the
scripts. Resolution goes through node/npm, so it works both as a published
dependency and as a local workspace package.

```js
import { installSkills } from '@tetherto/mdk-skill'

// Copies the assembled skills into <target>/.cursor/skills and/or
// <target>/.claude/skills. Assembles on demand inside the monorepo.
const { skills, installed } = installSkills({ client: 'all', target: process.cwd() })
```

Also exported: `assemble()`, `isAssembled()`, `canAssemble()`, and `CLIENT_DIRS`.

## Try it — routing prompts

Open the repo in a skills-aware agent after installing, then check that each
prompt activates the matching skills:

| Example prompt                                              | Skills it should invoke           |
| ----------------------------------------------------------- | ----------------------------------- |
| "Add a new power meter Worker for our site"                 | `mdk-worker-plugin`                 |
| "I need to integrate a new miner device into MDK"           | `mdk-worker-plugin`                 |
| "Author an mdk-contract.json for a temperature sensor"      | `mdk-worker-plugin`                 |
| "Build a plugin that aggregates hashrate across all miners" | `mdk-gateway-plugin`                |
| "Add a cross-Worker endpoint that rolls up a site summary"  | `mdk-gateway-plugin`                |
| "Create a dashboard widget that shows live telemetry from a Worker" | `mdk-ui-component` (and `mdk-gateway-plugin` if no `/api` route yet) |
| "Create a UI to show \<metric\> for \<device family\>"      | discover → `mdk-gateway-plugin` → `mdk-deployment` → `mdk-ui-component` |
| "How do I deploy the MDK stack?"                            | `mdk-deployment`                    |
| "Size this site: 80 Whatsminer M56S on a 16-core NVMe box"  | `mdk-site-sizing`                   |
| "What is MDK and how is it structured?"                     | `mdk` (router)                      |

## Verify the device-Worker skill

```bash
# contract validation (exit 0/1); add --schema-only to skip the semantic checks
node dist/skills/mdk-worker-plugin/scripts/validate-contract.mjs \
  packages/cli/templates/worker/mdk-contract.json

# in-process smoke: telemetry sweep + command bounds, no Kernel, no DHT
node dist/skills/mdk-worker-plugin/scripts/worker-smoke.mjs <worker-dir>
```

The end-to-end proof of the skill is scaffolding a new Worker from
[`dist/skills/mdk-worker-plugin/SKILL.md`](./src/skills/mdk-worker-plugin/SKILL.md) alone — contract validation, smoke
pass, and brittle unit tests all green before the Worker ever meets a Kernel.

## Verify the site-sizing skill

```bash
# compile eval/profiles into references/envelope.json, then the held-out bar
npm test --workspace=@tetherto/mdk-skill
```

The bar: the Skill's recommendations match the measured envelope on a held-out
set of site descriptions. `eval-held-out.mjs` parses each case in
[`src/skills/mdk-site-sizing/eval/held-out.json`](./src/skills/mdk-site-sizing/eval/held-out.json)
and exits 0 only when every recommendation matches.
