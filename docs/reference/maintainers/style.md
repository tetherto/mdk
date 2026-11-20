Style guide for MDK

Context: globs: docs/**/*.md, **/README.md, backend/**/docs/**/*.md, ui/**/docs/**/*.md, packages/mdk-skill/src/skills/**/*.md

`**/README.md` means every README in the repo, at any depth (root, package-level, or a nested package like
`backend/workers/miners/README.md`), not only ones under `docs/` or docs-adjacent locations.

# Style

- US English
- Serial comma before the last item of a list: "Kernel, Workers, and Gateway", not "Kernel, Workers and Gateway". Vale flags
  most misses with `Google.OxfordComma` (`.vale.ini`); a list of longer phrases can slip past it.
- Sentence case headings (first word and proper nouns only)
- Proper nouns for MDK components, capitalize in prose (plurals too): Gateway, Worker, Worker Plugin, Kernel
- Present tense, direct voice (e.g. "This page walks through…", not "This page will walk through…")
- No archeology: describe current behavior only, as if the software always worked this way. No "used to", "was
  renamed from", "previously fell back to", "as of vX.Y" or other before/after framing in prose, tables or
  admonitions. Change history belongs in `CHANGELOG.md`.
- Code identifiers in backticks (package names, file names, function names, etc.)
- Name a CLI command in full, binary included, even in passing: `mdk create app`, not `create app`. Readers copy what is in
  backticks, and a bare subcommand fails with `command not found`. Arguments named on their own stay bare (`kernel` as an
  `mdk run` target, `--strict`).
- In a code block that runs the CLI another way (`node "$CLI" create app`), comments match that block's invocation.
- Title lives in frontmatter only; don't repeat it as an H2
- Restrict line length to ~150 chars (context is prose; tables are an exception)
- Bullet lists: single-sentence bullet no stop (e.g. `- Avalon` not `- Avalon.`); compound/multi-sentence bullet, stop after every sentence including the last
- Numbered lists stop (e.g. 1. Do this action.)
- Diátaxis IA
- No positional references ("Swap the filename for any other model from the table" NOT "Swap the filename for any other model from the table above,")
- No --- divider, use headings H1, H2, H3 etc to impose structure
- No em dash; people may use those, not llms
- Prose says allowlist, never whitelist; a backticked code identifier (`auth.whitelist`, `hrpc.whitelist`) keeps the API's real name
- Colons go **outside of bullets**: as this example is written, notice bullet NOT emdash

## Frontmatter and linking strategy

Links are from relevant text NOT "see ..." (do `The [Worker install pattern][install-pattern] defines the per-Worker mechanics.` NOT `See the Worker [install pattern][install-pattern] for the per-Worker mechanics.`).

The link text is the concept or action being described, never the page name or location.

If a file is being referenced also link to it (do [`README.md`](../../README.md) Not `README.md`), including in skill files, so agents link only to files that exist. A backtick with no repo target stays unlinked.

Mechanically:

- Start the bullet with a verb phrase ("Understand...", "Learn how...", "Choose a...", "Start...")
- Wrap the concept or outcome in the link: the thing the reader learns or does

Ask maintainer if the page you are building is to be ported to user docs `tether.io`, if so follow reference-style link definitions plus routing comments [porting signals](single-source-of-truth.md).

## Fixed sections, in order

1. `## TL;DR` (optional): only when the page's core fact fits in a few lines. Comes before `## Overview` when present.
2. `## Overview`: one paragraph, or `## How it works` followed by a sentence starting "This page ..."
3. `## Next steps`: bullet list, each item `[Label](path): description` (no bold, no em dash)

## Tables for enumerable facts

Ask "could this be a table?" for any list or passage that maps 2+ items to the same set of attributes (flags, routes,
errors, fields, safety/annotation values). If yes, use a table; leave genuine narrative prose alone.

- Cell punctuation: a single-sentence cell gets no trailing stop; a cell with more than one sentence gets a stop
  after every sentence, including the last (same rule as bullet lists above).
- Error codes: one table per package, next to the code that throws them, not centralized in one monorepo-wide doc (a
  centralized error reference drifts from the source that throws it). Canonical columns: `Code | Fires when | Fix` —
  no separate `Meaning` column; state the general condition and, if there's more than one specific trigger, enumerate
  them in the `Fires when` cell rather than splitting into a fourth column.
- Errors an HTTP caller receives on any app route are the exception: they are
  [declared once and generated](single-source-of-truth.md#http-api-references), never tabled by hand.
- API surfaces: a public API surface is documented from its declaration, in the owning package's reference, and generated
  where a structured source exists, such as the [HTTP API references](single-source-of-truth.md#http-api-references). The prose
  that describes an operation lives in the declaration (a route's `description`), where review checks it against the code. Guides
  link to the owning reference rather than copying its table, and skills route to the same source.
- Behavior mappings (an input value or declared field mapped to the resulting behavior, e.g. a route's `safety`
  value mapped to its MCP tool annotations): a table with the input in the first column, the resulting behavior in
  the last.
- Verify every row against the actual source (the function/config it describes) before writing it, and again after
  any later style-only edit to the table (a prose-to-table conversion can silently merge or drop a distinct case).

## Tables sizing

Favor the ease of the person reading tables by aligning as many columns as possible to fit to a standard
screen size. Where rows can't be accommodated due to their length, allow the overflow:
1. Compute each cell's width (content + 1 space padding each side).
2. Find the width of the largest, readable column — call it the natural width.
3. Pad the header, separator, and every cell that's close to/under the natural width up to that width (full alignment).
4. A cell that's a clear outlier — meaningfully longer than the natural width (a long union type, a long sentence) — is left with just single-space padding and not forced to stretch the column. It doesn't drag the rest of the column wider, and the rest of the column doesn't try to stretch to meet it either.
5. This means the "aligned width" itself is data-driven (the majority cluster's width), not a fixed constant.

## Admonitions

- `> [!NOTE]`: context, side info
- `> [!TIP]`: an easier or optional way to do something
- `> [!IMPORTANT]`: common failure modes and their fix
- `> [!WARNING]`: security or destructive action
- `> [!CAUTION]`: a risk or pitfall that falls short of WARNING but still needs the reader's care

## Directory layout

Box-drawing tree (`├──`, `│`, `└──`), root name first, nested dirs indented, inline `#` comment
per entry. See `backend/core/gateway/README.md`'s `## Directory layout` for the reference shape.

## Samples that another file owns

A sample `package.json`, config file or command snippet often restates a file this repo already owns: a CLI
template, a generated manifest, another package's reference. The owning file is the single source of truth, so a
page carries only the part it teaches and links the owner for the rest.

- Show the fields, flags or rows the page itself adds, and link the owning file from the sentence that introduces
  the sample (a reference-style definition with its port signal on a page that ports)
- Never restate a pinned version, a dependency list or a generated table another file carries. A copy drifts the
  moment the owner changes, and a reader cannot tell which one is current
- When a copy has drifted, remove the duplication rather than syncing the values. Syncing re-drifts at the next
  release, so the page keeps its delta and the owner keeps the rest
- A deliberate superset is fine when the page says what it adds and to what. [Build a third-party
  Worker](../../guides/workers/build-a-worker.md) adds a lint and test setup over the `mdk create worker`
  template manifest, and shows only that

## Code blocks

- Always fenced with language tag (`bash`, `js`, etc.) except terminal session output which uses plain ` ``` `
- Expected output blocks are plain ` ``` ` with a preceding "Expected output" sentence

## Tutorial style

Inherits from above

description: Style guide for MDK tutorials
context: globs: docs/tutorials/**/*.md

## Frontmatter

```yaml
title: Verb-first, outcome-focused title
description: From X to Y in Z minutes
docs@tether_slug: tutorials/<path>/
```

## Fixed sections, in order

1. `> [!NOTE]` linking to prerequisite concepts (if needed).
2. `## Overview`: one paragraph + "What you'll have at the end" bullet list + orienting sentence pointing at the example.
3. `## Prerequisites`: plain bullet list (`- Tool vX`).
4. `<Steps>` … `</Steps>`: see [Steps structure](#steps-structure).
5. `## What just happened`: numbered list, **bold term** then explanation.
6. `## Cleanup`: how to stop and remove state.
7. `## Next steps`: bullet list, each item `[Label](path): description` (no bold, no em dash).

## Steps structure

```md
<Steps>

<Step>

### Step title

#### N.M Sub-step title

content

#### A Alternative sub-step title

content, only when sub-steps are a choice rather than a sequence

</Step>

</Steps>
```

- `###` for each `<Step>` title: no "Step N:" prefix (component numbers automatically)
- `####` for sub-steps: keep the `N.M` prefix when they run in sequence (do N.1, then N.2); switch to
  `A`/`B`/`C` when they're alternatives (do A **or** B, never both) — a reader should never read a
  number and infer an order that isn't there
- Optional steps: `### (Optional) Title`
