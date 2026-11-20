/**
 * Runnable example for NotFoundPage.
 */
import { NotFoundPage } from '@tetherto/mdk-react-devkit'

export const NotFoundPageExample = () => (
  <div className="mdk-example-col mdk-example-col--centered mdk-example-col--gap-2xl">
    {/* Default 404 with Go Home button */}
    <NotFoundPage
      onGoHome={() => {
        /* navigate home */
      }}
    />

    {/* Custom title and message */}
    <NotFoundPage
      title="Page Not Found"
      message="Check the URL and try again."
      onGoHome={() => {
        /* navigate home */
      }}
    />

    {/* No button (read-only display) */}
    <NotFoundPage title="403" message="You do not have permission to view this page." />
  </div>
)
