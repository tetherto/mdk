---
name: mdk-docs-style
description: Router for MDK docs-authoring rules in this repo. Use whenever writing or editing docs/**/*.md, any README.md (root or package-level), any backend/**/docs/**/*.md or ui/**/docs/**/*.md file (existing or newly created), props/hooks tables, doc links, reference-style link definitions or admonitions on portable pages, AGENT_READY.md/USAGE.md, or handling a QA finding during docs work.
---

# MDK docs style guide (router)

The rules live in [`docs/reference/maintainers/style.md`](../../docs/reference/maintainers/style.md). Read it before authoring or editing:

- `docs/**/*.md` (the root docs tree)
- Any `README.md`
- Any `backend/**/docs/**/*.md` or `ui/**/docs/**/*.md` 

Don't store style rules here.

## Read in addition, by task

- Adding or editing a reference-style link definition (`[slug]: …`), or an admonition on a page that might be ported to `tether.io`: [single-source-of-truth.md](../../docs/reference/maintainers/single-source-of-truth.md), the routing-comment vocabulary the port pipeline reads
- Editing `AGENT_READY.md` or `USAGE.md` in a package's `docs/`: [`style.md`](../../docs/reference/maintainers/style.md) governs the prose, but [`agent-ready-sdk.md`](../../docs/reference/maintainers/agent-ready-sdk.md) governs the required contract structure; read both
- Editing a page with a marked generated region (for example the props section of [`accordion/USAGE.md`](../../ui/packages/react-devkit/src/primitives/components/accordion/USAGE.md), between its `<!-- BEGIN GENERATED: … -->` / `<!-- END GENERATED … -->` markers): never hand-edit inside the markers; regenerate with the documented script instead (that file: `npm run generate:usage-proptables` from the repo root)

## Note on existing content

Existing READMEs and package docs predate this scope apply [`style.md`](../../docs/reference/maintainers/style.md) going forward on pages you touch; don't mass-rewrite existing files unprompted.

## Hard constraints

- Don't touch historical files e.g. [`CHANGELOG.md`](../../CHANGELOG.md), release notes, or `package.json`, `node_modules`, or lock files without explicit approval
- "Hands off by default" is not "exempt from style". When you *do* edit [`CHANGELOG.md`](../../CHANGELOG.md) or release notes with approval (e.g. cutting a release via the `changelog` skill), [`style.md`](../../docs/reference/maintainers/style.md)'s prose rules still apply — including the 150–180 char line length (tables and fenced code exempt)
