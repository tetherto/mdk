# Port signals

Authoring conventions for the comment-driven hints that travel with Markdown in this monorepo and drive the future port pipeline to [https://docs.mdk.tether.io/](https://docs.mdk.tether.io/).

This file is the source-of-truth for that vocabulary. Two consumers read it:

- The `check:port-signals` lint gate (see [`ia.md`](ia.md#qa-gates)) — runs in mdk-prv pre-commit / CI and warns when a non-anchor link definition has no routing comment.
- The port-sync transforms in the downstream fumadocs build — rewrite link targets and convert GFM alerts to `<Callout>` JSX on port.

Authoring rule: add the appropriate comment beside each cross-reference or alert. Authors do not need to read this file to write user-facing prose; the only time you need it is when adding a new `[slug]: …` definition or callout block.

## Link slug routing

Reference-style link definitions in `## Links` blocks (or anywhere in Markdown) carry an adjacent HTML comment that tells the port pipeline how to handle the target:

| Comment on the lines immediately below `[slug]: …` | Pipeline action |
|---|---|
| `<!-- docs@tether.io: <slug> → <upstream-path> -->` | Rewrite target to the upstream docs path on tether.io |
| `<!-- docs@tether.io: external link — preserve URL -->` | Keep the URL verbatim (non-Tether external URL) |
| `<!-- docs@tether.io: no parity link -->` | Drop the link; render anchor text as plain text and emit a build warning |
| `<!-- mdk-monorepo: <note> -->` | Internal-only flag (e.g. temp link awaiting a code/README destination); pipeline ignores entirely |
| _(no comment) on `[slug]: #anchor`_ | In-page anchor — preserve verbatim alongside the parent page-to-page mapping |

A non-anchor link definition with **no signal at all** is a pipeline error: the slug has no routing rule. The `check:port-signals` lint gate catches this in mdk-prv before it reaches the port-sync.

A definition may carry **multiple comment lines** (e.g. one `docs@tether.io:` and one `mdk-monorepo:`) — each is read independently.

### Examples

Outbound mapping to an upstream docs page:

```markdown
[architecture]: ../architecture.md
<!-- docs@tether.io: architecture → concepts/architecture -->
```

Preserving a non-Tether external URL:

```markdown
[hypercore]: https://github.com/holepunchto/hypercore
<!-- docs@tether.io: external link — preserve URL -->
```

Monorepo source file — local relative path for IDE navigation, GitHub URL on port:

```markdown
[kernel-package]: ../../backend/core/kernel/index.js
<!-- docs@tether.io: kernel-package → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/index.js -->
```

Engineer-facing code link with no upstream parity:

```markdown
[envelope-impl]: ../../backend/core/kernel/lib/protocol/envelope.js
<!-- docs@tether.io: no parity link -->
```

Code link with a temp flag (target not yet populated):

```markdown
[client-package]: ../../backend/core/client/
<!-- docs@tether.io: no parity link -->
<!-- mdk-monorepo: temp — backend/core/client/ is empty (.gitkeep only) until the SDK port lands -->
```

In-page anchor (uncommented by design):

```markdown
[architecture-section]: #the-kernel
```

## GFM alert → fumadocs `<Callout>`

GitHub renders `> [!TYPE]` blockquote alerts natively; fumadocs uses `<Callout type="…">` JSX. Source files in mdk-prv use GFM so they read correctly on GitHub; the port-sync maps:

| GFM source (mdk-prv) | Fumadocs output (tether.io) |
|---|---|
| `> [!NOTE]`      | `<Callout type="info">`    |
| `> [!TIP]`       | `<Callout type="idea">`    |
| `> [!IMPORTANT]` | `<Callout type="warn">`    |
| `> [!WARNING]`   | `<Callout type="warning">` |
| `> [!CAUTION]`   | `<Callout type="error">`   |

Fumadocs also ships `<Callout type="success">`, which has no GFM equivalent. When an author needs `success` (or wants to override a default mapping for a single block), drop an override comment immediately above the alert:

```markdown
<!-- callout: success -->
> [!NOTE]
> Deployment finished cleanly.
```

The port-sync reads `<!-- callout: <type> -->` directly above `> [!TYPE]` and uses that type instead of the default mapping. Without an override, the table applies. The override comment is invisible on GitHub (HTML comments do not render) so authoring stays GitHub-native.

## See also

- [`ia.md`](ia.md#qa-gates) — `check:port-signals` and the broader QA gates suite.
- [`agent-ready-sdk.md`](agent-ready-sdk.md) — the adjacent contract that governs how core + worker artefacts surface in the docs catalogue.
