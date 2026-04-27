import { StatsExport } from '@mdk/foundation'

import { useDemoToast } from '../utils/use-demo-toast'

export const StateExportsPage = (): JSX.Element => {
  const { showToast, ToasterSlot } = useDemoToast()

  return (
    <section className="demo-section">
      <h2 className="demo-section__title">Stats Export Dropdown</h2>
      <div>
        <StatsExport
          onJsonExport={async () => {
            await new Promise((resolve) => setTimeout(resolve, 1000))
            showToast('Exported as JSON', { variant: 'success' })
          }}
          onCsvExport={async () => {
            await new Promise((resolve) => setTimeout(resolve, 1000))
            showToast('Exported as CSV', { variant: 'success' })
          }}
        />
      </div>
      <ToasterSlot />
    </section>
  )
}
