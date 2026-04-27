# Contributing

We welcome contributions! Please read our contributing guidelines below.

## Contribution Workflow

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feat/my-feature`
3. **Make your changes**
4. **Run checks**: `pnpm check` (lint + typecheck)
5. **Run tests**: `pnpm test`
6. **Commit**: `git commit -m "feat: add my feature"`
7. **Push**: `git push origin feat/my-feature`
8. **Create Pull Request**

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples**:

```
feat(components): add MinerCard component
fix(api-client): handle null response in useGetListThingsQuery
docs(readme): update installation instructions
refactor(hooks): simplify useDebounce implementation
test(components): add tests for DataTable
chore(deps): update dependencies
```

## Code Style

- **Formatting**: Auto-formatted by ESLint (antfu config)
- **Quotes**: Double quotes
- **Semicolons**: Required
- **Indentation**: 2 spaces
- **Line length**: 120 characters (soft limit)

**Pre-commit hooks** automatically fix formatting issues.

## Development

### Commands

```bash
# Development
pnpm dev                    # Run all packages in dev mode
pnpm dev --filter @mdk/core # Run specific package

# Building
pnpm build                  # Build all packages
pnpm build --filter @mdk/*  # Build specific packages

# Testing
pnpm test                   # Run all tests
pnpm test:watch             # Run tests in watch mode
pnpm test:coverage          # Generate coverage report

# Linting & Type Checking
pnpm lint                   # Check for issues
pnpm lint:fix               # Auto-fix issues
pnpm typecheck              # Type check all packages
pnpm check                  # Lint + typecheck

# Cleaning
pnpm clean                  # Remove all build artifacts
```

### Adding Dependencies

**To a specific package:**

```bash
# From root (recommended)
pnpm add react --filter @mdk/foundation
pnpm add -D vitest --filter @mdk/foundation

# Or cd into package
cd packages/components-foundation
pnpm add react
pnpm add -D vitest
```

**To workspace root:**

```bash
pnpm add -w typescript
pnpm add -D -w @types/node
```

### Creating a New Package

1. Create package directory:

```bash
mkdir -p packages/my-package/src
cd packages/my-package
```

2. Create `package.json`:

```json
{
  "name": "@mdk/my-package",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "dev": "vite build --watch",
    "build": "vite build && tsc --emitDeclarationOnly",
    "test": "vitest"
  },
  "peerDependencies": {
    "react": "^19.0.0"
  }
}
```

3. Create `tsconfig.base.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

4. Create `src/index.ts`:

```typescript
export * from './my-component'
```

5. Update workspace `pnpm-workspace.yaml` (if needed):

```yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

### Package Configuration

#### TypeScript

Each package extends the root `tsconfig.base.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

#### ESLint

Packages can override root ESLint config:

```js
// eslint.config.mjs
import antfu from '@antfu/eslint-config'

export default antfu({
  react: true,
  typescript: true,
  stylistic: {
    indent: 2,
    quotes: 'double',
    semi: true,
  },
  rules: {
    // Package-specific rules
  },
})
```

## Testing Guidelines

**Component Tests**:

```typescript
import { render, screen } from "@testing-library/react";
import { Button } from "./Button";

describe("Button", () => {
  it("renders with text", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("handles click events", async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    await userEvent.click(screen.getByText("Click me"));
    expect(handleClick).toHaveBeenCalledOnce();
  });
});
```

**Hook Tests**:

```typescript
import { renderHook } from '@testing-library/react'
import { useDebounce } from './useDebounce'

describe('useDebounce', () => {
  it('debounces value changes', async () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'initial', delay: 300 },
    })

    expect(result.current).toBe('initial')

    rerender({ value: 'updated', delay: 300 })
    expect(result.current).toBe('initial') // Still initial

    await waitFor(() => expect(result.current).toBe('updated'), { timeout: 400 })
  })
})
```

**Coverage Requirements**:

- Minimum 80% coverage for all packages
- 100% coverage for critical utilities

## Documentation Guidelines

**Component Documentation**:

````typescript
/**
 * A button component that handles user interactions.
 *
 * @example
 * ```tsx
 * <Button variant="primary" onClick={() => console.log("clicked")}>
 *   Click me
 * </Button>
 * ```
 */
export interface ButtonProps {
  /** The button variant */
  variant?: 'primary' | 'secondary' | 'ghost'
  /** The button size */
  size?: 'sm' | 'md' | 'lg'
  /** Whether the button is disabled */
  disabled?: boolean
  /** Click handler */
  onClick?: () => void
  /** Button content */
  children: React.ReactNode
}

export const Button = ({ variant = 'primary', size = 'md', ...props }: ButtonProps) => {
  // Implementation
}
````

**Hook Documentation**:

````typescript
/**
 * Debounces a value change.
 *
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds
 * @returns The debounced value
 *
 * @example
 * ```tsx
 * const [search, setSearch] = useState("");
 * const debouncedSearch = useDebounce(search, 300);
 *
 * useEffect(() => {
 *   // API call with debouncedSearch
 * }, [debouncedSearch]);
 * ```
 */
export const useDebounc = <T>(value: T, delay: number): T => {
  // Implementation
}
````

## Pull Request Guidelines

**PR Title**: Use conventional commit format

```
feat(components): add MinerCard component
```

**PR Description Template**:

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Checklist

- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] All tests passing
- [ ] No new warnings
- [ ] Dependent changes merged

## Screenshots (if applicable)

Add screenshots here

## Related Issues

Closes #123
```

## Review Process

1. **Automated checks** must pass (CI)
2. **Code review** by at least 1 maintainer
3. **Testing** - reviewer tests changes locally
4. **Approval** - maintainer approves PR
5. **Merge** - squash and merge to main

## Publishing

### Versioning

We use [Semantic Versioning](https://semver.org/):

- **Major** (1.0.0 → 2.0.0): Breaking changes
- **Minor** (1.0.0 → 1.1.0): New features (backward compatible)
- **Patch** (1.0.0 → 1.0.1): Bug fixes (backward compatible)

### Release Process

**Automated releases** via CI/CD:

1. Merge PR to `main`
2. CI runs tests and builds
3. Changesets determines version bump
4. Packages published to npm
5. GitHub release created
6. Changelog updated

**Manual release** (if needed):

```bash
# Update versions
pnpm changeset

# Build all packages
pnpm build

# Publish to npm
pnpm publish -r
```

### Changelog

Changelog is auto-generated from commit messages. Follow conventional commits for accurate changelog generation.
