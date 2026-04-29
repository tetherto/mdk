# Contribute to MDK

Thank you for your interest in contributing to **MDK**.

This document outlines the contribution workflow for the MDK repository, from setting up your development environment to submitting pull requests and participating in releases.

## Monorepo structure

MDK is a monorepo with separate backend and frontend workspaces:

- `core/`: Backend services, container modules, and integration/unit tests (npm-based)
- `ui-client/`: Frontend packages, demo app, and shared UI foundation (pnpm + Turbo-based)

Choose the workflow that matches the area you are contributing to.

## Get started

### Prerequisites

Before contributing, ensure you have the following installed:

- **Node.js** (version 20.0 or higher)
- **Git** (latest stable version)
- **npm** (included with Node.js, for `core/`)
- **pnpm** (version 10 or higher, for `ui-client/`)


### Licensing

MDK is released under the [**Apache License 2.0**](LICENSE).

By contributing, you agree that:

- You retain copyright over your contributions
- You grant a perpetual, worldwide, royalty-free license for their use
- Contributions are provided **“AS IS”**, without warranty

## Development environment setup

<details>
<summary>1. Fork and clone</summary>

1. Fork [the repository](https://github.com/tetherto/mdk.git) on GitHub.
2. Clone your fork locally and navigate into the project directory:
```bash
git clone https://github.com/username/mdk.git
cd mdk
```

3. Add the upstream remote:

```bash
git remote add upstream https://github.com/tetherto/mdk.git
```

</details>

<details>
<summary>2. Stay in sync</summary>

Keep your fork in sync with the main repository. For example:

```bash
git fetch upstream
git merge --ff-only upstream/main   # fails loudly if main has diverged
```

</details>

### Backend contribution setup

Use this workflow when contributing to backend code under `core/`.

```bash
cd core
npm install
```

#### Common commands

```bash
# Lint backend code
npm run lint

# Run backend test suite (lint + unit + integration + package tests)
npm test

```

### Frontend contribution setup 

Use this workflow when contributing to frontend code under `ui-client/`.

```bash
cd ui-client
corepack enable
pnpm install
```

#### Common commands

```bash
# Build packages
pnpm build

# Run dev mode
pnpm dev

# Lint and type-check
pnpm lint
pnpm typecheck

# Run tests
pnpm test
```

## Pull request workflow

### Conventional types

MDK uses Conventional Commits-style types for both branch names and PR titles.

| Type | Use for |
|---|---|
| `feat` | New features |
| `fix` | Bug fixes |
| `docs` | Documentation changes |
| `refactor` | Code refactoring without behaviour change |
| `test` | Test additions or changes |
| `chore` | Tooling, dependencies, repo maintenance |
| `perf` | Performance improvements |
| `style` | Formatting only (no logic change) |
| `ci` | CI configuration changes |
| `build` | Build system or external dependency changes |

### Branch naming convention

Create branches using the following pattern:

```bash
{type}/{short-description}
```

Where `{type}` is one of the [conventional types](#conventional-types).

#### Branch naming examples

```bash
# New feature
git checkout -b feat/mdk-new-device

# Bug fix
git checkout -b fix/timeout-handling
```

### Pull request steps

1. Sync your local main with upstream `main`.
2. Create a branch from local `main`.
3. Make your code changes.
4. Write or update tests.
5. Run linting and tests locally in the workspaces you changed:
   - `core`: `npm run lint && npm test`
   - `ui-client`: `pnpm lint && pnpm test` (and `pnpm typecheck` for TypeScript changes)
6. Commit changes with meaningful messages.
7. Push your branch and open a Pull Request targeting the upstream `main`.

### PR checklist

Before submitting your PR, ensure that:

- [ ] Code builds locally (`pnpm build` for `ui-client` changes)
- [ ] Tests pass in affected workspaces (`npm test` for `core`, `pnpm test` for `ui-client`)
- [ ] Linting passes (`npm run lint` for `core`, `pnpm lint` for `ui-client`)
- [ ] Type-check passes for frontend TypeScript changes (`pnpm typecheck`)
- [ ] New features include tests
- [ ] Documentation is updated if applicable

### PR title format

Use the following convention:

```bash
{type}({scope}): {description}
```

Where `{type}` is one of the [conventional types](#conventional-types) and `{scope}` is the affected area, for example `miner` or `ui-client`.

Examples:

- `feat(miner): add Antminer S21 support`
- `fix(timeout): resolve action timeout handling`
- `docs(api): update stats documentation`

## PR review

All pull requests go through the following review steps:

1. **Automated checks**: Linting and tests must pass.
2. **Code review**: At least 2 maintainer approvals are required.
3. **Feedback resolution**: All requested changes must be addressed.
4. **Squash and merge**: Maintainers squash commits to keep history clean.

## Code standards

MDK uses **StandardJS** style to keep the codebase consistent and easy to review across repositories.

## Security

If you discover a security vulnerability, do not report it in a public issue.

Please follow the private disclosure instructions in [SECURITY.md](SECURITY.md).

Happy contributing, and thanks for helping improve MDK! 🚀
