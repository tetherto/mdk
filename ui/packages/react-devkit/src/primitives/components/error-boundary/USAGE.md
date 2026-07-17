# ErrorBoundary

A React class component that catches rendering errors in its subtree and displays a fallback UI. Also exports a `withErrorBoundary` HOC for wrapping components declaratively.

## Props

### `ErrorBoundary`

| Prop | Type | Required | Default | Description |
| ---- | ---- | -------- | ------- | ----------- |
| `children` | `React.ReactNode` | yes | — | Subtree to protect |
| `fallback` | `React.ReactNode` | no | — | Custom UI to render when an error is caught. If omitted, a default error panel with an expandable stack trace is shown. |
| `componentName` | `string` | no | — | Name shown in the default fallback heading (e.g. "Error in MyChart") |
| `onError` | `(error: Error, errorInfo: React.ErrorInfo) => void` | no | — | Fired when an error is caught (useful for error reporting) |
| `className` | `string` | no | — | Additional class for the default fallback container |

### `withErrorBoundary`

```ts
withErrorBoundary<P>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string,
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
): React.FC<P>
```

Wraps `WrappedComponent` in an `ErrorBoundary` using the provided `componentName` and `onError`.

## Example

```tsx
import { ErrorBoundary, withErrorBoundary } from "@tetherto/mdk-react-devkit"

// Declarative wrapper
<ErrorBoundary
  componentName="LiveChart"
  fallback={<Alert type="error" title="Chart failed to load" />}
  onError={(err) => logToSentry(err)}
>
  <LiveChart data={data} />
</ErrorBoundary>

// HOC usage
const SafeChart = withErrorBoundary(LiveChart, "LiveChart", (err) => logToSentry(err))

<SafeChart data={data} />
```

## Notes

- React error boundaries only catch errors during rendering, lifecycle methods, and constructors of class components. They do not catch async errors or event handlers.
- The default fallback panel renders an expandable `<details>` element containing the component stack trace.
