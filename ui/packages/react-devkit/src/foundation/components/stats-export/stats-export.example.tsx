/**
 * Runnable example for StatsExport.
 */
import { StatsExport } from '@tetherto/mdk-react-devkit'

export const StatsExportExample = () => {
  return (
    <StatsExport
      onCsvExport={async () => {
        await new Promise((r) => setTimeout(r, 800))
        // eslint-disable-next-line no-console
        console.log('export csv')
      }}
      onJsonExport={async () => {
        await new Promise((r) => setTimeout(r, 800))
        // eslint-disable-next-line no-console
        console.log('export json')
      }}
      showLabel
    />
  )
}
