# `SettingsDashboard`

Top-level settings page that composes all per-section settings cards (header controls, RBAC, import/export, feature flags) in a single grid layout.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `className` | Optional | `string` | - | Additional CSS class |
| `dangerActions` | Optional | `ActionButtonProps[]` | - | Danger-zone action buttons (reset, delete) |
| `featureFlagsProps` | Optional | `FeatureFlagsSettingsProps` | - | Props forwarded to `FeatureFlagsSettings` |
| `headerControlsProps` | Optional | `HeaderControlsSettingsProps` | - | Props forwarded to `HeaderControlsSettings` |
| `importExportProps` | Optional | `ImportExportSettingsProps` | - | Props forwarded to `ImportExportSettings` |
| `rbacControlProps` | Optional | `RBACControlSettingsProps` | - | Props forwarded to `RBACControlSettings` |
| `showFeatureFlags` | Optional | `boolean` | `false` | Whether to show the feature-flags section |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { SettingsDashboard } from "@tetherto/mdk-react-devkit";

<SettingsDashboard
  rbacControlProps={rbacProps}
  importExportProps={importExportProps}
/>
```
