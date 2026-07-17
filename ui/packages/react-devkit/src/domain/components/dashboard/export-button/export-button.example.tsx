/**
 * Runnable example for ExportButton.
 *
 * The handler in this demo just logs the selected format. A real page
 * would wire it to `useDashboardExport` from `@tetherto/mdk-react-adapter`.
 */
import { ExportButton } from '@tetherto/mdk-react-devkit'

export const ExportButtonExample = () => (
  <ExportButton
    onExport={(format) => {
      console.warn('Export requested:', format)
    }}
  />
)
