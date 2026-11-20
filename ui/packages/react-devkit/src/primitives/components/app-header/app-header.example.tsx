import { AppHeader } from './app-header'

/**
 * Three-slot top-bar shell. `start` for a brand/toggle, `children` for the
 * main strip, `actions` for the right-edge cluster.
 */
export const AppHeaderExample = (): React.ReactNode => (
  <AppHeader start={<strong>MDK</strong>} actions={<button type="button">Sign out</button>}>
    <div className="mdk-example-header-content">Header content</div>
  </AppHeader>
)
