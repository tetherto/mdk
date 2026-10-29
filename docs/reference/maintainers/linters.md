# Linters

Maintainer-facing inventory of the lint tooling that guards this monorepo's documentation. These layers:

- 🚧 Project-specific IA gates 🚧 — **proposed** gates defined in [`ia.md`](ia.md#qa-gates) to enforce the contract between code, the docs catalogue, and the port pipeline. `ia.md` owns the roster and each gate's status. Most are still proposed: engineering decides per-gate, and maintainers absorb the upkeep manually until one lands. The live exception is `check:agent-ready`, a blocking root-CI gate (the UI agent-readiness contract, paired with a set-monotonic `usage-proptable-baseline.json` guard — see [`single-source-of-truth.md`](single-source-of-truth.md#pr-workflow)). Generated-page freshness is its own layer (next bullet).
- **Generated-page freshness** — [`npm run regenerate-docs -- --check`](single-source-of-truth.md#checking-without-changing-anything) reports when a page written by a script no longer matches its sources. The `docs-freshness` workflow runs it on pull requests and **blocks** when any generated page is stale, listing every stale path in the job summary.
- **General docs hygiene** — the rest of this file. Link verification, anchor validation, spelling. These guard the docs themselves, not the IA contract.
- **Nightly table-reference check** — [`npm run check:table-refs`](#nightly-table-reference-check) confirms every `ERR_*` code or option/flag/param/key name cited in a canonical error-code or option/config table still exists in its package's source. Existence-only: it does not re-verify a table's claimed condition or default against actual guard/fallback logic.

## Nightly and PR diff link verification — linkinator

To hand run ahead of the nightly, from the repo root:

```bash
npm run link-check
```

If `npm` routes through Socket Firewall (`sfw`), `sfw` blocks unrecognized hosts by default and stalls any command whose toolchain reaches one. `npm run link-check` triggers it: linkinator serves the repo from an ephemeral local HTTP server (random port each run; `sfw` matches on hostname, so the port doesn't matter), then crawls every external URL in the Markdown. So does a broad `npm run build` or `build:registry` in the [`ui/`](../../../ui/README.md) workspace, which pulls in dev tooling like linkinator (the registry build itself makes no outbound requests). The same allowlist below unblocks both.

[`docs/scripts/sfw-env.sh`](../../scripts/sfw-env.sh) holds the full allowlist as one `SFW_CUSTOM_REGISTRIES` export
(comma-delimited `bypass:<host>` entries — see the
[SFW configuration wiki](https://github.com/SocketDev/firewall-release/wiki/Configuration) for the full syntax), with a
comment on every host explaining which doc/link put it there. Source it once from your shell profile:

```bash
[ -f "/absolute/path/to/mdk/docs/scripts/sfw-env.sh" ] && source "/absolute/path/to/mdk/docs/scripts/sfw-env.sh"
```

This only allowlists these specific, already-known-good hosts — it does not set `SFW_UNKNOWN_HOST_ACTION`, so `sfw`
still blocks everywhere else by default. If `link-check` starts blocking a *new* host (a fresh doc links to a domain
not in the file yet), add a `bypass:<host>` entry to [`sfw-env.sh`](../../scripts/sfw-env.sh) rather than reaching for `SFW_UNKNOWN_HOST_ACTION=warn`
— that flag silences the check for *every* unknown host, not just the one you're trying to unblock. Use it only as a
scoped, one-off prefix while diagnosing which host is blocked, never persisted:

```bash
SFW_UNKNOWN_HOST_ACTION=warn npm run link-check   # scoped to this one command
```

**A run that ends without the closing `link-check:` line was cut short.** Its absence is a failed run, not a clean
one. Do not take the command off the firewall to get a sweep through; the wrapper already keeps a full sweep within
what `sfw` tolerates, in batches.

<details>
<summary>Why a full sweep runs as several linkinator processes under the firewall</summary>

linkinator fetches every page from its own local server, and under `sfw` those requests travel through the firewall
proxy like any other. Socket Firewall cannot sustain a full sweep's worth of them in one linkinator process: once
that process has made a couple of hundred fetches, the firewall ends the command with exit `0`, printing only
`Socket Firewall encountered an unexpected error` per failed request and nothing from the checker. The trigger is
how many fetches one process makes, not any link on the pages, and no `bypass` entry changes it.

So the wrapper packs a full sweep into linkinator processes sized by an estimate of the fetches each will make, the
pages plus the unique links they carry, kept under `FETCH_BUDGET` in
[`link-check.mjs`](../../scripts/link-check.mjs). Every batch is anchored at `README.md` and the reports merge
before counting. Every request still goes through the firewall; nothing is taken off it. A scoped run
(`npm run link-check -- <files>`) is usually a single batch. CI runners have no `sfw` and run the same batches.

</details>

**Why this isn't folded into [`linkinator.config.json`](../../../linkinator.config.json).** `skip` (below) stops linkinator checking a URL; [`sfw-env.sh`](../../scripts/sfw-env.sh) does the opposite, letting the request through so the check can run. A host that needs `bypass` is one we still want checked, so merging the lists would invite "allowlisting" by moving a host to `skip` and silently dropping it from verification. They stay separate, cross-referenced in comments on both sides.

This runs [`docs/scripts/link-check.mjs`](../../scripts/link-check.mjs) — a thin wrapper, same shape as `check:example-paths`
below — that resolves the file list via `git ls-files '*.md'` (tracked files only) and passes it to
`linkinator --config linkinator.config.json`, so the config is still the single source of truth for fragment checking
and every skip pattern; nothing is repeated on the command line. The nightly CI runs the same script.

**Why `git ls-files`, not a `**/*.md` glob.** A raw glob also matches gitignored `.md` files in your working directory (scratch notes, local checklists) that CI's clean checkout never has, surfacing false broken-link or Socket Firewall failures for content no one else sees. Scoping to tracked files makes local runs match CI.

[Linkinator](https://github.com/JustinBeckwith/linkinator) checks Markdown files for broken links and (optionally) broken heading anchors. The cadences run off one config: a **nightly cron at 02:00 UTC** (full sweep) and a **PR diff gate** scoping the linkinator crawl to changed `.md` files, both via [`.github/workflows/link-check.yml`](../../../.github/workflows/link-check.yml). See [CI wiring](#ci-wiring) for the split. The [`check:directory-links`](#stale-directory-skip-entries--checkdirectory-links) sub-check always runs in full on both, regardless of diff scope; see that section for why.

Pin linkinator to an **exact** version in [`docs/scripts/link-check.mjs`](../../scripts/link-check.mjs) (currently `linkinator@7.6.1`), not a `^` range. Fragment checking is version-sensitive: earlier builds silently passed anchor links even when the heading didn't exist (fixed in [#771](https://github.com/JustinBeckwith/linkinator/pull/771), shipped in 7.6.0). A caret range does not protect you: `npx --yes linkinator@^7.6.0` reuses any cached matching 7.6.x rather than re-resolving, so CI can run a stale build while a fresher local cache runs the fixed one. That skew let a broken anchor pass CI while `npm run link-check` caught it locally. An exact pin forces one build everywhere.

### How it works

[`linkinator.config.json`](../../../linkinator.config.json) at repo root:

Hand maintained skip list:

`skip` entries are regex matched against **link targets**, not source file paths. A few representative entries:

| Pattern | Why |
|---|---|
| `node_modules` | Excludes installed-dependency Markdown from local runs. No-op in CI (the runner installs nothing), but a maintainer's checkout has `node_modules`, and without this the local `**/*.md` glob would scan thousands of vendored files. |
| `^https://github\.com/tetherto/mdk/blob/main/` | **Temporary.** These links point at the public mirror and already use the *predicted* post-reorg paths; they `404` until the same reorg lands on the public repo. Remove this entry once that ships so the links are validated again. |
| `backend/workers/miners/[^/]+/examples/?$` | Bare example directories (no `index`/`README` to serve) — see the bare-directory false-positive note below. `$`-anchored so it matches only the directory itself, never deeper files. Fully qualified from repo root (not just `workers/miners/...`) — see [`check:directory-links`](#stale-directory-skip-entries--checkdirectory-links) below for why. |
| `^https?://(localhost\|127\.0\.0\.1)(:(3000\|...))?(/\|$)` | The example URLs for a stack the crawler is not running. Port-scoped to the ports the docs use, so linkinator's own file server on a random high port is still crawled. Never widen it to a bare `localhost` match; see [What a run reports](#what-a-run-reports-and-the-hollow-sweep-guard). |

The rest of the current list (directory-shaped entries, temporary upstream-mirror exceptions, auth-walled hosts) live directly in [`linkinator.config.json`](../../../linkinator.config.json) with a paired `_skip_notes` explanation — that file is the source of truth for the full, current list; this table is illustrative, not exhaustive.

Add new entries only when the broken target can't be fixed in the source — a temporary upstream 404 is something to push back on, not a skip-list entry. Keep directory-target skips `$`-anchored and fully qualified from repo root (see below).

### Known false positive: bare directory targets

Markdown links that point at a bare directory (for example ``[`backend/core/gateway/`](../../../backend/core/gateway/)``) are reported as `404` by linkinator. They are not broken (GitHub renders directory URLs as a tree view), but linkinator serves the repo via an ephemeral local HTTP server and there is no `index.html` in those folders to return.

Do **not** silence these by adding the directory prefix to `skip`. Skip patterns are regex matched against link targets without implicit anchoring; an entry like [`ui/`](../../../ui/README.md) would also silence every deeper link ([`ui/README.md`](../../../ui/README.md), `ui/docs/USAGE.md`, ...), creating false negatives that hide real breakage. Anchored exact-match patterns (`^http://localhost:[0-9]+/ui/$`) work in theory but are fragile across linkinator versions and accumulate.

The convention is to point such links at a concrete file inside the directory — a [`README.md`](./README.md), `USAGE.md`, `index.js`, or the canonical entry source — so the link checker and the human reader both land somewhere meaningful. If the directory has no obvious landing file, keep the directory link: it resolves correctly on GitHub, so delinking it would strip working navigation just to satisfy a linkinator false positive. Treat the resulting local `404` as an accepted false positive instead — and add it to `skip`, following [`check:directory-links`](#stale-directory-skip-entries--checkdirectory-links) below.

### Stale directory-skip entries — `check:directory-links`

A `skip` entry is a regex, applied blindly forever. If a skip-listed directory is later renamed or deleted, nothing notices on its own — linkinator would keep "passing" on a now-dead reference indefinitely, since it can't tell "exists, no index file" apart from "doesn't exist at all" (that's the whole reason the entry is there in the first place).

[`docs/scripts/check-directory-links.mjs`](../../scripts/check-directory-links.mjs) closes that gap with a direct check against `git ls-files` (not raw `fs` calls — a local checkout can have untracked cruft, like a stray `node_modules/` left over from a package that used to live somewhere, that would make a directory look like it still exists locally when a clean CI checkout never would). It runs as part of `npm run link-check` (see [`docs/scripts/link-check.mjs`](../../scripts/link-check.mjs)), as a second, independent subprocess alongside linkinator — both must pass for the command to succeed.

**Classification is note-based, not just shape-based.** An entry in `skip` is treated as a directory-false-positive candidate when it matches a shape regex (a path of literal segments, at most one `[^/]+` wildcard segment, ending in the usual `/?$` anchor) *and* excludes the other kinds of entries in the list (generic exclusions like `node_modules`/`dist/`/`coverage/`, and URLs). Every entry classified as a candidate **must** have a paired [`_skip_notes`](../../../linkinator.config.json) entry containing the phrase `"bare directory path"` — a candidate with no note makes the script throw and fail CI hard, by design, same discipline [`example-paths.config.json`](../../../example-paths.config.json)'s loader already enforces for `check:example-paths`. This is also why every directory-shaped skip entry must be **fully qualified from repo root** (e.g. `backend/workers/miners/[^/]+/examples/?$`, not `workers/miners/...`): the check does one direct local lookup per entry (literal path checked directly; wildcard segment resolved by listing that parent's tracked children), never a repo-wide search. That only works if the entry says exactly where to look.

### Fragment checking — enabled

`checkFragments: true` is on. The silent-failure mode it catches is exactly the one you most need it for: a heading rename in (say) [`ia.md`](ia.md) invalidates every inbound `#derived-vocabulary` reference, and without anchor validation the link still returns OK because the target file exists.

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

### Repo name

Markdown here is promoted to the public `mdk` repo, so [`docs/scripts/link-check.mjs`](../../scripts/link-check.mjs) also fails on any tracked `.md` line naming this repo, code blocks included. Write sample paths as `/path/to/mdk/...` and say "this repo" in prose.

### What a run reports, and the hollow-sweep guard

Every run opens with a line naming how many files it crawls in how many batches, names each batch as it starts, and
ends with one closing line, all on stderr, in both modes and on both CI jobs. linkinator itself prints nothing while
it crawls in JSON mode, so those lines are the only progress, and a run cut short still shows how far it got. In
GitHub Actions the closing line is also on the job's summary page. The run fails on any broken link, on a count of
`0`, or on a crawl root reported `SKIPPED`.

```text
link-check: 604 links checked (131 external, 70 skipped), 0 broken
```

<details>
<summary>How the count is produced, what a hollow sweep is, and the localhost skip rule</summary>

The wrapper runs linkinator with `--format json --verbosity info` and reads the full report itself, so the count is
always known whatever `verbosity` the config sets for a direct `npx linkinator` run. A full sweep runs as several
batches (see the firewall note above); the count is of the merged report, one row per link and page. Broken rows
print above the closing line as `[status] url (in parent)`.

A crawl root is a file the sweep starts from. A skipped root fails the run as hollow, whatever skipped it: a
path-shaped entry such as `(^|/)dist/` skips any tracked root it happens to match, which is the right outcome for a
page the sweep was meant to check. The case the guard exists for is a `skip` entry that matches linkinator's own
file server, which serves the repo at `http://localhost:<random port>/`. A bare `^https?://(localhost|127\.0\.0\.1)`
entry does exactly that: every root is skipped, the report is empty, linkinator exits `0`, and the gate goes green
having checked nothing. The same entry is refused before the crawl starts:
the wrapper matches every `skip` entry against `http://localhost:1/README.md`, and `test/link-check-scope.test.mjs`
runs that check over the committed config. That probe only sees host-wide patterns; one shaped like `localhost:\d{5}`
gets past it, and the post-crawl check on skipped roots is what catches it.

Example URLs for a stack the crawler is not running (`http://localhost:3000/...`) are skipped with a port-scoped
entry instead, listed in the table above. When a doc introduces a new example port, add it to that entry's port
list; do not widen the host match.

A page with no links still counts as one checked link, its own fetch, so a scoped PR run on a link-free page never
reports `0`. A `0` always means the crawl did not run.

</details>

### CI wiring

[`.github/workflows/link-check.yml`](../../../.github/workflows/link-check.yml) runs in nightly and PR modes, both off the same [`linkinator.config.json`](../../../linkinator.config.json).

**Nightly full sweep** (`linkinator` job — `schedule` + `workflow_dispatch`):

- Cron `0 2 * * *` (02:00 UTC) plus `workflow_dispatch` for manual triggering. Gated with `if: github.event_name != 'pull_request'` so it never runs the full sweep on a PR.
- Runs `npm run link-check` (the same script maintainers use locally), which invokes the exact-pinned `linkinator@7.6.1` (see [above](#nightly-and-pr-diff-link-verification--linkinator)) against `**/*.md` using the root config; no project dependencies are installed in the runner. The `{ passed, links }` report on stdout is switched on with `LINK_CHECK_FORMAT=json`, an environment variable and the only value the wrapper accepts — **not** a CLI flag: `docs/scripts/link-check.mjs` reads its positional arguments as the diff-scoped file list, so `-- --format json` never reaches linkinator. Any argument that is not a tracked `.md` file is ignored with a warning on stderr and never narrows the sweep (a unit test in `test/link-check-scope.test.mjs` guards that), so a stray flag can no longer collapse the crawl to `README.md` alone.
- On failure, opens a tracking issue labelled `link-check` via the pre-installed `gh` CLI. If an open `link-check` issue already exists, the run **comments on it** instead of opening a duplicate — daily failures collapse into one thread, not a daily new issue.
- Surfaces the failure in the Actions run history (`exit 1`) after the issue is composed, so the repo's main page shows red.

**PR diff gate** (`link-check-diff` job — `pull_request`, gated with `if: github.event_name == 'pull_request'`):

- Triggered only when a PR touches `**/*.md`, [`linkinator.config.json`](../../../linkinator.config.json), or the workflow itself (path filter on the `pull_request` trigger).
- Checks out with `fetch-depth: 0`, then computes the added/modified `.md` files in the diff (`git diff --diff-filter=ACMR …`, which drops deleted files) and passes that explicit list straight to `npm run link-check -- <files...>` — [`docs/scripts/link-check.mjs`](../../scripts/link-check.mjs) accepts an optional file-list argument for exactly this: when given, it scopes the linkinator crawl to just those files (plus [`README.md`](../../../README.md), always included as a server-root anchor — see the comment in the script for why); with no argument at all (the nightly job, and a plain local run) it crawls every tracked `.md` file. **`check:directory-links`, `check:md-anchors` and the repo-name scan always run in full either way** — it isn't a per-file crawl, just a handful of `git ls-files` lookups against [`linkinator.config.json`](../../../linkinator.config.json)'s skip list, so there's no meaningful "diff-scoped" version of it and no cost to running it every time.
- A broken link (in the scoped crawl), a stale directory-skip entry, a broken anchor or a repo-name mention (all three always checked in full) fails the check — no issue is opened; that's the nightly's job.
- If the PR changes the config, anything under [`docs/scripts/`](../../scripts/), or the workflow itself, it falls back to a **full** `npm run link-check` sweep (no file-list argument), since a weakened skip rule or a change to how any check works can expose breakage outside the diff. Matching the whole folder rather than naming each checker script individually means a new shared helper (like the `lib/` module below) is covered automatically, not by remembering to add it to an enumerated list — the same lesson [`check:directory-links`](#stale-directory-skip-entries--checkdirectory-links) exists to enforce for `skip` entries applies here to this path filter too.
- **Known gap:** the linkinator half of the diff gate only validates links *originating from* changed files. A PR that removes an external URL's last inbound reference, or weakens a skip rule, can still expose breakage this job won't see — the nightly full sweep is the backstop for that. Inbound `#anchor` breakage from a heading rename is *not* in this gap: `check:md-anchors` runs in full on every PR and catches it there. Treat the PR gate as a fast first line, not a replacement for the nightly.

## Nightly example-path verification

To hand run ahead of the nightly, from the repo root:

```bash
npm run check:example-paths
```

This wraps [`docs/scripts/check-example-paths.mjs`](../../scripts/check-example-paths.mjs), a plain Node script with no new dependency — the same shape as `link-check` being a thin wrapper over one tool and one config.

**What it checks.** Linkinator only resolves Markdown links (`[text](target)`). A bare `examples/...` path named in prose or inside a fenced code block — `node examples/mvp-site/start.js` in a ```bash``` fence, for instance — is invisible to it by design allowing dead references in prose and fences, not links. `check:example-paths` closes that gap by walking every tracked `.md` file (`git ls-files '*.md'`), extracting `examples/...`-shaped tokens from the raw text, and confirming each one resolves to a real file or directory.

**Resolve-relative-then-root.** A candidate path is checked two ways: relative to the directory of the Markdown file that names it, then relative to the repo root. A miss on both is a finding. This matters because a package can document its own bundled examples using a path that's only correct relative to the package itself — e.g. a hypothetical `backend/workers/miners/<vendor>/USAGE.md` naming a script in its own `examples/` subdirectory (say a `run-runtime-parity.js` file) by joining just those two segments: a root-relative miss (the repo root has no such top-level directory), a file-relative hit (the package's own `examples/` subdirectory does contain it).

**Skip policy — [`example-paths.config.json`](../../../example-paths.config.json) at repo root**, mirroring [`linkinator.config.json`](../../../linkinator.config.json)'s shape:

- `skipFiles` — whole Markdown files excluded from scanning (glob patterns): historical records (`docs/reference/changelog-archive/**`, [`CHANGELOG.md`](../../../CHANGELOG.md)) that correctly name paths as they existed at the time they were written, not as they exist today.
- `skipPaths` — specific `examples/...` paths excluded wherever named: tutorial output the reader builds from scratch (`examples/minimal-dashboard`, built by [`docs/tutorials/build-a-dashboard.md`](../../tutorials/build-a-dashboard.md)) and gitignored runtime state created on first run (`examples/mvp-site/.site-data`).
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

**Table auto-detection — index 1, not "does the word appear anywhere."** A candidate table is a line starting with `|` immediately followed by a GFM separator row (`|---|---|...`, tight or padded). The header's **second cell** (index 1) classifies it: `Fires when` → error table, `Status` → option/flag/param/key table (the first-column header name — `Option`/`Flag`/`Param`/`Key` — doesn't matter). This excludes real, unrelated tables in this repo that also contain the word `Status` elsewhere in their header — root [`README.md`](../../../README.md)'s `Example | Use it for | Status` (index 2), and a wide capacity-metrics table with `Status` last — with no file allowlist or skip-list entry needed.

**Identifier extraction, per row's first cell:**

- Error tables: every `ERR_[A-Z0-9_]+`-shaped token. A row with none (e.g. `packages/cli/README.md`'s exit-code table, which reuses the `Fires when` header with bare integers) is silently skipped — checking whether a literal digit exists in source is noise, not a finding.
- Option/flag/param/key tables, split on `,` for multi-alias cells: a long flag (`--max-steps`, `--output <fmt>`) is checked by its hyphenated body (`max-steps`, `output`), a single-letter short flag (`-o`) is discarded (too little signal), a dotted path (`conf.ocean.apiUrl`) is checked by its last segment only (`apiUrl`), and a bare identifier (`kind`) is checked as-is.

**Same-package-only search scope.** Per finding candidate, the check walks up from the README's directory to the nearest `package.json` (falling back to the repo root's own), then searches only that package's tracked, non-Markdown source (`git ls-files`, excluding `node_modules/`, `dist/`, `package-lock.json`) for a plain substring match of the identifier. This matches the repo's own rule that error/option tables live in the throwing package's own README — a repo-wide search would hide a genuinely stale reference inside a package whose own source no longer has it, just because the string happens to appear somewhere else in the monorepo.

**Known, accepted limitation.** A very short or common leaf name (`port`, `env`, `mode`) will almost always find some match in a real package. This check's value concentrates on distinctive names and codes — it's a backstop against the highest-confidence staleness (a renamed or removed identifier), not a guarantee that every cited name is meaningfully checked.

**Sharper version of that limitation: `Prop | Status` tables in `ui/packages/react-devkit`.** These USAGE.md prop tables use the same `Status`-at-index-1 header shape as backend option tables, so they're in scope by the same rule. But `react-devkit` is one npm package spanning dozens of components, so a common prop name (`onChange`, `disabled`, `value`, `label`) recurs throughout the package regardless of whether it still exists on the *specific* component the table describes. The check still runs here but rarely catches a stale prop rename; treat this table family as in-scope-but-weak, not equivalent coverage to backend error/option tables.

**Skip policy — [`table-refs.config.json`](../../../table-refs.config.json) at repo root**, same shape and enforcement discipline as [`example-paths.config.json`](../../../example-paths.config.json):

- `skipFiles` — whole Markdown files excluded from scanning (glob patterns).
- `skipIdentifiers` — `{ "file": "<relative md path>", "identifier": "<string>" }` pairs, scoped to one file rather than a bare global identifier list, so a short common string that's a false positive in one file doesn't blind the checker to every file at once.
- `_skip_notes` — mandatory sibling object, one entry per skip entry (keyed by the glob string, or `"<file>::<identifier>"` for pairs). The checker refuses to run if any skip entry lacks a note, exactly mirroring `check:example-paths`'s loader.

Ships with an **empty skip list**. Every table's identifiers in the current repo were spot-checked and resolve; add a targeted entry only if a real, unfixable false positive turns up on an actual nightly run.

**CI wiring** — `.github/workflows/table-refs.yml`. Nightly only, same structure as `example-paths.yml`: the `table-refs` job (`schedule` + `workflow_dispatch`) runs `npm run check:table-refs`, and on failure opens or (if one is already open) comments on a tracking issue labelled `table-refs`, and emits a warning annotation; the run stays green (non-blocking). No PR gate — a PR-diff fast mode mirroring `link-check.yml`'s diff job is an explicitly deferred follow-on.

## Prose — Vale

Vale checks prose against the Tether house style: US English spelling with the shared project word list, product and proper-noun casing, and sentence-case headings. The rules live in [`tetherto/docs-template`](https://github.com/tetherto/docs-template/tree/vale) on its `vale` branch and are never copied here. The root `.vale.ini` only selects which of them apply to this repo and at what level: the alert floor is `error`, the Google, proselint and write-good packages are not loaded, and the casing and heading rules are raised from warning to error. Everything the central style reports at warning or suggestion stays silent in this repo. The file sets no `TokenIgnores` or `BlockIgnores`: Vale's Markdown parser already skips fenced code, inline code and link targets; regex ignores on top would make it lint inside them instead. Expect two things: a domain like `tether.io` in prose or link text trips the casing rule until the shared vocabulary accepts it, and an annotation on a long wrapped paragraph can land a line off from the word it names (a Vale limitation, not a config error).

**CI wiring** — `.github/workflows/vale-docs.yml` calls the shared workflow in docs-template with `config_path: .vale.ini`. The shared workflow checks docs-template out beside this repo at `.tether-vale-source`, which is where the `.vale.ini` StylesPath points, and runs Vale on the changed Markdown files. Findings appear as inline annotations on the PR diff from the one `✍️ Vale prose lint (advisory)` job, and the job summary lists every finding. The job is advisory (`fail_on_error: false`): an error annotates, the job stays green, and the check must stay out of the required status checks. A missing word that is a genuine term goes into the shared vocabulary in docs-template, not into a local exception.

Locally, with the same checkout in place:

```bash
git clone -b vale git@github.com:tetherto/docs-template.git .tether-vale-source
vale --no-global --config .vale.ini docs/path/to/file.md
```

## Style — Markdownlint

[`markdownlint-cli`](https://github.com/igorshubovych/markdownlint-cli) enforces structural consistency — heading hierarchy, list indentation, fenced code block style, reference-link
hygiene. The ruleset in [`.markdownlint.jsonc`](../../../.markdownlint.jsonc) is kept identical to the mdk-docs ruleset so both repos lint the same way. The files covered are set
by the `lint:md` globs in the root `package.json` (`docs/**/*.md` and every `README.md`) minus the exclusions in [`.markdownlintignore`](../../../.markdownlintignore).
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

- [`ia.md`](ia.md#qa-gates) — the proposed IA-specific lint gates that would enforce contract / catalogue / port-signal correctness if adopted by engineering.
- [`single-source-of-truth.md`](single-source-of-truth.md) — the link-routing comment vocabulary that `check:port-signals` reads, plus UI manifest generation workflow.
