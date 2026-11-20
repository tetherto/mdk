import type { MdkAppPanelSlot } from '@tetherto/mdk-react-adapter'
import { MdkAppProvider, useInstalledAppPanels } from '@tetherto/mdk-react-adapter'
import { CoreAlert, ErrorBoundary } from '@tetherto/mdk-react-devkit'

/**
 * Renders the installed apps' panels for one shell slot, each inside its app's
 * `MdkAppProvider` and its own error boundary, and the apps that failed to load
 * (which `useInstalledAppPanels` reports on Home only).
 */
export const AppPanels = ({ slot }: { slot: MdkAppPanelSlot }) => {
  const { panels, failures } = useInstalledAppPanels(slot)

  if (panels.length === 0 && failures.length === 0) return null

  return (
    <section className="mdk-ui-shell-app-panels">
      {failures.length > 0 && (
        <CoreAlert
          className="mdk-ui-shell-app-panels__notice"
          // Mounted with the slot on every page that has panels, so announce it politely
          // rather than interrupting the screen reader on each navigation.
          role="status"
          type="warning"
          showIcon
          title={`${failures.length} installed app${failures.length === 1 ? '' : 's'} could not be loaded`}
          description={(
            <ul className="mdk-ui-shell-app-panels__failures">
              {failures.map(({ app, error }) => (
                <li key={app.name}>{error.message}</li>
              ))}
            </ul>
          )}
        />
      )}

      {panels.map(({ app, panel: { id, title, component: Panel } }) => (
        <article key={`${app.name}:${id}`} className="mdk-ui-shell-app-panels__panel">
          <h2 className="mdk-ui-shell-app-panels__title">{title ?? app.displayName}</h2>
          <MdkAppProvider app={app}>
            <ErrorBoundary componentName={`${app.displayName} — ${id}`}>
              <Panel />
            </ErrorBoundary>
          </MdkAppProvider>
        </article>
      ))}
    </section>
  )
}
