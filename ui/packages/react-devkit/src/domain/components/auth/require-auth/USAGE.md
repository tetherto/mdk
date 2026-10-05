# RequireAuth

Route guard that reads the session token from the headless `authStore` (via
`useAuth`) and renders children only when a token is present. Router-agnostic
— pass any node (typically `<Navigate />`) as the `fallback`.

Also exports `consumeLastVisitedPath()` so the sign-in page can return the
user to wherever they were redirected from.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `children` | Required | `React.ReactNode` | - | Rendered when a token is present |
| `fallback` | Required | `React.ReactNode` | - | Rendered when no token is present — typically `<Navigate to="/signin" />` |
| `rememberPath` | Optional | `boolean` | `true` | When true (default), the current location is persisted to sessionStorage before rendering the fallback so the sign-in flow can return there |
<!-- END GENERATED: props -->

## Example

```tsx
import { Navigate, Route, Routes } from 'react-router'
import { RequireAuth, consumeLastVisitedPath } from '@tetherto/mdk-react-devkit'

const Router = () => (
  <Routes>
    <Route
      path='/dashboard'
      element={
        <RequireAuth fallback={<Navigate to='/signin' replace />}>
          <Dashboard />
        </RequireAuth>
      }
    />
  </Routes>
)

const SignIn = () => {
  const token = useAuthToken()
  if (token) {
    const next = consumeLastVisitedPath() ?? '/dashboard'
    return <Navigate to={next} replace />
  }
  return <SignInGoogleButton />
}
```
