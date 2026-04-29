# Security policy

## Supported versions

MDK is currently in active development and has not reached a stable (`x.y.z`) release yet.

Until stable releases are available, security support is provided for:

- The latest commit on `main`
- The most recent pre-release tags (`*-beta`, `*-rc`)

Older pre-release versions may not receive security fixes.

## Reporting a vulnerability

Please do **not** open public GitHub issues for security vulnerabilities.

Instead, report security issues privately via:

- GitHub Security Advisories: [Report a vulnerability](https://github.com/tetherto/mdk/security/advisories/new)

Include as much detail as possible:

- Affected component(s) and version/commit
- Steps to reproduce
- Impact assessment
- Any proof-of-concept or logs (if safe to share)
- Suggested mitigation, if known

## Disclosure process

After receiving a report, maintainers aim to:

1. Acknowledge receipt within 3 business days.
2. Confirm whether the issue is valid and in scope.
3. Prepare and release a fix as quickly as possible.
4. Coordinate disclosure timing with the reporter when appropriate.

## Scope notes

Security issues in first-party code under this repository are in scope.

Reports that depend exclusively on unsupported runtimes, modified third-party deployments, or issues already fixed on `main` may be considered out of scope.
