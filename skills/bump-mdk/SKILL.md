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

## Fast path: the release scripts

The whole release line moves to one fixed version, with the root `package.json` as the source of
truth. Two dependency-free scripts in `scripts/release/` do what the rest of this file describes by
hand:

```bash
node scripts/release/bump.mjs <version> [--dry-run] [--skip-registry] [--offline]
node scripts/release/check.mjs [<version>] [--offline]
```

`bump.mjs` sets every `version`, rewrites every internal `@tetherto/mdk-*` `^X` pin in all four
dependency fields (`devDependencies` included), moves the release-line `mdk-app.yaml` files, the
README release links and the link-check skip list, regenerates every lockfile and the UI registry,
then runs `check.mjs`. `check.mjs` is the version, pin, app, private-flag and lock-drift checks in
one command; it exits 1 on any problem. Neither command commits, tags or publishes.

Use the manual procedure below when the scripts cannot run, or to understand what they did. A
package that must stay off the line (the vendored `mdk-crypto-lib`) is listed, with a reason, in
`OFF_LINE` in `scripts/release/lib.mjs`. The npm publish plan is still a separate dry run.

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
  `ui/package-lock.json`. Members: `packages/{ui-foundation,react-adapter,react-devkit,ui-agent}`
  and `apps/*`. Dep flow: `ui-agent → react-devkit → react-adapter → ui-foundation`.
  - ⚠️ **The three dependent UI packages pin their siblings with `^X` ranges**:
    `react-adapter` → `ui-foundation`; `react-devkit` → `react-adapter`, `ui-foundation`;
    `ui-agent` → `react-adapter`, `react-devkit`, `ui-foundation`. When you bump those
    packages, bump these `^` ranges too, or `npm install` fails with
    `404 … @tetherto/mdk-* @^X not found` (it falls through to the registry because
    nothing local satisfies the range).
  - The four packages are published to npm, so they are `private: false`. Keep them that
    way: the npm publish step skips private packages without an error.
  - Regenerate the whole workspace with **one** command: `cd ui && npm install --package-lock-only …`.
- **`backend/core/*`**: `agent, app-runtime, client, gateway, identity, kernel, mcp, mdk,
  mdk-worker, rbac` are all root npm workspace members, sharing the single root
  `package-lock.json`. Regenerate the **root** lock (`npm install
  --package-lock-only …` at the repo root) when any of these change, not a
  per-package one.
  They pin each other with `^X` ranges (for example `gateway` → `app-runtime`, `identity`,
  `rbac`). Bump those ranges with the versions, or npm stops resolving the workspace
  member and falls through to the registry. The pin check below lists every one.
- **`packages/cli`** and **`packages/mdk-skill`**: root workspace members too. `cli` pins
  most of the backend packages with `^X`, and the scaffold templates under
  `packages/cli/templates/` pin `^X` as well. A scaffolded project installs those from
  the registry, so a stale template pin installs an old release.
- **`mdk-app.yaml` files on the release line** — no `package.json` beside
  them, so no validator catches drift; bump their `version` by hand:
  `examples/mvp-site/backend/gateway-plugins/site/mdk-app.yaml` and
  `backend/tests/benchmark/plugin/fleet-summary/mdk-app.yaml`. Leave
  `packages/cli/templates/app/mdk-app.yaml` at `0.1.0`: `mdk create app` resets a
  scaffold's `package.json` to `0.1.0` to match it, even though the template's
  `package.json` tracks the release.
- **`backend/workers/*`** — independent worker packages, also root workspace
  members sharing the root lock.
- **`examples/*`** — `examples/mvp-site` (the backend half) is a root workspace member sharing the
  root lock. The UI shells
  (`examples/mvp-site/ui`,
  `examples/mdk-ui-shell-template`) are the ones left with their own
  independent locks; they `file:`-link the `ui/packages/*` packages, so a ui
  bump cascades into their locks. Because the CI gate skips `examples/`, these
  are the locks most likely to be stale.

As of the 0.6.0 cycle versioning is **uniform across the release line**: every
tracked package sits at the same version, `mdk-worker` no longer lags, and
`mdk-ui-shell-template` has moved off its scaffold default onto the shared
version — treat it as a normal package in future bumps. The `mdk-app.yaml` versions listed
in the topology are on the release line too.

Still **never blanket-set versions by find-and-replace.** Confirm the current spread
first by *parsing* each manifest, not grepping it (a bare `grep -m1 '"version"'` can
latch onto a nested field):

```bash
for f in $(git ls-files '*package.json'); do
  node -e 'const j=require("fs").readFileSync(process.argv[1],"utf8");const o=JSON.parse(j);console.log(`${o.version??"<none>"}\t${process.argv[1]}`)' "$f"
done | sort | grep -v '^<target>'   # lists everything not already at the target
git ls-files '*mdk-app.yaml' | xargs grep -H '^version:'   # app manifests (YAML, top-level key only)
```

Then the **pin check**. The npm publish step accepts an internal pin only when it is
exactly `^<release>`: at release `0.12.2`, a leftover `^0.12.1` stops the publish even
though npm itself would resolve it, and `*` is rejected too. `*` is fine only in
`private: true` packages. Before the bump this lists every pin; after it, it should print
nothing. If it prints nothing *before* the bump, the check is broken, not clean.

```bash
T=<target>
git ls-files '*package.json' | grep -v '/node_modules/' | while IFS= read -r f; do
  node -e '
    const [f, t] = process.argv.slice(1)
    const o = JSON.parse(require("fs").readFileSync(f, "utf8"))
    for (const k of ["dependencies", "peerDependencies", "optionalDependencies"])
      for (const [d, s] of Object.entries(o[k] || {})) {
        if (!d.startsWith("@tetherto/mdk-") || s === `^${t}` || s.startsWith("file:")) continue
        if (s === "*" && o.private === true) continue
        console.log(`${f}\t${k}\t${d}@${s}`)
      }' "$f" "$T"
done
```

And the **private-flag check**: a package that is on npm but `private: true` here is
skipped by the publish step without an error, so the release ships without it. Want no
output.

```bash
git ls-files '*package.json' | grep -v '/node_modules/' | while IFS= read -r f; do
  read -r n p < <(node -e 'const o=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));console.log(o.name??"-",o.private===true)' "$f")
  [ "$p" = true ] && [ "${n#@tetherto/}" != "$n" ] || continue
  code=$(curl -s -o /dev/null -w '%{http_code}' "https://registry.npmjs.org/${n/\//%2F}")
  [ "$code" = 200 ] && echo "PRIVATE BUT ON NPM: $n ($f)"
done
```

## Procedure

1. **Confirm target + scope.** Which packages move to which version. If fixing a
   red CI gate, first read the failing job log — it names the package and shows
   the `-/+ "version"` diff telling you which value is intended.

2. **Edit `package.json` version fields** for the in-scope packages (use `Edit`
   on the exact `"version": "…"` line). Move every `@tetherto/mdk-*` dependency
   pinned at `^<old>` to `^<new>` in the same pass: the UI siblings, the core packages'
   pins on each other, `cli` and its templates. For every app on the
   release line, set `version:` in its `mdk-app.yaml` to the same value.
   Then run the pin check from the topology section; it should print nothing.

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

   Then dry-run the npm publish plan. The script (`.github/scripts/npm-publish.mjs`) lives
   in the public repo; copy it if your checkout lacks it. It reads the working tree it runs
   in (`--ref` is only a label) and the registry, and fails with `plan failed` on any
   version or pin mismatch:

   ```bash
   node path/to/npm-publish.mjs plan --ref <branch>   # from the repo root
   ```
   Every package you expect to ship should appear in a wave. One that is missing is
   `private: true`.

6. **Commit & push only with explicit permission.** Stage `package.json` +
   `package-lock.json` together so the tree is always self-consistent.

## Gotchas seen in the wild

- A merge that takes one branch's `package.json` but another's `package-lock.json`
  yields `pkg=0.3.0 / lock=0.4.0`. Decide the intended value (ask / read the
  release), fix `package.json` to it, then regen.
- Bumping a ui package but forgetting the `^` pins in react-adapter, react-devkit or
  ui-agent → `npm install` 404s, and the publish step rejects the release. Always bump
  the range pins in lockstep, then run the pin check.
- Bumping an app's `package.json` but not its `mdk-app.yaml` → `mdk validate app`
  and `mdk add app` fail, while `mdk run` still boots it. The lockfile gate does not
  notice either, so check every `mdk-app.yaml` on the release line by hand.
- Checking only a lock's root `version` misses embedded `file:`-dep drift
  (gateway, example UIs). Always run the full per-lock regen in step 4.
- Node/npm version differences can reshuffle lock formatting. Use the repo's
  expected Node (CI uses `lts/*`, engines want `>=24`).
