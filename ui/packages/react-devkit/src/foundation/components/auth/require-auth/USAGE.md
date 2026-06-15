# RequireAuth

Route guard that reads the session token from the headless `authStore` (via
`useAuth`) and renders children only when a token is present. Router-agnostic
— pass any node (typically `<Navigate />`) as the `fallback`.

Also exports `consumeLastVisitedPath()` so the sign-in page can return the
user to wherever they were redirected from.

## Props

| Prop           | Type        | Required | Default | Description                                              |
| -------------- | ----------- | -------- | ------- | -------------------------------------------------------- |
| `children`     | `ReactNode` | yes      | —       | Rendered when a token is present.                        |
| `fallback`     | `ReactNode` | yes      | —       | Rendered when no token is present.                       |
| `rememberPath` | `boolean`   | no       | `true`  | Persists current location to sessionStorage on fallback. |

## Example

```tsx
import { Navigate, Route, Routes } from 'react-router-dom'
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
