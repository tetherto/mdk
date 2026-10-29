# Releasing MDK

This document is for maintainers cutting a release. For contribution guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Release checklist

Copy this into the PR or release ticket for each release.

### Prepare (private repo)

- [ ] Create release branch: `release/<version>`
- [ ] Run `npm run release:bump -- <version>`. It sets every `package.json` and `mdk-app.yaml` version, moves every internal `@tetherto/mdk-*`
      pin to `^<version>`, updates the README release links, adds the release tag to the `linkinator.config.json` skip list, regenerates every
      lockfile and the UI registry, then runs `npm run release:check`. That covers the version, pin and lockfile-refresh items below, so do those
      by hand only if the script cannot run. Reviewing the lockfile diff, the generated pages, the changelog and the release notes stay manual
- [ ] Update `"version"` in every tracked `package.json` (root, `backend/`, `packages/`, `ui/`, `examples/`; not the vendored `backend/lib/mdk-crypto-lib`), following the [`bump-mdk`](./skills/bump-mdk/SKILL.md) skill
- [ ] Update every pinned `^semver` `@tetherto/mdk-*` reference to the new version: the UI packages' sibling pins, the backend
      packages' pins on each other, and the CLI and its templates. The npm publish step accepts only exactly `^<version>`
- [ ] Run the [`bump-mdk`](./skills/bump-mdk/SKILL.md) pin check and private-flag check against the new version; both print nothing
- [ ] Dry-run the npm publish plan: copy `.github/scripts/npm-publish.mjs` from the public repo and run
      `node npm-publish.mjs plan --ref release/<version>` from the release branch's repo root. It reads only the registry. Expect no
      `plan failed`, and every package meant to ship listed in a wave; a missing one is marked `private`
- [ ] Refresh lockfiles: `npm install` at the repo root, in [`ui/`](./ui/README.md), and in each `examples/**` directory with its own `package-lock.json`; [`bump-mdk`](./skills/bump-mdk/SKILL.md) has the exact commands and drift check
- [ ] Confirm no unexpected changes in [`package-lock.json`](./package-lock.json) files
- [ ] Regenerate the generated pages: `npm run regenerate-docs`, then commit anything it changes
- [ ] Confirm nothing is left stale: `npm run regenerate-docs -- --check` passes. The
      `docs-freshness` workflow enforces the same check as a required status on every PR;
      running it locally first surfaces drift before it turns the release PR red
- [ ] Update [`README.md`](./README.md) — version badge and any inline version references
- [ ] Add entry for `v<version>` in [`CHANGELOG.md`](./CHANGELOG.md)
- [ ] Run tests — pass
- [ ] Run build — pass
- [ ] Private CI passes on the release branch
- [ ] Review the docs queue: list every PR in both repos that still carries `docs-required` (the label comes off when the docs land,
      so anything listed still owes them) and record the open items in this version's [`CHANGELOG.md`](./CHANGELOG.md) entry. An item
      already listed in the prior version's changelog entry has used its one deferral: hold the release until it clears. A release candidate or v1.0 goes out only when no
      docs debt remains. This checklist is the enforcement point until the
      [v1 hard gate](docs/reference/maintainers/README.md#hard-gate-v1) lands; the queue command itself fails nothing in CI.

  ```bash
  for R in "$(gh repo view --json nameWithOwner --jq .nameWithOwner)" tetherto/mdk; do
    gh pr list -R "$R" --label docs-required --state all --limit 100 \
      --json number,title,url --jq '.[] | "\(.url)\t\(.title)"'
  done | sort -u
  ```

### Promote (public repo)

- [ ] Promote the verified commit to the public repo (`mdk`) on a `release/v<version>` branch from a fork, and open the release PR
      to `main` titled `release: v<version>`. Leave the public `.github/` alone, and carry deletions (a directory removed here must be
      removed there too). Change nothing in the shipped directories (`backend/`, `packages/`, `ui/`, `examples/`) on the public side:
      a fix needed there goes into the private release branch first and is promoted again. An edit made only in the public repo is
      lost at the next promotion
- [ ] Confirm the shipped directories arrived intact: with both repos fetched into one clone, run
      `git diff --stat <private-tag> <public-commit> -- backend packages ui examples`. Expect only the promotion's own edits (the
      repository name, links to files that stay private); any manifest, lockfile or source change is drift to fix in the private repo
- [ ] Public CI passes on the release PR, including **📦 Pack Check**: it builds, packs and checks every package the release will
      publish (versions, internal `^<version>` pins, entry files in each tarball). A red Pack Check means the release would ship broken

### Merge and publish (public repo)

Merging the release PR publishes the release to npm: the public repo's `.github/workflows/publish.yml` runs on the commit the merge
lands on `main`, and only when that commit's message contains `release: v` or `release/v`.

- [ ] Merge with **Squash and merge** or **Create a merge commit**, never rebase-merge. The `v` matters in both names: a merge
      commit reads `Merge pull request #<pr> from <fork>/release/v<version>`, so a branch named `release/<version>` (like the
      private one) depends on the PR title alone. With squash, check the title GitHub proposes still reads
      `release: v<version> (#<pr>)`: for a single-commit PR it is taken from the commit, not the PR title
- [ ] Don't create the `v<version>` tag yourself. The workflow tags the merged commit after approval, and stops if a `v<version>` tag
      already points at a different commit
- [ ] In Actions → **Publish to npm**, a member of `mdk-publish` who didn't merge the PR approves the `release` deployment (GitHub
      hides the approve button from whoever merged)
- [ ] Check the run summary: the plan lists every package at `<version>`, published wave by wave in dependency order
- [ ] Confirm the published versions: `npm view @tetherto/mdk-<package> version` for each package. The registry can take a couple
      of minutes to show them

What gets published: every package that is not `private`, has `publishConfig.access: public`, and has `repository` pointing at
`tetherto/mdk` (with its `directory`). All of them must be at `<version>`, and their internal dependencies pinned to `^<version>`. A
package that isn't ready yet is skipped with a warning. The [package reference](./docs/reference/packages.md) marks every package
that isn't private as `publishable`, so check these fields too. A new package also needs an npm trusted publisher (repository
`tetherto/mdk`, workflow `publish.yml`, environment `release`) before its first release, or the preflight stops the whole release.

If the publish doesn't complete:

- **The run was skipped**: the commit on `main` doesn't contain `release: v` or `release/v`. Open a release PR again (a
  `release/v<version>` branch with an empty commit titled `release: v<version>` is enough) to start it
- **Plan, build or preflight failed**: nothing was tagged or published. Fix the cause on `main`, then open a release PR again as
  above to rerun it
- **Publishing failed and needs a fix in the repo**: **Re-run failed jobs** reruns the same commit, so it fails the same way. If no
  package was published yet, delete the tag the run created (`v<version>`), fix the cause on `main`, then open a release PR again as
  above. The new run tags the new commit
- **Publishing stopped partway for an outside reason** (for example an npm outage): use **Re-run failed jobs** on the run. The tag is
  reused and packages already on npm are skipped. Tarballs are kept for 7 days
- **A published version is broken**: npm versions can't be replaced. Deprecate it
  (`npm deprecate @tetherto/<package>@<version> "<reason>"`) and release a patch
