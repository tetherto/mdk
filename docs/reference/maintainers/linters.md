# Linters

Maintainer-facing inventory of the lint tooling that guards this monorepo's documentation. These layers:

- 🚧 Project-specific IA gates 🚧: **proposed** gates defined in [`ia.md`](ia.md#qa-gates) to enforce the contract between code, the docs catalogue, and the port pipeline. `ia.md` owns the roster and each gate's status. Most are still proposed: engineering decides per-gate, and maintainers absorb the upkeep manually until one lands. The live exceptions are `check:agent-ready`, an advisory (non-blocking) root-CI gate that reports on the pull request without failing it (the UI agent-readiness contract, paired with a set-monotonic `usage-proptable-baseline.json` guard, also advisory, described in [`single-source-of-truth.md`](single-source-of-truth.md#pr-workflow)), and [`check:plugin-manifest`](ia.md#checkplugin-manifest), a blocking gate that validates every app route table against the app runtime's schema. Generated-page freshness is its own layer (next bullet).
- **Generated-page freshness** — [`npm run regenerate-docs -- --check`](single-source-of-truth.md#checking-without-changing-anything) reports when a page written by a script no longer matches its sources. The `docs-freshness` workflow runs it on pull requests and **blocks** when any generated page is stale, listing every stale path in the job summary.
- **General docs hygiene** — the rest of this file. Link verification, anchor validation, spelling. These guard the docs themselves, not the IA contract.
- **Nightly table-reference check** — [`npm run check:table-refs`](#nightly-table-reference-check) confirms every `ERR_*` code or option/flag/param/key name cited in a canonical error-code or option/config table still exists in its package's source. Existence-only: it does not re-verify a table's claimed condition or default against actual guard/fallback logic.

## Nightly check conventions

The nightly checks on this page, and the [external contract check](single-source-of-truth.md#supported-workers-catalogue),
share these rules. Each check's section says only where it differs.

### Tracking issues

- A failing scheduled run opens a tracking issue carrying the check's label, or updates the one already open
- A clean scheduled run closes the open issue, so the open list shows only live findings and a later failure opens a fresh one.
  It closes only issues the workflow opened, never one a person filed with the same label.
- Only scheduled runs touch an issue. A `workflow_dispatch` run can target any branch, so it reports in its log and leaves the
  issue alone.

### Skip lists

- A check's skip list lives in its own config file at the repo root
- Every entry carries a reason in the config's `_skip_notes` object. `check:example-paths` and `check:table-refs` refuse to run
  when one is missing, and a unit test holds `linkinator.config.json` to the same rule. An unexplained skip is a silent false
  negative.
- An entry is for a real, unfixable false positive only. A real finding gets fixed in the docs, never skipped.

## Nightly and PR diff link verification — linkinator

To hand run ahead of the nightly, from the repo root:

```bash
npm run link-check                # every link
npm run link-check -- --offline   # in-repo links only, no network
```

[`docs/scripts/link-check.mjs`](../../scripts/link-check.mjs) checks every link in the tracked tree, in two halves:

| Half     | Links                                                                                          | How                                                              | Scope                                             |
|----------|------------------------------------------------------------------------------------------------|------------------------------------------------------------------|---------------------------------------------------|
| In-repo  | Relative links and routing comments in Markdown and source comments; public URLs into this repo in any tracked file | Resolved offline against the git tree                            | Always the whole tree                             |
| External | Every other `http(s)` URL in Markdown prose and in source comments                             | Fetched by [linkinator](https://github.com/JustinBeckwith/linkinator) | The whole tree, or the files named on the command line |

Both halves read tracked files only (`git ls-files`), so a gitignored scratch note or a stray `node_modules` in a working
directory never produces a finding that a clean CI checkout would not.

A nightly sweep and a PR diff gate run it from [`.github/workflows/link-check.yml`](../../../.github/workflows/link-check.yml);
[CI wiring](#ci-wiring) covers the split.

### In-repo links

[`docs/scripts/lib/repo-links.mjs`](../../scripts/lib/repo-links.mjs) resolves each of these against the tracked tree. A failure
prints as `file -> target`, with the kind of link and its line where the table shows one.

| Link                                                        | Where it is read                    | Failure shape                                     |
|-------------------------------------------------------------|-------------------------------------|---------------------------------------------------|
| Relative link: inline, reference definition, `href`, `src`  | Markdown                            | `file -> target`                                  |
| Relative Markdown link starting `./` or `../`               | Comments in JS and TS source        | `file -> target (comment, line N)`                |
| [Routing comment](#routing-comments)                        | Markdown                            | `file -> target (routing comment, line N)`        |
| [Public URL into this repo](#public-urls-into-this-repo)    | Any tracked file                    | `file -> target (repository link, line N)`        |

A target resolves when it is a tracked file, or a folder some tracked file lives under. A link to a folder needs no `README.md`
inside it.

A fragment must be a heading of the Markdown file it lands on: GitHub's id for an ATX (`#`) heading, or an `<a name>` or `<a id>`
anchor. A fragment on a folder is checked against that folder's `README.md`, and a folder without one cannot carry a fragment. A
fragment on any other file, such as a line anchor on source, is left alone. A line anchor (`#L3`, `#L3-L9`) is valid on a Markdown
file only when the link asks for the source view with `?plain=1`.

These are not links, on either side of a check:

- Anything inside a fenced code block or an inline code span, so a link shown as a sample is never resolved or fetched
- Anything inside an HTML comment, single-line or multi-line, apart from a port signal that carries a URL: a
  [routing comment](#routing-comments) into this repo is resolved, and one that routes to another repository is fetched like a
  link, because the port publishes it. A port signal that routes to a docs-site slug names no URL, so there is nothing to check here.
- A relative target under a `dist/` or `coverage/` folder: build output is never tracked, so the tree cannot confirm it

#### Routing comments

The [port-signal comments](single-source-of-truth.md#port-signals) sit under reference-style link definitions:

```markdown
[kernel-package]: ../../backend/core/kernel/README.md#architecture
<!-- docs@tether.io: kernel-package → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md#architecture -->
```

The URL in the comment is what the port pipeline publishes, and the public mirror lags this repo, so the local tree is the
reference: its path and fragment are resolved here, `blob/` or `tree/`, under the same rules as any other in-repo link.

| Comment                                                                         | Result                                                        |
|---------------------------------------------------------------------------------|---------------------------------------------------------------|
| Path or fragment the tree does not have                                         | Fails                                                         |
| Names this repo's public URL but does not parse (ASCII `->`, a slug with a space) | Fails, so a drifted comment is never silently skipped         |
| Ref containing a slash, such as `release/0.14.0`                                | Fails, with a hint naming the path that would have resolved   |
| Ref that is neither `main` nor the current release tag                          | Fails; [refs](#public-urls-into-this-repo) are checked on every public URL |
| No link definition above it                                                     | Fails, since the port would drop it                           |
| Label names a different slug from the definition above it                       | Warning; a difference only in case is silent                  |
| Path differs from where its own definition resolves                             | Warning, since a page can route readers to a different public destination |

A comment binds to the reference definition directly above it, past any other comment lines, because that is how the port reads
it; the label in the comment is not used to find it. A warning never fails the run.

#### Public URLs into this repo

A `github.com/tetherto/mdk/blob|tree/<ref>/` or `raw.githubusercontent.com/tetherto/mdk/<ref>/` URL names a path in this tree,
whatever file it sits in: Markdown prose, a contract's `$schema`, a link in a doc comment. None of them is ever fetched. Each is
resolved against the local tree with the same path and fragment rules.

The ref must be `main` or the tag of the root [`package.json`](../../../package.json) version (`v<version>`).
[`npm run release:bump`](../../../RELEASING.md#release-checklist) pins every such link to the release tag before that tag exists,
which is why only an offline check can validate them at release time. Changelogs are history and keep the tag they were written
at: [`CHANGELOG.md`](../../../CHANGELOG.md) and the [changelog archive](../changelog-archive/2026-archive.md) are neither pinned
nor ref-checked; their paths are still resolved.

The tree a path is resolved against depends on the ref:

| Ref                                   | Resolved against                                                                  |
|---------------------------------------|-----------------------------------------------------------------------------------|
| `main`                                | The working tree                                                                  |
| A tag this clone has                  | That tag's tree (`git ls-tree`)                                                   |
| A tag this clone does not have        | The working tree: the release is not cut yet, or the checkout fetched no tags     |

So once a release is tagged, a link to a page added after it fails at that tag (`not in the tree at v<version>`): write it on
`main`, and the next bump pins it. A changelog link to a file deleted since still passes, because the file is in its tag's tree.
A fragment is checked against the working tree's headings; on a file only an older tag has, it is not checked.

Test files, the release scripts, and the scripts under [`docs/scripts/`](../../scripts/) are left out, since their URLs
are fixtures or templates. The bump and the check read that exclusion list from the same module. In Markdown the bump also leaves
fenced code and code spans as written, as the check does, so a URL shown as a sample of the convention keeps its `main`.

**Link form.** House style is relative links everywhere; the public URL belongs only in the routing comment. There is no gate on
this. Review carries it, and the sweep is one command, worth running at release prep:

```sh
git grep -nE '\]\(https://github\.com/tetherto/mdk/(blob|tree)/|^\[[^]]+\]:\s*https://github\.com/tetherto/mdk/(blob|tree)/' -- '*.md'
```

Non-file GitHub pages (`actions/`, `issues`, `releases/tag/`) are fine as full URLs; the root `README.md` uses them.

### External links

The wrapper writes every external URL in scope to one generated HTML page in a temporary folder and points linkinator at that
page. linkinator's local server serves that page and nothing else, so it never crawls the repo, and
[`linkinator.config.json`](../../../linkinator.config.json) sets `recurse: false` so it never crawls the sites the docs link to
either. A broken row names every source line that carries the URL.

A URL is external when it is `http(s)`, is not a public URL into this repo, and its host is a dotted name. `localhost`, an IP
literal, or a URL that runs into a placeholder such as `https://<host>/` is treated as a sample and never fetched. Put any other
sample URL in a code span.

Comments in JS and TS source are in scope, block and line comments alike, since a comment is read. Test folders and the files
[excluded from public-URL checks](#public-urls-into-this-repo) are left out. A URL in a string, or in a file of another type such
as YAML or a `package.json`, is not read.

#### Skip list

`skip` entries in [`linkinator.config.json`](../../../linkinator.config.json) are regexes matched against the URL, under the
shared [skip-list rules](#skip-lists). Every entry must be a URL pattern, since in-repo links never reach linkinator;
[`test/link-check-scope.test.mjs`](../../../test/link-check-scope.test.mjs) enforces that and the note rule. A temporary upstream
`404` is something to push back on, not a skip-list entry.

**Why the firewall allowlist is a separate file.** `skip` stops linkinator checking a URL;
[`sfw-env.sh`](../../scripts/sfw-env.sh) does the opposite, letting the request through so the check can run. A host that needs
`bypass` is one that is still checked, so merging the lists would invite "allowlisting" by moving a host to `skip` and silently
dropping it from verification.

#### Status codes downgraded to warnings

`statusCodes` in [`linkinator.config.json`](../../../linkinator.config.json) maps a few statuses to `warn`: the link is counted OK, and the wrapper
prints it as a `warned [status] url` row and adds `, N warned` to the closing line.

- `401`, `403`: auth-walled but real. The server answered, so the link is not broken.
- `429`: rate limiting is a property of the crawl, not of the link.
- `503`: temporary unavailability. Already retried (`retryErrors`), so not evidence the link is gone. Pinned partner-contract URLs are verified
  nightly by `external-contract-check.yml`, which reads each contract rather than the page's
  status.

Link rot normally shows as `404`, which still fails. The remaining exposure is a fragment: with `checkFragments: true`, linkinator
checks one on any OK response whose body is HTML, so an external URL that carries a `#fragment` can still report broken when the
host answers with a `503` error page.

#### Pinned version

Pin linkinator to an **exact** version in [`docs/scripts/link-check.mjs`](../../scripts/link-check.mjs), not a `^` range.
`npx --yes linkinator@^7.6.0` reuses any cached build that satisfies the range instead of resolving again, so CI can run a stale
build while a fresher local cache runs a fixed one, and a link passes on one and fails on the other. An exact pin forces one build
everywhere.

#### Firewall allowlist

If `npm` routes through Socket Firewall (`sfw`), `sfw` blocks unrecognized hosts by default and stalls any command whose toolchain
reaches one. `npm run link-check` triggers it: linkinator serves its one page from an ephemeral local HTTP server (random port
each run; `sfw` matches on hostname, so the port does not matter), then fetches every external URL. So does a broad
`npm run build` or `build:registry` in the [`ui/`](../../../ui/README.md) workspace, which pulls in dev tooling like linkinator
(the registry build itself makes no outbound requests). One allowlist unblocks both.

[`docs/scripts/sfw-env.sh`](../../scripts/sfw-env.sh) holds the full allowlist as one `SFW_CUSTOM_REGISTRIES` export
(comma-delimited `bypass:<host>` entries, in the syntax of the
[SFW configuration wiki](https://github.com/SocketDev/firewall-release/wiki/Configuration)), with a comment on every host
explaining which doc or link put it there. Source it once from your shell profile:

```bash
[ -f "/absolute/path/to/mdk/docs/scripts/sfw-env.sh" ] && source "/absolute/path/to/mdk/docs/scripts/sfw-env.sh"
```

This only allowlists these specific, already-known-good hosts. It does not set `SFW_UNKNOWN_HOST_ACTION`, so `sfw` still blocks
everywhere else by default. If `link-check` starts blocking a *new* host (a fresh doc links to a domain not in the file yet), add a
`bypass:<host>` entry to [`sfw-env.sh`](../../scripts/sfw-env.sh) instead of reaching for `SFW_UNKNOWN_HOST_ACTION=warn`: that
flag silences the check for *every* unknown host, not just the one you are trying to unblock. Use it only as a scoped, one-off
prefix while diagnosing which host is blocked, never persisted:

```bash
SFW_UNKNOWN_HOST_ACTION=warn npm run link-check   # scoped to this one command
```

`npm run link-check -- --offline` makes no request at all, so it runs behind any firewall.

### Repo name

Markdown here is promoted to the public `mdk` repo, so [`docs/scripts/link-check.mjs`](../../scripts/link-check.mjs) also fails on any tracked `.md`
line naming this repo, code blocks included. Write sample paths as `/path/to/mdk/...` and say "this repo" in prose.

### What a run reports, and the hollow-sweep guard

Findings and one closing line go to stderr, online or `--offline`, on both CI jobs. In GitHub Actions the closing line is also on the
job's summary page.

```text
link-check: <N> files resolved offline (<N> broken), <N> external links fetched (<N> skipped, <N> broken)
link-check: <N> files resolved offline (<N> broken), <N> external links fetched (<N> skipped, <N> broken, <N> warned)
link-check: <N> files resolved offline (<N> broken), no external links fetched
```

| Output                                             | Meaning                                                                                  |
|----------------------------------------------------|------------------------------------------------------------------------------------------|
| `Broken in-repo links (N):` and `file -> target` rows | In-repo failures                                                                      |
| `[status] url (in file:line, …)`                   | A broken external URL and every source line that carries it                              |
| `warned [status] url (in file:line, …)`            | A status the config [downgrades to `warn`](#status-codes-downgraded-to-warnings); does not fail the run |
| `no external links fetched`                        | `--offline`, or a scoped run over files that carry no external URL                       |

**A run that ends without the closing `link-check:` line was cut short.** Its absence is a failed run, not a clean one.

The run fails on any broken link in either half, on a [repo-name](#repo-name) hit, and on a hollow sweep. A hollow sweep is a run
that could not have found anything: a full sweep that extracted no external URL from the tree, a linkinator report with no rows,
a generated page that came back `SKIPPED` because a `skip` entry matched linkinator's own local server, or a full sweep in
which every URL was skipped. A scoped run whose files carry only skipped URLs is not hollow. Each prints a `link-check -> …` row naming the possible causes, and fails whatever linkinator's own exit
status says.

With `LINK_CHECK_FORMAT=json`, the broken external rows are also written to stdout as `{ passed, links }`, the shape the nightly
workflow parses; `passed` is the verdict of the whole run, in-repo half included. `json` is the only accepted value; any other fails the run.

### CI wiring

[`.github/workflows/link-check.yml`](../../../.github/workflows/link-check.yml) runs in nightly and PR modes, both through
`npm run link-check` and the same [`linkinator.config.json`](../../../linkinator.config.json). No project dependencies are
installed in the runner. Both jobs check out full history, which brings the release tags that
[pinned links](#public-urls-into-this-repo) are resolved against.

**Nightly full sweep** (`linkinator` job, `schedule` + `workflow_dispatch`):

- Cron `0 2 * * *` (02:00 UTC) plus `workflow_dispatch` for manual triggering
- Runs `LINK_CHECK_FORMAT=json npm run link-check` with no file arguments, so every external URL in the tree is fetched
- On failure, updates its `link-check` [tracking issue](#tracking-issues) with the broken external rows from the JSON report and the ` -> ` rows from
  stderr. There is one issue per branch, titled by branch, and the run **edits its body in place** rather than commenting, so consecutive failing
  nights never grow into a thread. A clean leg closes only its own branch's issue. A run that did not report
  (step budget exceeded, or no parseable report) lands in the same issue with a warning that nothing on the branch was verified: treat that as
  unknown, not as passing. A hollow sweep is listed as its `link-check -> …` row.
- Surfaces the failure in the Actions run history (`exit 1`) after the issue is composed, so the repo's main page shows red

**PR diff gate** (`link-check-diff` job, `pull_request`, gated with `if: github.event_name == 'pull_request'`):

- Triggered on every PR, with no path filter: renaming or deleting a source file or a folder breaks the links into it without
  touching a line of Markdown
- Runs the checkers' own unit tests before anything else; they need no network access and no install step
- Computes the added and modified `.md` files in the diff (`git diff --diff-filter=ACMR …`, which drops deleted files) and passes that list to
  `npm run link-check -- <files...>`, which fetches only the external URLs those files carry. An argument that is not a tracked file carrying links is
  ignored with a warning and never narrows the sweep, so a stray flag cannot collapse the check to nothing.
- **The in-repo half and the repo-name scan always run in full**, whatever the diff. A heading rename that breaks an inbound anchor in an untouched
  page fails the PR that renames it, and a PR that only deletes pages still runs this half (`npm run link-check -- --offline`).
- A failure fails the check. No issue is opened; that is the nightly's job.
- If the PR changes the config, anything under [`docs/scripts/`](../../scripts/), or the workflow itself, it falls back to a **full**
  `npm run link-check` sweep, since a weakened skip rule or a change to how a check works can expose breakage outside the diff.
- **Known gap**: the PR fetches only the external URLs in the changed `.md` files, so an external URL added to a source comment is fetched by the
  nightly sweep, not by that PR. Treat the PR gate as a fast first line, not a replacement for the nightly.

## Nightly example-path verification

To hand run ahead of the nightly, from the repo root:

```bash
npm run check:example-paths
```

This wraps [`docs/scripts/check-example-paths.mjs`](../../scripts/check-example-paths.mjs), a plain Node script with no new dependency.

**What it checks.** The link check only resolves links (`[text](target)`). A bare `examples/...` path named in prose or inside a fenced code block — `node examples/mvp-site/start.js` in a ```bash``` fence, for instance — is invisible to it by design allowing dead references in prose and fences, not links. `check:example-paths` closes that gap by walking every tracked `.md` file (`git ls-files '*.md'`), extracting `examples/...`-shaped tokens from the raw text, and confirming each one resolves to a real file or directory.

**Resolve-relative-then-root.** A candidate path is checked two ways: relative to the directory of the Markdown file that names it, then relative to the repo root. A miss on both is a finding. This matters because a package can document its own bundled examples using a path that's only correct relative to the package itself — e.g. a hypothetical `backend/workers/miners/<vendor>/USAGE.md` naming a script in its own `examples/` subdirectory (say a `run-runtime-parity.js` file) by joining just those two segments: a root-relative miss (the repo root has no such top-level directory), a file-relative hit (the package's own `examples/` subdirectory does contain it).

**Skip policy — [`example-paths.config.json`](../../../example-paths.config.json) at repo root**, mirroring [`linkinator.config.json`](../../../linkinator.config.json)'s shape:

- `skipFiles` — whole Markdown files excluded from scanning (glob patterns): historical records (`docs/reference/changelog-archive/**`, [`CHANGELOG.md`](../../../CHANGELOG.md)) that correctly name paths as they existed at the time they were written, not as they exist today.
- `skipPaths` — specific `examples/...` paths excluded wherever named: tutorial output the reader builds from scratch (`examples/minimal-dashboard`, built by [`docs/tutorials/build-a-dashboard.md`](../../tutorials/build-a-dashboard.md)) and gitignored runtime state created on first run (`examples/mvp-site/.site-data`).
- `_skip_notes` — one reason per `skipFiles`/`skipPaths` pattern, under the [shared skip-list rules](#skip-lists).
- Placeholders are dropped automatically, not via the skip list: any candidate token immediately followed by `<`, `>`, `*`, `{`, `}`, or `…` (for example `examples/run-<scenario>.js` or `` examples/run-*.js ``) is treated as unresolved template text, not a real path.

**CI wiring** — `.github/workflows/example-paths.yml`. Nightly only, with no PR gate. On failure the `example-paths` job comments on its `example-paths` [tracking issue](#tracking-issues), then exits non-zero so the run shows red.

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

**Known weakness: presence is not emission.** The checker tests whether the code appears anywhere in the package, not whether the
package emits it. The search covers every tracked non-Markdown file, so a code passes when the package only mentions it: in a test
file, in a comparison such as `err.code !== 'ERR_X'`, in a status map, or in a generated file such as `openapi.json`. A row for a
code that another package owns is therefore flagged only when the README's own package never names that code. The check does not
enforce the rule that an error row lives in the package that throws it, so confirm the emit site by reading the source when adding
or reviewing a row.

**Skip policy — [`table-refs.config.json`](../../../table-refs.config.json) at repo root**, same shape and enforcement discipline as [`example-paths.config.json`](../../../example-paths.config.json):

- `skipFiles` — whole Markdown files excluded from scanning (glob patterns).
- `skipIdentifiers` — `{ "file": "<relative md path>", "identifier": "<string>" }` pairs, scoped to one file rather than a bare global identifier list, so a short common string that's a false positive in one file doesn't blind the checker to every file at once.
- `_skip_notes` — one reason per entry, keyed by the glob string or `"<file>::<identifier>"`, under the [shared skip-list rules](#skip-lists). Typical entries are a wildcard row, or an error code that source builds from a template, so the full code never appears as a literal.

**CI wiring** — `.github/workflows/table-refs.yml`. Nightly only, with no PR gate. On failure the `table-refs` job comments on its `table-refs` [tracking issue](#tracking-issues) and emits a warning annotation; the run stays green (non-blocking).

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
`markdownlint-cli` runs the same `markdownlint` engine as `markdownlint-cli2`. It replaced `markdownlint-cli2` because that CLI's `globby` → `micromatch` → `braces` chain carries an
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
