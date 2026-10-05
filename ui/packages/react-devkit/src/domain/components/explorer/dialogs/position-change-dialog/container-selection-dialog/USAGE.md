# `ContainerSelectionDialog`

Modal step that lists containers for the operator to choose from as part of a position-change or batch-action flow.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `onClose` | Required | `(value?: boolean \| undefined) => void` | - | Called when dialog closes |
| `open` | Required | `boolean` | - | Controls visibility |
| `containers` | Optional | `Device[]` | `[]` | Available target containers |
| `isLoading` | Optional | `boolean` | - | Show loading spinner |
| `miner` | Optional | `Device` | - | The miner being moved |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { ContainerSelectionDialog } from "@tetherto/mdk-react-devkit";

<ContainerSelectionDialog
  open={isOpen}
  onClose={() => setIsOpen(false)}
  containers={availableContainers}
/>
```
