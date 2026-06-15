/**
 * Runnable example for RequireAuth.
 *
 * Wraps the application content in an auth guard. When `authStore.token` is
 * null, renders the fallback (typically a `<Navigate />` to `/signin`).
 */
import { RequireAuth } from '@tetherto/mdk-react-devkit'

const PretendDashboard = () => <div>Authenticated dashboard content</div>
const PretendRedirect = () => <div>Redirecting to sign in…</div>

export const RequireAuthExample = () => (
  <RequireAuth fallback={<PretendRedirect />}>
    <PretendDashboard />
  </RequireAuth>
)
