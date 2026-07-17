# LazyTabWrapper

Wraps a lazily-loaded component in `React.Suspense`, displaying a fallback spinner while the module loads. Typed generically so the `data` prop is type-safe.

## Props

| Prop | Type | Required | Default | Description |
| ---- | ---- | -------- | ------- | ----------- |
| `Component` | `React.ComponentType<{ data?: T }>` | yes | — | The lazy-loaded component to render |
| `data` | `T` | no | — | Data passed to the component as the `data` prop |
| `fallback` | `React.ReactNode` | no | `<Spinner type={spinnerType} fullScreen />` | Custom fallback shown during loading |
| `spinnerType` | `SpinnerProps['type']` | no | `'circle'` | Spinner style used for the default fallback |

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

- The wrapped component must accept a `{ data?: T }` prop signature.
- For components with no data prop, `T` defaults to `Record<string, unknown>` so `data` is still optional.
