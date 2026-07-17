# HeaderControlsSettings

Settings panel for configuring the global application header — toggle which controls are visible, sticky behaviour, and theme defaults.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `preferences` | `HeaderPreferences` | yes | — | Current header preference values. |
| `isLoading` | `boolean` | no | — | Show loading state. |
| `onToggle` | `(key, value) => void` | yes | — | Called when a preference toggle changes. |
| `onReset` | `VoidFunction` | yes | — | Reset all preferences to defaults. |
| `className` | `string` | no | — | Additional CSS class. |

## Minimal example

```tsx
import { HeaderControlsSettings } from "@tetherto/mdk-react-devkit";

<HeaderControlsSettings
  preferences={{ sticky: true, showTimezone: true }}
  onToggle={(key, value) => updatePref(key, value)}
  onReset={resetPrefs}
/>
```
