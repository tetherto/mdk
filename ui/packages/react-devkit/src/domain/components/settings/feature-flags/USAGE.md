# `FeatureFlagsSettings`

Settings panel listing all feature flags with per-flag enable/disable toggles. Shows a save button when changes are pending.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `featureFlags` | Required | `Record<string, boolean>` | - | Current flag values keyed by flag name |
| `isEditingEnabled` | Required | `boolean` | - | Whether editing is permitted |
| `onSave` | Required | `(flags: Record<string, boolean>) => void` | - | Called with updated flags when saved |
| `className` | Optional | `string` | - | Additional CSS class |
| `isLoading` | Optional | `boolean` | `false` | Show loading state |
| `isSaving` | Optional | `boolean` | `false` | Show saving spinner on save button |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { FeatureFlagsSettings } from "@tetherto/mdk-react-devkit";

<FeatureFlagsSettings
  featureFlags={{ "new-dashboard": true, "beta-charts": false }}
  isEditingEnabled={true}
  onSave={(flags) => console.log(flags)}
/>
```
