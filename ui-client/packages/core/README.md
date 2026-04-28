# @tetherto/mdk-core-ui

Core UI component library built on Radix UI primitives.

## Overview

This package provides a collection of accessible, unstyled UI components built on top of [Radix UI](https://www.radix-ui.com/). The components are designed to be composable, customizable, and production-ready.

## Installation

Since this is a workspace package in the monorepo, you can add it as a dependency in your app:

```json
{
  "dependencies": {
    "@tetherto/mdk-core-ui": "workspace:*"
  }
}
```

Then run:

```bash
pnpm install
```

## Usage

### Importing Components

```tsx
import { Button, Dialog, Label, Switch } from '@tetherto/mdk-core-ui'
```

### Importing Styles

Import the base styles in your application entry point:

```tsx
import '@tetherto/mdk-core-ui/styles.css'
```

### Example

```tsx
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@tetherto/mdk-core-ui'

const App = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary">Open Dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Welcome</DialogTitle>
        </DialogHeader>
        <p>This is a dialog built with Radix UI primitives.</p>
      </DialogContent>
    </Dialog>
  )
}
```

## Available Components

- **Accordion** - Collapsible content sections
- **Alert Dialog** - Modal dialogs for important actions
- **Avatar** - User profile images with fallbacks
- **Button** - Clickable buttons with variants
- **Checkbox** - Toggle checkboxes
- **Dialog** - Modal overlays
- **Dropdown Menu** - Contextual menus
- **Label** - Form field labels
- **Popover** - Floating content containers
- **Progress** - Progress indicators
- **Radio Group** - Radio button groups
- **Select** - Dropdown selects
- **Separator** - Visual dividers
- **Slider** - Range sliders
- **Switch** - Toggle switches
- **Tabs** - Tabbed interfaces
- **Toast** - Notification toasts
- **Tooltip** - Hover tooltips

## Customization

All components accept a `className` prop for custom styling. The components use CSS variables for theming, which can be customized in your application's CSS.

## TypeScript

This package is written in TypeScript and includes full type definitions.

## Development

```bash
# Build the package
pnpm build

# Type check
pnpm typecheck

# Lint
pnpm lint
```

## License

MIT
