# `AlertConfirmationModal`

Confirmation dialog that appears before acknowledging or clearing one or more alerts. Prevents accidental bulk-clear actions.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `isOpen` | Required | `boolean` | - | Controls dialog visibility |
| `onOk` | Required | `VoidFunction` | - | Called when the user confirms the action |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { AlertConfirmationModal } from "@tetherto/mdk-react-devkit";

<AlertConfirmationModal
  isOpen={isOpen}
  onOk={() => { clearAlerts(); setIsOpen(false); }}
/>
```
