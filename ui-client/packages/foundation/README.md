# @tetherto/foundation

Complete foundation package with features, state management, API client, hooks, and utilities.

## Installation

```bash
pnpm add @tetherto/foundation
```

## Usage

```tsx
import { /* your imports */ } from '@tetherto/foundation'

// Or import from specific sub-modules
import { /* hooks */ } from '@tetherto/foundation/hooks'
import { /* API client */ } from '@tetherto/foundation/api'
import { /* state */ } from '@tetherto/foundation/state'
```

## Structure

- `components/domain/` - Mining-specific domain components
- `components/feature/` - Complete feature modules
- `hooks/` - Custom React hooks
- `api/` - API client with RTK Query
- `state/` - State management with Redux Toolkit
- `test-utils/` - Testing utilities and helpers

## Dependencies

This package depends on `@tetherto/core` for base components and utilities.
