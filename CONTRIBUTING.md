# Contributing to MDK

Thank you for your interest in contributing to **MDK**! 

This document outlines the contribution workflow for all MDK repositories, from setting up your development environment to submitting pull requests and participating in releases.

---

## Getting Started

### Prerequisites

Before contributing, make sure you have the following installed:

- **Node.js** (version 20.0 or higher)
- **Git** (latest stable version)
- **npm** (included with Node.js)

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
4. Run linting and tests locally
5. Commit changes with meaningful messages
6. Push your branch and open a Pull Request targeting `main`

---

### PR Checklist

Before submitting your PR, ensure that:

- [ ] Code builds locally
- [ ] Tests pass (`npm test`)
- [ ] Linting passes (`npm run lint` or `npm run lint:fix`)
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

Happy contributing, and thanks for helping improve MDK! 🚀
