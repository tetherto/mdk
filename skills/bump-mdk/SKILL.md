---
name: bump-mdk
description: Bump package versions across the MDK monorepo and resync every affected lockfile the way CI expects. Use when raising a release version, when the "package-lock.json is out of sync with package.json" gate is red, or after a merge that left package.json / package-lock.json versions mismatched.
argument-hint: "[target-version] [scope: ui|core|workers|examples|all — default all] "
allowed-tools: [Bash, Read, Edit, Grep, Glob]
---

# Bump MDK versions

Raise versions across the monorepo and regenerate **every** lockfile that
cascades from the change, so the lockfile-sync gate stays green.

Target version: **$ARGUMENTS** (e.g. `0.4.0`, optionally a scope). If empty, ask
what to bump to and confirm scope.

## The gate this satisfies

CI runs, **per package**, from that package's directory:

```bash
npm install --package-lock-only --ignore-scripts --no-audit --no-fund
git diff --exit-code <that>/package-lock.json
```

If regenerating the lock produces *any* diff, the job fails with
`package-lock.json is out of sync with package.json`. So the rule is simple:
**after editing any `package.json`, regenerate the locks and commit a tree where
that command yields zero diff.**

⚠️ **The gate does NOT cover `examples/`.** The lockfile-consistency step runs
only for the ui, core and workers installs; the examples job warms the dependency
cache without checking anything. Example locks can therefore drift for entire
release cycles without turning CI red — one has been found carrying embedded ui
versions two releases stale. Always regenerate and inspect the `examples/*` locks
yourself; never infer they are clean from a green CI run.

## Repo version topology (why one bump cascades)

Packages are wired together with `file:` links, so bumping one package's version
changes the *embedded* version recorded in the lockfile of every package that
links it. The drift is often NOT in a lock's own `version` field — it's in the
embedded `file:`-dependency entries.

- **`ui/`** — a single npm workspace (Turborepo) with **one** root
  `ui/package-lock.json`. Members: `packages/{ui-foundation,react-adapter,react-devkit,ui-agent,cli,fonts}`
  and `apps/*`. Dep flow: `react-devkit → react-adapter → ui-foundation`.
  - ⚠️ **`packages/react-devkit/package.json` pins internal deps with ranges**
    (`@tetherto/mdk-react-adapter: ^X`, `@tetherto/mdk-ui-foundation: ^X`). When
    you bump those packages, bump these `^` ranges too, or `npm install` fails
    with `404 … @tetherto/mdk-* @^X not found` (it falls through to the registry
    because nothing local satisfies the range). `cli` similarly pins
    `@tetherto/mdk-react-devkit: ^X`.
  - Regenerate the whole workspace with **one** command: `cd ui && npm install --package-lock-only …`.
- **`backend/core/*`** — `agent, client, plugins, gateway, mdk, kernel, mcp,
  mdk-worker` are all root npm workspace members, sharing the single root
  `package-lock.json`. Regenerate the **root** lock (`npm install
  --package-lock-only …` at the repo root) when any of these change, not a
  per-package one.
  `gateway` `file:`-links `client` and `plugins`, so bumping client/plugins
  forces a root lock regen (that's where `gateway`'s dependency entries now
  live).
- **`backend/plugins/*`** — gateway plugins, also root workspace members
  sharing the root lock, versioned independently of the release line (`agent`
  is at `0.1.0` while the repo is at `0.6.0`), so a release bump does **not**
  touch them. Their `@tetherto/*` deps are linked, never fetched, so pin them
  at `*`: a version range there resolves against nothing and rots unnoticed —
  the agent plugin sat at `^0.0.0` across several releases with nothing to
  catch it.
- **`backend/workers/*`** — independent worker packages, also root workspace
  members sharing the root lock.
- **`examples/*`** — `examples/full-site` and `examples/mvp-site` (the backend
  halves) are root workspace members sharing the root lock. The UI shells
  (`examples/full-site/ui`, `examples/mvp-site/ui`,
  `examples/mdk-ui-shell-template`) are the ones left with their own
  independent locks; they `file:`-link the `ui/packages/*` packages, so a ui
  bump cascades into their locks. Because the CI gate skips `examples/`, these
  are the locks most likely to be stale.

As of the 0.6.0 cycle versioning is **uniform across the release line**: every
tracked package sits at the same version, `mdk-worker` no longer lags, and
`mdk-ui-shell-template` has moved off its scaffold default onto the shared
version — treat it as a normal package in future bumps. Packages outside the
release line (`backend/plugins/*`) keep their own versions.

Still **never blanket-set versions by find-and-replace.** Confirm the current spread
first by *parsing* each manifest, not grepping it (a bare `grep -m1 '"version"'` can
latch onto a nested field):

```bash
for f in $(git ls-files '*package.json'); do
  node -e 'const j=require("fs").readFileSync(process.argv[1],"utf8");const o=JSON.parse(j);console.log(`${o.version??"<none>"}\t${process.argv[1]}`)' "$f"
done | sort | grep -v '^<target>'   # lists everything not already at the target
```

## Procedure

1. **Confirm target + scope.** Which packages move to which version. If fixing a
   red CI gate, first read the failing job log — it names the package and shows
   the `-/+ "version"` diff telling you which value is intended.

2. **Edit `package.json` version fields** for the in-scope packages (use `Edit`
   on the exact `"version": "…"` line). If bumping a ui package that others pin
   by range, also bump those `^` ranges (react-devkit, cli — see topology).

3. **Regenerate locks** where things changed. Fast path — regenerate the ui
   workspace once and every backend/examples package dir:

   ```bash
   cd "$REPO/ui" && npm install --package-lock-only --ignore-scripts --no-audit --no-fund
   cd "$REPO"
   git ls-files 'backend/**/package-lock.json' 'examples/**/package-lock.json' \
     | xargs -n1 dirname | sort -u \
     | while IFS= read -r d; do (cd "$d" && npm install --package-lock-only --ignore-scripts --no-audit --no-fund >/dev/null 2>&1); done
   ```

4. **Verify — the CI-equivalent drift check across ALL locks:**

   ```bash
   git ls-files '*package-lock.json' | xargs -n1 dirname | sort -u | while IFS= read -r d; do
     ( cd "$d" && npm install --package-lock-only --ignore-scripts --no-audit --no-fund >/dev/null 2>&1 )
     git -C "$REPO" diff --quiet -- "$d/package-lock.json" || echo "STILL DRIFTS: $d"
   done
   git status --porcelain | grep package-lock.json   # the full set that changed
   ```
   Zero `STILL DRIFTS` lines = CI's per-package gate passes.

5. **Sanity the diffs.** Every changed lock line should be a version/range sync
   (`0.3.0`→`0.4.0`, `^0.3.0`→`^0.4.0`) or benign format normalization (npm
   populating an empty `"packages": {}`). Anything else (new deps, removed deps,
   integrity churn) means something beyond a version bump moved — investigate.

6. **Commit & push only with explicit permission.** Stage `package.json` +
   `package-lock.json` together so the tree is always self-consistent.

## Gotchas seen in the wild

- A merge that takes one branch's `package.json` but another's `package-lock.json`
  yields `pkg=0.3.0 / lock=0.4.0`. Decide the intended value (ask / read the
  release), fix `package.json` to it, then regen.
- Bumping a ui package but forgetting react-devkit's `^` pins → `npm install`
  404s. Always bump the range pins in lockstep.
- Checking only a lock's root `version` misses embedded `file:`-dep drift
  (gateway, example UIs). Always run the full per-lock regen in step 4.
- Node/npm version differences can reshuffle lock formatting. Use the repo's
  expected Node (CI uses `lts/*`, engines want `>=24`).
