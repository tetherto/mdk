# Linters

Maintainer-facing inventory of the lint tooling that guards this monorepo's documentation. Two layers:

- 🚧 Project-specific IA gates 🚧 — five **proposed** gates defined in [`ia.md`](ia.md#qa-gates) (`check:contract`, `check:facets-fresh`, `check:agent-ready`, `check:port-signals`, `check:integrations-fresh`). **If adopted**, they would enforce the contract between code, the docs catalogue, and the port pipeline. Of these, `check:agent-ready` is wired as a blocking root-CI gate (the UI agent-readiness contract, paired with a set-monotonic `usage-proptable-baseline.json` guard — see [`single-source-of-truth.md`](single-source-of-truth.md#when-to-regenerate)), and the regen-and-diff half of `check:integrations-fresh` plus `check:plugin-reference-fresh` ship as the **blocking** `docs-freshness` workflow. The remaining gates are not wired, engineering decides per-gate, and docs maintainers absorb the upkeep manually for any gate not adopted.
- **Generated-page freshness** — [`npm run regenerate-docs -- --check`](single-source-of-truth.md#checking-without-changing-anything) reports when a page written by a script no longer matches its sources. The `docs-freshness` workflow runs it on pull requests and **blocks** when any generated page is stale, listing every stale path in the job summary.
- **General docs hygiene** — the rest of this file. Link verification, anchor validation, spelling. These guard the docs themselves, not the IA contract.
- **Nightly table-reference check** — [`npm run check:table-refs`](#nightly-table-reference-check) confirms every `ERR_*` code or option/flag/param/key name cited in a canonical error-code or option/config table still exists in its package's source. Existence-only: it does not re-verify a table's claimed condition or default against actual guard/fallback logic.

## Nightly and PR diff link verification — linkinator

To hand run ahead of the nightly, from the repo root:

```bash
npm run link-check
```

If your shell routes `npm` through Socket Firewall (`sfw`) and this hangs retrying every single file, that's `sfw` blocking
`localhost` — linkinator serves the repo from an ephemeral local HTTP server (a new random port every run — `sfw` matches
on hostname, so the port doesn't matter), then crawls every external URL it finds in the Markdown, and `sfw` blocks
unrecognized hosts by default.

[`docs/scripts/sfw-env.sh`](../../scripts/sfw-env.sh) holds the full allowlist as one `SFW_CUSTOM_REGISTRIES` export
(comma-delimited `bypass:<host>` entries — see the
[SFW configuration wiki](https://github.com/SocketDev/firewall-release/wiki/Configuration) for the full syntax), with a
comment on every host explaining which doc/link put it there. Source it once from your shell profile:

```bash
[ -f "/absolute/path/to/mdk-prv/docs/scripts/sfw-env.sh" ] && source "/absolute/path/to/mdk-prv/docs/scripts/sfw-env.sh"
```

This only allowlists these specific, already-known-good hosts — it does not set `SFW_UNKNOWN_HOST_ACTION`, so `sfw`
still blocks everywhere else by default. If `link-check` starts blocking a *new* host (a fresh doc links to a domain
not in the file yet), add a `bypass:<host>` entry to [`sfw-env.sh`](../../scripts/sfw-env.sh) rather than reaching for `SFW_UNKNOWN_HOST_ACTION=warn`
— that flag silences the check for *every* unknown host, not just the one you're trying to unblock. Use it only as a
scoped, one-off prefix while diagnosing which host is blocked, never persisted:

```bash
SFW_UNKNOWN_HOST_ACTION=warn npm run link-check   # scoped to this one command
```

**Why this isn't folded into [`linkinator.config.json`](../../../linkinator.config.json).** Its `skip` list (below) tells linkinator to never check a
URL at all — the request is never made. [`sfw-env.sh`](../../scripts/sfw-env.sh) does the opposite: it lets a request through so linkinator's
check can actually run and get a real answer. A host that needs `bypass` is, by definition, one we still want
checked — merging the two lists would risk someone "allowlisting" a host by moving it to `skip` instead, which
silently stops verifying it rather than just unblocking it. They stay separate files for that reason, cross-referenced
in comments on both sides.

This runs [`docs/scripts/link-check.mjs`](../../scripts/link-check.mjs) — a thin wrapper, same shape as `check:example-paths`
below — that resolves the file list via `git ls-files '*.md'` (tracked files only) and passes it to
`linkinator --config linkinator.config.json`, so the config is still the single source of truth for fragment checking
and every skip pattern; nothing is repeated on the command line. The nightly CI runs the same script.

**Why `git ls-files`, not a `**/*.md` glob.** A raw glob also matches gitignored `.md` files physically sitting in your
working directory — a personal scratch checklist, local notes — that CI's clean checkout never has. Locally that shows
up as a false "broken link" (or a Socket Firewall block on some host only *that* file references) for content that
isn't part of the doc corpus and that no one else ever sees. Scoping to tracked files makes local runs match what
CI checks, exactly.

[Linkinator](https://github.com/JustinBeckwith/linkinator) checks Markdown files for broken links and (optionally) broken heading anchors. Two cadences run today, both off the same config: a **nightly cron at 02:00 UTC** (full sweep) and a **PR diff gate** that scopes the linkinator crawl to only the changed `.md` files — both via [`.github/workflows/link-check.yml`](../../../.github/workflows/link-check.yml). See [CI wiring](#ci-wiring) for the split. The [`check:directory-links`](#stale-directory-skip-entries--checkdirectory-links) sub-check always runs in full on both cadences, regardless of diff scope — see that section for why.

Pin linkinator to an **exact** version in [`docs/scripts/link-check.mjs`](../../scripts/link-check.mjs) (currently `linkinator@7.6.1`), not a `^` range. Fragment checking is version-sensitive: earlier builds silently passed anchor links even when the heading didn't exist (fixed in [#771](https://github.com/JustinBeckwith/linkinator/pull/771), shipped in 7.6.0). A caret range does not protect you, because `npx --yes linkinator@^7.6.0` reuses whatever matching 7.6.x a runner already has cached rather than re-resolving, so CI can run a stale, buggy build while a fresher local cache runs the fixed one. That skew is exactly how a broken anchor passed CI while `npm run link-check` caught it locally. An exact pin forces one build everywhere.

### How it works

[`linkinator.config.json`](../../../linkinator.config.json) at repo root:

Hand maintained skip list:

`skip` entries are regex matched against **link targets**, not source file paths. A few representative entries:

| Pattern | Why |
|---|---|
| `node_modules` | Excludes installed-dependency Markdown from local runs. No-op in CI (the runner installs nothing), but a maintainer's checkout has `node_modules`, and without this the local `**/*.md` glob would scan thousands of vendored files. |
| `^https://github\.com/tetherto/mdk/blob/main/` | **Temporary.** These links point at the public mirror and already use the *predicted* post-reorg paths; they `404` until the same reorg lands on the public repo. Remove this entry once that ships so the links are validated again. |
| `backend/workers/miners/[^/]+/examples/?$` | Bare example directories (no `index`/`README` to serve) — see the bare-directory false-positive note below. `$`-anchored so it matches only the directory itself, never deeper files. Fully qualified from repo root (not just `workers/miners/...`) — see [`check:directory-links`](#stale-directory-skip-entries--checkdirectory-links) below for why. |

The rest of the current list (directory-shaped entries, temporary upstream-mirror exceptions, auth-walled hosts) live directly in [`linkinator.config.json`](../../../linkinator.config.json) with a paired `_skip_notes` explanation — that file is the source of truth for the full, current list; this table is illustrative, not exhaustive.

Add new entries only when the broken target can't be fixed in the source — a temporary upstream 404 is something to push back on, not a skip-list entry. Keep directory-target skips `$`-anchored and fully qualified from repo root (see below).

### Known false positive: bare directory targets

Markdown links that point at a bare directory (for example ``[`backend/core/gateway/`](../../../backend/core/gateway/)``) are reported as `404` by linkinator. They are not actually broken — GitHub renders directory URLs as a tree view — but linkinator serves the repo via an ephemeral local HTTP server, and there is no `index.html` inside those folders for the server to return.

Do **not** silence these by adding the directory prefix to `skip`. Skip patterns are regex matched against link targets without implicit anchoring; an entry like [`ui/`](../../../ui/README.md) would also silence every deeper link ([`ui/README.md`](../../../ui/README.md), `ui/docs/USAGE.md`, ...), creating false negatives that hide real breakage. Anchored exact-match patterns (`^http://localhost:[0-9]+/ui/$`) work in theory but are fragile across linkinator versions and accumulate.

The convention is to point such links at a concrete file inside the directory — a [`README.md`](./README.md), `USAGE.md`, `index.js`, or the canonical entry source — so the link checker and the human reader both land somewhere meaningful. If the directory has no obvious landing file, keep the directory link: it resolves correctly on GitHub, so delinking it would strip working navigation just to satisfy a linkinator false positive. Treat the resulting local `404` as an accepted false positive instead — and add it to `skip`, following [`check:directory-links`](#stale-directory-skip-entries--checkdirectory-links) below.

### Stale directory-skip entries — `check:directory-links`

A `skip` entry is a regex, applied blindly forever. If a skip-listed directory is later renamed or deleted, nothing notices on its own — linkinator would keep "passing" on a now-dead reference indefinitely, since it can't tell "exists, no index file" apart from "doesn't exist at all" (that's the whole reason the entry is there in the first place).

[`docs/scripts/check-directory-links.mjs`](../../scripts/check-directory-links.mjs) closes that gap with a direct check against `git ls-files` (not raw `fs` calls — a local checkout can have untracked cruft, like a stray `node_modules/` left over from a package that used to live somewhere, that would make a directory look like it still exists locally when a clean CI checkout never would). It runs as part of `npm run link-check` (see [`docs/scripts/link-check.mjs`](../../scripts/link-check.mjs)), as a second, independent subprocess alongside linkinator — both must pass for the command to succeed.

**Classification is note-based, not just shape-based.** An entry in `skip` is treated as a directory-false-positive candidate when it matches a shape regex (a path of literal segments, at most one `[^/]+` wildcard segment, ending in the usual `/?$` anchor) *and* excludes the other kinds of entries in the list (generic exclusions like `node_modules`/`dist/`/`coverage/`, and URLs). Every entry classified as a candidate **must** have a paired [`_skip_notes`](../../../linkinator.config.json) entry containing the phrase `"bare directory path"` — a candidate with no note makes the script throw and fail CI hard, by design, same discipline [`example-paths.config.json`](../../../example-paths.config.json)'s loader already enforces for `check:example-paths`. This is also why every directory-shaped skip entry must be **fully qualified from repo root** (e.g. `backend/workers/miners/[^/]+/examples/?$`, not just `workers/miners/...`): the check verifies each entry with one direct, local lookup — a literal path is checked directly, a wildcard segment is resolved by listing just that one parent directory's tracked children — never a repo-wide search, which only works if the entry's own text already says exactly where to look.

### Fragment checking — enabled

`checkFragments: true` is now on. It was deliberately rolled out in two stages:

1. The first nightlies ran with `checkFragments: false` to surface the basic signal — broken external URLs, redirect chains, the known directory false positives — without anchor noise layered on top. That was the calibration baseline.
2. Once that baseline was clean (verified repo-wide: every internal `.md`-to-`.md` anchor resolves), the flag was flipped to `true`.

The silent-failure mode it catches is exactly the one you most need it for: a heading rename in (say) [`ia.md`](ia.md) invalidates every inbound `#derived-vocabulary` reference, and without anchor validation the link still returns OK because the target file exists.

One linkinator quirk worth knowing when reading reports: a **valid** fragment is folded into its base-file `OK` entry and never listed separately. Only **broken** fragments appear as their own `#`-bearing `BROKEN` line. So an absent `#` line means that anchor was not *reported*, which is not the same as validated — see the next section.

### Cross-file anchors — `check:md-anchors`

`checkFragments: true` alone is not a gate. linkinator registers a fragment when it *discovers* the link, but validates it inside the crawl of the target URL — a crawl it skips entirely when that URL is already in its visited cache. Fetch `architecture.md` for any reason before something discovers `architecture.md#workers`, and the anchor is never checked and never reported. Only same-page fragments get a second pass.

The result is order-dependent, and the order is not random: the sweep feeds files in `git ls-files` (alphabetical) order, so `docs/concepts/architecture.md` is always fetched before `docs/concepts/deployment-topologies.md` is parsed. A break in that direction is invisible to *every* run, not an intermittent one. Reproduce it with the same version and content, changing only argument order:

```console
$ npx linkinator@7.6.1 --markdown --check-fragments docs/concepts/deployment-topologies.md docs/concepts/architecture.md
ERROR: Detected 2 broken links.

$ npx linkinator@7.6.1 --markdown --check-fragments docs/concepts/architecture.md docs/concepts/deployment-topologies.md
✓ Successfully scanned 23 links.
```

[`docs/scripts/check-md-anchors.mjs`](../../scripts/check-md-anchors.mjs) closes that gap without a crawler: it reads every tracked `.md` file, collects each target's GitHub-style heading slugs (plus explicit `<a name>`/`id` anchors), and resolves every relative `*.md#anchor` and in-page `#anchor` link against them. No server, no fetch, no visit cache — so no ordering to be wrong about. Fenced code blocks are excluded on both sides, so an anchor shown as an example is not treated as a link. It runs as part of `npm run link-check` as a third, independent subprocess alongside linkinator and `check:directory-links`; all three must pass for the command to succeed.

### CI wiring

[`.github/workflows/link-check.yml`](../../../.github/workflows/link-check.yml) runs in two modes, both off the same [`linkinator.config.json`](../../../linkinator.config.json).

**Nightly full sweep** (`linkinator` job — `schedule` + `workflow_dispatch`):

- Cron `0 2 * * *` (02:00 UTC) plus `workflow_dispatch` for manual triggering. Gated with `if: github.event_name != 'pull_request'` so it never runs the full sweep on a PR.
- Runs `npm run link-check` (the same script maintainers use locally), which invokes the exact-pinned `linkinator@7.6.1` (see [above](#nightly-and-pr-diff-link-verification--linkinator)) against `**/*.md` using the root config; no project dependencies are installed in the runner. Report format is set with `LINK_CHECK_FORMAT=json`, an environment variable — **not** a CLI flag: `docs/scripts/link-check.mjs` reads its positional arguments as the diff-scoped file list, so `-- --format json` never reaches linkinator. Any argument that is not a tracked `.md` file is ignored with a warning on stderr and never narrows the sweep (a unit test in `test/link-check-scope.test.mjs` guards that), so a stray flag can no longer collapse the crawl to `README.md` alone.
- On failure, opens a tracking issue labelled `link-check` via the pre-installed `gh` CLI. If an open `link-check` issue already exists, the run **comments on it** instead of opening a duplicate — daily failures collapse into one thread, not a daily new issue.
- Surfaces the failure in the Actions run history (`exit 1`) after the issue is composed, so the repo's main page shows red.

**PR diff gate** (`link-check-diff` job — `pull_request`, gated with `if: github.event_name == 'pull_request'`):

- Triggered only when a PR touches `**/*.md`, [`linkinator.config.json`](../../../linkinator.config.json), or the workflow itself (path filter on the `pull_request` trigger).
- Checks out with `fetch-depth: 0`, then computes the added/modified `.md` files in the diff (`git diff --diff-filter=ACMR …`, which drops deleted files) and passes that explicit list straight to `npm run link-check -- <files...>` — [`docs/scripts/link-check.mjs`](../../scripts/link-check.mjs) accepts an optional file-list argument for exactly this: when given, it scopes the linkinator crawl to just those files (plus [`README.md`](../../../README.md), always included as a server-root anchor — see the comment in the script for why); with no argument at all (the nightly job, and a plain local run) it crawls every tracked `.md` file. **`check:directory-links` and `check:md-anchors` always run in full either way** — it isn't a per-file crawl, just a handful of `git ls-files` lookups against [`linkinator.config.json`](../../../linkinator.config.json)'s skip list, so there's no meaningful "diff-scoped" version of it and no cost to running it every time.
- A broken link (in the scoped crawl), a stale directory-skip entry or a broken anchor (both always checked in full) fails the check — no issue is opened; that's the nightly's job.
- If the PR changes the config, anything under [`docs/scripts/`](../../scripts/), or the workflow itself, it falls back to a **full** `npm run link-check` sweep (no file-list argument), since a weakened skip rule or a change to how any check works can expose breakage outside the diff. Matching the whole folder rather than naming each checker script individually means a new shared helper (like the `lib/` module below) is covered automatically, not by remembering to add it to an enumerated list — the same lesson [`check:directory-links`](#stale-directory-skip-entries--checkdirectory-links) exists to enforce for `skip` entries applies here to this path filter too.
- **Known gap:** the linkinator half of the diff gate only validates links *originating from* changed files. A PR that removes an external URL's last inbound reference, or weakens a skip rule, can still expose breakage this job won't see — the nightly full sweep is the backstop for that. Inbound `#anchor` breakage from a heading rename is *not* in this gap: `check:md-anchors` runs in full on every PR and catches it there. Treat the PR gate as a fast first line, not a replacement for the nightly.

## Nightly example-path verification

To hand run ahead of the nightly, from the repo root:

```bash
npm run check:example-paths
```

This wraps [`docs/scripts/check-example-paths.mjs`](../../scripts/check-example-paths.mjs), a plain Node script with no new dependency — the same shape as `link-check` being a thin wrapper over one tool and one config.

**What it checks.** Linkinator only resolves Markdown links (`[text](target)`). A bare `examples/...` path named in prose or inside a fenced code block — `node examples/backend/miners/antminer/index.js` in a ```bash``` fence, for instance — is invisible to it by design allowing dead references in prose and fences, not links. `check:example-paths` closes that gap by walking every tracked `.md` file (`git ls-files '*.md'`), extracting `examples/...`-shaped tokens from the raw text, and confirming each one resolves to a real file or directory.

**Resolve-relative-then-root.** A candidate path is checked two ways: relative to the directory of the Markdown file that names it, then relative to the repo root. A miss on both is a finding. This matters because a package can document its own bundled examples using a path that's only correct relative to the package itself — e.g. a hypothetical `backend/workers/miners/<vendor>/USAGE.md` naming a script in its own `examples/` subdirectory (say a `run-runtime-parity.js` file) by joining just those two segments: a root-relative miss (the repo root has no such top-level directory), a file-relative hit (the package's own `examples/` subdirectory does contain it).

**Skip policy — [`example-paths.config.json`](../../../example-paths.config.json) at repo root**, mirroring [`linkinator.config.json`](../../../linkinator.config.json)'s shape:

- `skipFiles` — whole Markdown files excluded from scanning (glob patterns): historical records (`docs/reference/changelog-archive/**`, `docs/reference/release-notes/**`, [`CHANGELOG.md`](../../../CHANGELOG.md)) that correctly name paths as they existed at the time they were written, not as they exist today.
- `skipPaths` — specific `examples/...` paths excluded wherever named: tutorial output the reader builds from scratch (`examples/minimal-dashboard`, built by [`docs/tutorials/build-a-dashboard.md`](../../tutorials/build-a-dashboard.md)) and gitignored runtime state created on first run (`examples/mvp-site/.site-data`, `examples/full-site/.mdk-data`).
- `_skip_notes` — mandatory sibling object, one entry per `skipFiles`/`skipPaths` pattern, explaining why. The checker refuses to run if any skip entry lacks a note. An unexplained skip is a silent false negative waiting to happen — the same lesson the linkinator skip list already enforces by convention; here it's enforced by the script itself.
- Placeholders are dropped automatically, not via the skip list: any candidate token immediately followed by `<`, `>`, `*`, `{`, `}`, or `…` (for example `examples/run-<scenario>.js` or `` examples/run-*.js ``) is treated as unresolved template text, not a real path.

**CI wiring** — `.github/workflows/example-paths.yml`. Nightly only, deliberately unlike [`link-check.yml`](../../../.github/workflows/link-check.yml)'s nightly-plus-PR split: the `example-paths` job (`schedule` + `workflow_dispatch`) runs `npm run check:example-paths`, and on failure opens or (if one is already open) comments on a tracking issue labelled `example-paths`, then exits non-zero so the run shows red. There is no PR gate — this check is not wired into the PR path.

## Nightly table-reference check

To hand run ahead of the nightly, from the repo root:

```bash
npm run check:table-refs
```

This wraps [`docs/scripts/check-table-refs.mjs`](../../scripts/check-table-refs.mjs), a plain Node script with no new dependency — same shape as `check:example-paths` above.

**What it checks — existence-only.** The `apply-tables.md` initiative reformatted error-code and option/config tables across package READMEs into two canonical shapes; review during that work caught real bugs (a wrong trigger condition, a claimed default that doesn't exist in code) that a single pass missed. This check is a cheap, mechanical guard against that class of bug: it confirms a table's cited `ERR_*` code or `opts.`/`conf.`/`--flag` name still appears **somewhere** in its package's source. It does **not** verify that a table's claimed condition or default matches the actual guard/fallback logic — that requires source-reading, which is what caught the original bugs, and is not reliably mechanizable. A clean run means "nothing was renamed or removed out from under the docs," not "every table is factually correct."

**Table auto-detection — index 1, not "does the word appear anywhere."** A candidate table is a line starting with `|` immediately followed by a GFM separator row (`|---|---|...`, tight or padded). The header's **second cell** (index 1) classifies it: `Fires when` → error table, `Status` → option/flag/param/key table (the first-column header name — `Option`/`Flag`/`Param`/`Key` — doesn't matter). This excludes real, unrelated tables in this repo that also contain the word `Status` elsewhere in their header — root [`README.md`](../../../README.md)'s `Example | Use it for | Status` (index 2), the `ID | Task | Detail | Status` tracker tables in [`full-site-ui-production-readiness.md`](full-site-ui-production-readiness.md) (index 3), and a 22-column capacity-metrics table with `Status` last — with no file allowlist or skip-list entry needed.

**Identifier extraction, per row's first cell:**

- Error tables: every `ERR_[A-Z0-9_]+`-shaped token. A row with none (e.g. `packages/cli/README.md`'s exit-code table, which reuses the `Fires when` header with bare integers) is silently skipped — checking whether a literal digit exists in source is noise, not a finding.
- Option/flag/param/key tables, split on `,` for multi-alias cells: a long flag (`--max-steps`, `--output <fmt>`) is checked by its hyphenated body (`max-steps`, `output`), a single-letter short flag (`-o`) is discarded (too little signal), a dotted path (`conf.ocean.apiUrl`) is checked by its last segment only (`apiUrl`), and a bare identifier (`kind`) is checked as-is.

**Same-package-only search scope.** Per finding candidate, the check walks up from the README's directory to the nearest `package.json` (falling back to the repo root's own), then searches only that package's tracked, non-Markdown source (`git ls-files`, excluding `node_modules/`, `dist/`, `package-lock.json`) for a plain substring match of the identifier. This matches the repo's own rule that error/option tables live in the throwing package's own README — a repo-wide search would hide a genuinely stale reference inside a package whose own source no longer has it, just because the string happens to appear somewhere else in the monorepo.

**Known, accepted limitation.** A very short or common leaf name (`port`, `env`, `mode`) will almost always find some match in a real package. This check's value concentrates on distinctive names and codes — it's a backstop against the highest-confidence staleness (a renamed or removed identifier), not a guarantee that every cited name is meaningfully checked.

**Sharper version of that limitation: `Prop | Status` tables in `ui/packages/react-devkit`.** These USAGE.md prop tables use the same `Status`-at-index-1 header shape as backend option tables, so they're in scope by the same rule — but `react-devkit` is one single npm package spanning dozens of components, not the small, component-scoped packages backend option tables live in. A common prop name (`onChange`, `disabled`, `value`, `label`, ...) is near-certain to appear *somewhere* in that package regardless of whether it still exists on the *specific* component the table describes — as of writing, `onChange` alone appears 263 times across the package's source, and 46 files carry a `Prop | Status` table. This check still runs against them, but expect it to rarely catch a stale prop rename in practice; treat it as in-scope-but-weak for this table family specifically, not as equivalent coverage to backend error/option tables.

**Skip policy — [`table-refs.config.json`](../../../table-refs.config.json) at repo root**, same shape and enforcement discipline as [`example-paths.config.json`](../../../example-paths.config.json):

- `skipFiles` — whole Markdown files excluded from scanning (glob patterns).
- `skipIdentifiers` — `{ "file": "<relative md path>", "identifier": "<string>" }` pairs, scoped to one file rather than a bare global identifier list, so a short common string that's a false positive in one file doesn't blind the checker to every file at once.
- `_skip_notes` — mandatory sibling object, one entry per skip entry (keyed by the glob string, or `"<file>::<identifier>"` for pairs). The checker refuses to run if any skip entry lacks a note, exactly mirroring `check:example-paths`'s loader.

Ships with an **empty skip list**. Every table's identifiers in the current repo were spot-checked and resolve; add a targeted entry only if a real, unfixable false positive turns up on an actual nightly run.

**CI wiring** — `.github/workflows/table-refs.yml`. Nightly only, same structure as `example-paths.yml`: the `table-refs` job (`schedule` + `workflow_dispatch`) runs `npm run check:table-refs`, and on failure opens or (if one is already open) comments on a tracking issue labelled `table-refs`, then exits non-zero so the run shows red. No PR gate — a PR-diff fast mode mirroring `link-check.yml`'s diff job is an explicitly deferred follow-on.

## 🚧 Spelling — Vale

Vale catches accidental misspellings and enforces a project word list. Configured via `.vale.ini` at the repo root when present. Runs locally on demand today; CI wiring is a follow-on.

## Style — Markdownlint

[`markdownlint-cli`](https://github.com/igorshubovych/markdownlint-cli) enforces structural consistency — heading hierarchy, list indentation, fenced code block style, reference-link
hygiene. The ruleset in `.markdownlint.jsonc` is kept identical to the mdk-docs ruleset so both repos lint the same way. The files covered are set
by the `lint:md` globs in the root `package.json` (`docs/**/*.md` and every `README.md`) minus the exclusions in `.markdownlintignore`.
`markdownlint-cli` runs the same `markdownlint` engine as `markdownlint-cli2`. It replaced `markdownlint-cli2` because that CLI's globby → micromatch → braces chain carries an
advisory with no patched release (GHSA-vfj7-8cjw-p6xm).

Full sweep, from the repo root:

```bash
npm run lint:md
```

Diff-scoped, the same set CI lints on a pull request:

```bash
VERIFY_BASE_REF=origin/main npm run lint:md:pr
```

**CI wiring** — the `lint-markdown` job in [`ci.yml`](../../../.github/workflows/ci.yml) runs [`docs/scripts/lint-md-pr.sh`](../../scripts/lint-md-pr.sh) on every pull request against
the changed `docs/**/*.md` and `README.md`. It runs independently of the changed-area detection, because a docs-only pull request skips every domain suite. A diff with no matching
files passes without linting.

`MD053` (unused link reference definitions) is enforced rather than disabled. It counts the same three reference-link forms the port pipeline resolves — full, collapsed, and shortcut
— so a definition it flags contributes nothing to ported output and is dead weight in the `## Links` footer. One case diverges: a definition referenced only from an HTML comment is
resolved by the port pipeline but invisible to `MD053`, so those carry an inline `markdownlint-disable-next-line MD053` naming the reason. See
[`single-source-of-truth.md`](single-source-of-truth.md) for the routing-comment vocabulary those definitions carry.

`MD028` (blank line between adjacent blockquotes) is the one rule disabled beyond the shared mdk-docs set. Guides here author GFM alerts directly, and a `> [!NOTE]` followed by a
`> [!WARNING]` is deliberate. CommonMark and the port pipeline both read the blank line as separating two blockquotes, so satisfying the rule means inserting a separator that changes
nothing on GitHub and ships to the site as a stray `{/* */}`. Write adjacent alerts with a blank line between them.

## See also

- [`ia.md`](ia.md#qa-gates) — the five proposed IA-specific lint gates that would enforce contract / catalogue / port-signal correctness if adopted by engineering.
- [`single-source-of-truth.md`](single-source-of-truth.md) — the link-routing comment vocabulary that `check:port-signals` reads, plus UI manifest generation workflow.
