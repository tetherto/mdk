# `LazyTabWrapper`

Wraps a lazily loaded component in `React.Suspense`, displaying a fallback spinner while the module loads. Typed generically so the `data` prop is type-safe.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `Component` | Required | `React.ComponentType<{ data?: T \| undefined; }>` | - | Lazy-loaded component to render |
| `data` | Optional | `T` | - | Data to pass to the component |
| `fallback` | Optional | `React.ReactNode` | `<Spinner />` | Custom fallback component while loading |
| `spinnerType` | Optional | `"circle" \| "square"` | `"circle"` | Spinner type when using default fallback |
<!-- END GENERATED: props -->

## Example

```tsx
import { lazy } from "react"
import { LazyTabWrapper } from "@tetherto/mdk-react-devkit"

const DetailsTab = lazy(() => import("./DetailsTab"))

<LazyTabWrapper Component={DetailsTab} data={deviceData} />

// Custom fallback
<LazyTabWrapper
  Component={SettingsTab}
  data={settings}
  fallback={<MyCustomLoader />}
/>

// With typed data
interface DeviceData { id: string; name: string }

<LazyTabWrapper<DeviceData> Component={DeviceTab} data={device} />
```

## Notes

- The wrapped component must accept a `{ data?: T }` prop signature
- For components with no data prop, `T` defaults to `Record<string, unknown>` so `data` is still optional
