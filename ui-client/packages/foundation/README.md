# @tetherto/mdk-foundation-ui

Complete foundation package with features, state management, API client, hooks, and utilities.

## Installation

```bash
pnpm add @tetherto/mdk-foundation-ui
```

## Usage

```tsx
import { /* your imports */ } from '@tetherto/mdk-foundation-ui'

// Or import from specific sub-modules
import { /* hooks */ } from '@tetherto/mdk-foundation-ui/hooks'
import { /* API client */ } from '@tetherto/mdk-foundation-ui/api'
import { /* state */ } from '@tetherto/mdk-foundation-ui/state'
```

## Structure

- `components/domain/` - Mining-specific domain components
- `components/feature/` - Complete feature modules
- `hooks/` - Custom React hooks
- `api/` - API client with RTK Query
- `state/` - State management with Redux Toolkit
- `test-utils/` - Testing utilities and helpers

## Dependencies

This package depends on `@tetherto/mdk-core-ui` for base components and utilities.
