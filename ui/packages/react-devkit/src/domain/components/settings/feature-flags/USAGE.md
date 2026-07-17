# FeatureFlagsSettings

Settings panel listing all feature flags with per-flag enable/disable toggles. Shows a save button when changes are pending.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `featureFlags` | `Record<string, boolean>` | yes | — | Current flag values keyed by flag name. |
| `isEditingEnabled` | `boolean` | yes | — | Whether editing is permitted. |
| `isLoading` | `boolean` | no | — | Show loading state. |
| `isSaving` | `boolean` | no | — | Show saving spinner on save button. |
| `onSave` | `(flags) => void` | yes | — | Called with updated flags when saved. |
| `className` | `string` | no | — | Additional CSS class. |

## Minimal example

```tsx
import { FeatureFlagsSettings } from "@tetherto/mdk-react-devkit";

<FeatureFlagsSettings
  featureFlags={{ "new-dashboard": true, "beta-charts": false }}
  isEditingEnabled={true}
  onSave={(flags) => console.log(flags)}
/>
```
