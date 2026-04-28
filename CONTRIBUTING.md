# Contributing to MDK

Thank you for your interest in contributing to **MDK**! 

This document outlines the contribution workflow for the MDK repository, from setting up your development environment to submitting pull requests and participating in releases.

---

## Monorepo Structure

MDK is a monorepo with separate backend and frontend workspaces:

- `core/` - Backend services, container modules, and integration/unit tests (npm-based)
- `ui-client/` - Frontend packages, demo app, and shared UI foundation (pnpm + Turbo-based)

Choose the workflow that matches the area you are contributing to.

---

## Getting Started

### Prerequisites

Before contributing, make sure you have the following installed:

- **Node.js** (version 20.0 or higher)
- **Git** (latest stable version)
- **npm** (included with Node.js, for `core/`)
- **pnpm** (version 10 or higher, for `ui-client/`)

---

### Licensing

MDK is released under the **Apache License 2.0**.

By contributing, you agree that:

- You retain copyright over your contributions
- You grant a perpetual, worldwide, royalty-free license for their use
- Contributions are provided **“AS IS”**, without warranty

For full details, see the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0.html).

---

## Development Environment Setup

### Fork and Clone :

1. Fork the repository on GitHub.
2. Clone your fork locally and navigate into the project directory:
```bash
git clone https://github.com/username/mdk.git
cd mdk
```

3. Add the upstream remote to keep your fork in sync with the main repository:

```bash
git remote add upstream https://github.com/tetherto/mdk.git
```

---

### Backend Contribution Setup (`core/`)

Use this workflow when contributing to backend code under `core/`.

```bash
cd core
npm install
```

Common commands:

```bash
# Lint backend code
npm run lint

# Run backend test suite (lint + unit + integration + package tests)
npm test

```

---

### Frontend Contribution Setup (`ui-client/`)

Use this workflow when contributing to frontend code under `ui-client/`.

```bash
cd ui-client
corepack enable
pnpm install
```

Common commands:

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

---

## Pull Request Workflow

### Branch Naming Convention

Create branches using the following pattern:

```
{type}/{short-description}
```

Supported types:

- `feat/` — New features
- `fix/` — Bug fixes
- `docs/` — Documentation changes
- `refactor/` — Code refactoring
- `test/` — Test additions or changes

#### Examples

```bash
# New feature
git checkout -b feat/mdk-new-device

# Bug fix
git checkout -b fix/timeout-handling
```

---

### Pull Request Steps

1. Create a branch from `main`
2. Make your code changes
3. Write or update tests
4. Run linting and tests locally in the workspace(s) you changed:
   - `core`: `npm run lint && npm test`
   - `ui-client`: `pnpm lint && pnpm test` (and `pnpm typecheck` for TypeScript changes)
5. Commit changes with meaningful messages
6. Push your branch and open a Pull Request targeting `main`

---

### PR Checklist

Before submitting your PR, ensure that:

- [ ] Code builds locally (`pnpm build` for `ui-client` changes)
- [ ] Tests pass in affected workspace(s) (`npm test` for `core`, `pnpm test` for `ui-client`)
- [ ] Linting passes (`npm run lint` for `core`, `pnpm lint` for `ui-client`)
- [ ] Type-check passes for frontend TypeScript changes (`pnpm typecheck`)
- [ ] New features include tests
- [ ] Documentation is updated if applicable

---

### PR Title Format

Use the following convention:

```
{type}({scope}): {description}
```

Types:

- `feat`
- `fix`
- `docs`
- `refactor`
- `test`
- `chore`

Examples:

- `feat(miner): add Antminer S21 support`
- `fix(timeout): resolve action timeout handling`
- `docs(api): update stats documentation`

---

## PR Review

All pull requests go through the following review steps:

1. **Automated Checks** — Linting and tests must pass
2. **Code Review** — At least 2 maintainer approvals are required
3. **Feedback Resolution** — All requested changes must be addressed
4. **Squash and Merge** — Maintainers squash commits to keep history clean

---

## Code Standards

MDK uses **StandardJS** style to keep the codebase consistent and easy to review across repositories.

---

## Security

If you discover a security vulnerability, do not report it in a public issue.

Please follow the private disclosure instructions in [SECURITY.md](SECURITY.md).

---

Happy contributing, and thanks for helping improve MDK! 🚀
