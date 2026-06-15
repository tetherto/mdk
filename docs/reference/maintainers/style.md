Style guide for MDK


Context: globs: docs/**/*.md

# Style

US English
Bullet lists no stop  (- Avalon not - Avalon.)
Numbered lists stop
Diataxis ia
No positional references ("Swap the filename for any other model from the table” NOT "Swap the filename for any other model from the table above,”)
No --- divider, use headings H1, H2, H3 etc to impose structure

## Frontmatter and linking strategy

Links are from relevent text NOT "see ..." (do "The [Worker install pattern][install-pattern] defines the per-Worker mechanics." NOT "See the Worker [install pattern][install-pattern] for the per-Worker mechanics.")

Ask maintainer if the page you are building is to be ported to `tether.io`, if so follow reference-style link definitions plus routing comments:

/mdk-prv/docs/reference/maintainers/port-signals.md

## Fixed sections, in order

1. `## Overview` — one paragraph or `## How it works`+ "This page ...
2. `## Next steps` — bullet list, each item `Description — [link](path)`

## Admonitions

- `> [!NOTE]` — context, side info
- `> [!IMPORTANT]` — common failure modes and their fix
- `> [!WARNING]` — security or destructive action

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

1. `> [!NOTE]` linking to prerequisite concepts (if needed)
2. `## Overview` — one paragraph + "What you'll have at the end" bullet list + orienting sentence pointing at the example
3. `## Prerequisites` — plain bullet list (`- Tool vX`)
4. `<Steps>` … `</Steps>` — all numbered steps
5. `## What just happened` — numbered list, **bold term** then explanation
6. `## Cleanup` — how to stop and remove state
7. `## Next steps` — bullet list, each item `Description — [link](path)`

## Steps structure

```md
<Steps>

<Step>

### Step title

#### N.M Sub-step title

content

</Step>

</Steps>
```

- `###` for each `<Step>` title — no "Step N:" prefix (component numbers automatically)
- `####` for sub-steps — keep the `N.M` prefix
- Optional steps: `### (Optional) Title`

## Admonitions

- `> [!NOTE]` — context, side info
- `> [!IMPORTANT]` — common failure modes and their fix
- `> [!WARNING]` — security or destructive action

## Code blocks

- Always fenced with language tag (`bash`, `js`, etc.) except terminal session output which uses plain ` ``` `
- Expected output blocks are plain ` ``` ` with a preceding "Expected output" sentence
