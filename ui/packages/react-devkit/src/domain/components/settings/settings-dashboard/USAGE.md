# SettingsDashboard

Top-level settings page that composes all per-section settings cards (header controls, RBAC, import/export, feature flags) in a single grid layout.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `dangerActions` | `ActionButtonProps[]` | no | — | Danger-zone action buttons (reset, delete). |
| `headerControlsProps` | `HeaderControlsSettingsProps` | no | — | Props forwarded to `HeaderControlsSettings`. |
| `rbacControlProps` | `RBACControlSettingsProps` | no | — | Props forwarded to `RBACControlSettings`. |
| `importExportProps` | `ImportExportSettingsProps` | no | — | Props forwarded to `ImportExportSettings`. |
| `featureFlagsProps` | `FeatureFlagsSettingsProps` | no | — | Props forwarded to `FeatureFlagsSettings`. |
| `showFeatureFlags` | `boolean` | no | — | Whether to show the feature-flags section. |
| `className` | `string` | no | — | Additional CSS class. |

## Minimal example

```tsx
import { SettingsDashboard } from "@tetherto/mdk-react-devkit";

<SettingsDashboard
  rbacControlProps={rbacProps}
  importExportProps={importExportProps}
/>
```
