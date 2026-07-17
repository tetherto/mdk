# Releasing MDK

This document is for maintainers cutting a release. For contribution guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Release checklist

Copy this into the PR or release ticket for each release.

### Prepare (private repo)

- [ ] Create release branch: `release/<version>`
- [ ] Update `"version"` in every `package.json` across `ui/`, `backend/core/`, `backend/workers/`, and `examples/`
- [ ] Update any pinned `^semver` `@tetherto/*` references in `ui/packages/` to match the new version
- [ ] Run installs in all three domains to refresh lockfiles: `ui/`, `backend/core/`, `backend/workers/`
- [ ] Confirm no unexpected changes in `package-lock.json` files
- [ ] Update `README.md` — version badge and any inline version references
- [ ] Add entry for `v<version>` in `CHANGELOG.md`
- [ ] Add release notes file at `docs/reference/release-notes/<version>-release.md`
- [ ] Run tests — pass
- [ ] Run build — pass
- [ ] Private CI passes on the release branch

### Promote

- [ ] Promote the verified commit to the public repo (`mdk`)
- [ ] Spot-check a `package.json` version to confirm the commit arrived intact

### Verify and tag (public repo)

- [ ] Confirm all `package.json` versions match the release version
- [ ] Public CI passes
- [ ] Create tag: `v<version>`
- [ ] Push tag to origin

### Publish

- [ ] Publish from the tagged commit
- [ ] Confirm published packages show the correct version
