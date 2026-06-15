# MDK Blueprints

A blueprint is a curated recipe that answers **"I want to build X — what do I use?"**.
Each `.md` file in this folder defines one blueprint: structured frontmatter for
machines, prose for humans and LLMs.

Blueprints are indexed into `dist/blueprints.json` by the registry generator and
exposed via the `mdk-ui blueprint`, `mdk-ui blueprints`, and `mdk-ui suggest`
CLI commands.

## Authoring a blueprint

1. Pick an `id` (kebab-case). Create `<id>.md`.
2. Write the frontmatter (between `---` markers):

   ```yaml
   id: my-blueprint
   title: My Blueprint
   intent: >
     One-paragraph summary of the user goal this blueprint covers.
   domain: mining-operations          # one of: mining-operations | financial-reporting | device-management | generic
   orkCapabilities:
     - hashrate-monitoring
   components:
     - ComponentName                  # MUST be `agent-ready` and exist in registry.json
     - AnotherComponent
   hooks:
     - useExampleHook                 # OPTIONAL — must exist in registry.json
   demoRoute: /some/demo/route        # OPTIONAL — points at the demo-app implementation
   ```

3. Below the frontmatter, write three sections (in order):
   - **When to use** — one paragraph.
   - **Page composition** — a ~30-line TSX snippet importing only from `@tetherto/mdk-react-devkit`.
   - **State / data flow** — which hooks are wired, where `<MdkProvider>` lives, side-effect points.

## CI validation

`check:agent-ready` validates every blueprint: each referenced component must
exist in the registry **and** be `tier: agent-ready` (so LLMs following the
blueprint never land on an advanced surface). Referenced hooks just need to
exist (any tier).
