import { AppHeader } from './app-header'

/**
 * Three-slot top-bar shell. `start` for a brand/toggle, `children` for the
 * main strip, `actions` for the right-edge cluster.
 */
export const AppHeaderExample = (): React.ReactNode => (
  <AppHeader start={<strong>MDK</strong>} actions={<button type="button">Sign out</button>}>
    <div style={{ padding: '0 1rem', alignSelf: 'center' }}>Header content</div>
  </AppHeader>
)
