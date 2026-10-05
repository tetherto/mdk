# `HeaderControlsSettings`

Settings panel for configuring the global application header, including which controls are visible, sticky behaviour, and theme defaults.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `onReset` | Required | `VoidFunction` | - | Reset all preferences to defaults |
| `onToggle` | Required | `(key: keyof HeaderPreferences, value: boolean) => void` | - | Called when a preference toggle changes |
| `preferences` | Required | `HeaderPreferences` | - | Current header preference values |
| `className` | Optional | `string` | - | Additional CSS class |
| `isLoading` | Optional | `boolean` | `false` | Show loading state |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { HeaderControlsSettings } from "@tetherto/mdk-react-devkit";

<HeaderControlsSettings
  preferences={{ sticky: true, showTimezone: true }}
  onToggle={(key, value) => updatePref(key, value)}
  onReset={resetPrefs}
/>
```
