# Linters

Maintainer-facing inventory of the lint tooling that guards this monorepo's documentation. Two layers:

- 🚧 Project-specific IA gates 🚧 — five **proposed** gates defined in [`ia.md`](ia.md#qa-gates) (`check:contract`, `check:facets-fresh`, `check:agent-ready`, `check:port-signals`, `check:integrations-fresh`). **If adopted**, they would enforce the contract between code, the docs catalogue, and the port pipeline. None are wired today; engineering decides per-gate, and docs maintainers absorb the upkeep manually for any gate not adopted.
- **General docs hygiene** — the rest of this file. Link verification, anchor validation, spelling. These guard the docs themselves, not the IA contract.

## Link verification — linkinator

To hand run ahead of the nightly, from the repo root:

```bash
npm run link-check
```

This wraps `linkinator --config linkinator.config.json "**/*.md"`, so the config is the single source of truth — fragment checking and every skip pattern live there, nothing is repeated on the command line. The nightly CI runs the same script. (Earlier docs showed a long `npx … --skip …` invocation; that was needed only because CLI `--skip` flags *replace* the config skip list rather than merging, forcing every pattern to be re-listed. Folding `node_modules` into the config removed the last reason to do that.)

[Linkinator](https://github.com/JustinBeckwith/linkinator) checks Markdown files for broken links and (optionally) broken heading anchors. Two cadences run today, both off the same config: a **nightly cron at 02:00 UTC** (full sweep) and a **PR diff gate** that checks only the changed `.md` files — both via [`.github/workflows/link-check.yml`](../../../.github/workflows/link-check.yml). See [CI wiring](#ci-wiring) for the split.

Pin `linkinator@^7.6.0` or newer. Earlier versions silently passed same-page fragment links even when the heading didn't exist; fixed in [#771](https://github.com/JustinBeckwith/linkinator/pull/771) and shipped in 7.6.0.

### How it works

[`linkinator.config.json`](../../../linkinator.config.json) at repo root:

Hand maintained skip list:

`skip` entries are regex matched against **link targets**, not source file paths. Four entries live there today:

| Pattern | Why |
|---|---|
| `node_modules` | Excludes installed-dependency markdown from local runs. No-op in CI (the runner installs nothing), but a maintainer's checkout has `node_modules`, and without this the local `**/*.md` glob would scan thousands of vendored files. |
| `^https://github\.com/tetherto/mdk/blob/main/` | **Temporary.** These links point at the public mirror and already use the *predicted* post-reorg paths; they `404` until the same reorg lands on the public repo. Remove this entry once that ships so the links are validated again. |
| `workers/miners/[^/]+/examples/?$` | Bare example directories (no `index`/`README` to serve) — see the bare-directory false-positive note below. `$`-anchored so it matches only the directory itself, never deeper files. |
| `workers/[^/]+/base/?$` | Bare `base/` worker directories — same false-positive class, same `$` anchoring. |

Add new entries only when the broken target can't be fixed in the source — a temporary upstream 404 is something to push back on, not a skip-list entry. Keep directory-target skips `$`-anchored (see below).

### Known false positive: bare directory targets

Markdown links that point at a bare directory (for example ``[`backend/core/app-node/`](backend/core/app-node/)``) are reported as `404` by linkinator. They are not actually broken — GitHub renders directory URLs as a tree view — but linkinator serves the repo via an ephemeral local HTTP server, and there is no `index.html` inside those folders for the server to return.

Do **not** silence these by adding the directory prefix to `skip`. Skip patterns are regex matched against link targets without implicit anchoring; an entry like `ui/` would also silence every deeper link (`ui/README.md`, `ui/docs/USAGE.md`, ...), creating false negatives that hide real breakage. Anchored exact-match patterns (`^http://localhost:[0-9]+/ui/$`) work in theory but are fragile across linkinator versions and accumulate.

The convention is to point such links at a concrete file inside the directory — a `README.md`, `USAGE.md`, `index.js`, or the canonical entry source — so the link checker and the human reader both land somewhere meaningful. If the directory has no obvious landing file, keep the directory link: it resolves correctly on GitHub, so delinking it would strip working navigation just to satisfy a linkinator false positive. Treat the resulting local `404` as an accepted false positive instead.

### Fragment checking — enabled

`checkFragments: true` is now on. It was deliberately rolled out in two stages:

1. The first nightlies ran with `checkFragments: false` to surface the basic signal — broken external URLs, redirect chains, the known directory false positives — without anchor noise layered on top. That was the calibration baseline.
2. Once that baseline was clean (verified repo-wide: every internal `.md`-to-`.md` anchor resolves), the flag was flipped to `true`.

The silent-failure mode it catches is exactly the one you most need it for: a heading rename in (say) [`ia.md`](ia.md) invalidates every inbound `#derived-vocabulary` reference, and without anchor validation the link still returns OK because the target file exists.

One linkinator quirk worth knowing when reading reports: a **valid** fragment is folded into its base-file `OK` entry and never listed separately. Only **broken** fragments appear as their own `#`-bearing `BROKEN` line. So "no `#` links in the report" means all anchors passed, not that none were checked.

### CI wiring

[`.github/workflows/link-check.yml`](../../../.github/workflows/link-check.yml) runs in two modes, both off the same `linkinator.config.json`.

**Nightly full sweep** (`linkinator` job — `schedule` + `workflow_dispatch`):

- Cron `0 2 * * *` (02:00 UTC) plus `workflow_dispatch` for manual triggering. Gated with `if: github.event_name != 'pull_request'` so it never runs the full sweep on a PR.
- Runs `npm run link-check` (the same script maintainers use locally), which invokes `linkinator@^7.6.0` against `**/*.md` using the root config; no project dependencies are installed in the runner.
- On failure, opens a tracking issue labelled `link-check` via the pre-installed `gh` CLI. If an open `link-check` issue already exists, the run **comments on it** instead of opening a duplicate — daily failures collapse into one thread, not a daily new issue.
- Surfaces the failure in the Actions run history (`exit 1`) after the issue is composed, so the repo's main page shows red.

**PR diff gate** (`link-check-diff` job — `pull_request`, gated with `if: github.event_name == 'pull_request'`):

- Triggered only when a PR touches `**/*.md`, `linkinator.config.json`, or the workflow itself (path filter on the `pull_request` trigger).
- Checks out with `fetch-depth: 0`, then runs linkinator against **only the `.md` files in the diff** (`git diff --diff-filter=ACMR …`, which drops deleted files). A broken link fails the check — no issue is opened; that's the nightly's job.
- `README.md` is always prepended to the file list as an anchor. Linkinator roots its local server at the *common ancestor* of its inputs, so a diff of only deep files would root the server inside that subtree and report every `../`-escaping relative link as a false 404. A repo-root file pins the server root to the repo root; it only adds README's own links to the scan (not a full-tree crawl). **Do not remove it.**
- If the PR changes the config or the workflow, it falls back to a **full** `npm run link-check` sweep, since a weakened skip rule or fragment-setting change can expose breakage outside the diff.
- **Known gap:** the diff gate only validates links *originating from* changed files. A PR that renames a heading breaks inbound `#anchor` references in *other* (unchanged) files, which this job won't see — the nightly full sweep is the backstop for that. Treat the PR gate as a fast first line, not a replacement for the nightly.

## 🚧 Spelling — Vale

Vale catches accidental misspellings and enforces a project word list. Configured via `.vale.ini` at the repo root when present. Runs locally on demand today; CI wiring is a follow-on.

## 🚧 Style — Markdownlint (deferred)

[`markdownlint-cli2`](https://github.com/DavidAnson/markdownlint-cli2) would enforce structural consistency (heading hierarchy, list indentation, fenced code block style). Not wired today; revisit when style drift across the corpus becomes a real friction.

## See also

- [`ia.md`](ia.md#qa-gates) — the five proposed IA-specific lint gates that would enforce contract / catalogue / port-signal correctness if adopted by engineering.
- [`port-signals.md`](port-signals.md) — the link-routing comment vocabulary that `check:port-signals` reads.
