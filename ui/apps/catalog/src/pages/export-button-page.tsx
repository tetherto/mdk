import { ExportButton } from '@tetherto/mdk-react-devkit/domain'
import type { JSX } from 'react'

import { DemoBlock } from '../components/demo-block'
import { DemoPageHeader } from '../components/demo-page-header'
import { useDemoToast } from '../utils/use-demo-toast'

export const ExportButtonPage = (): JSX.Element => {
  const { showToast, ToasterSlot } = useDemoToast()

  return (
    <section className="demo-section">
      <DemoPageHeader
        title="Export Button"
        description="Split-button trigger for downloading the current dashboard state. The left half labels the action; the right half opens a dropdown with the available formats and invokes onExport(format) on selection."
      />

      <DemoBlock
        title="Default — CSV and JSON"
        description="In a real page, wire this to useDashboardExport from @tetherto/mdk-react-adapter."
      >
        <ExportButton
          onExport={(format) =>
            showToast(`Export ${format.toUpperCase()}`, {
              variant: 'success',
              description: `onExport handler received "${format}".`,
            })
          }
        />
      </DemoBlock>

      <DemoBlock
        title="Restricted format list"
        description="Pass `formats` to limit the dropdown — useful when only one shape is supported."
      >
        <ExportButton
          formats={['csv']}
          onExport={(format) => showToast(`Export ${format.toUpperCase()}`, { variant: 'info' })}
        />
      </DemoBlock>

      <DemoBlock
        title="Custom label"
        description="Override the trigger label without changing the dropdown contract."
      >
        <ExportButton
          label="Download report"
          onExport={(format) =>
            showToast(`Download report (${format.toUpperCase()})`, { variant: 'info' })
          }
        />
      </DemoBlock>

      <DemoBlock title="Disabled" description="The trigger renders but does not open the menu.">
        <ExportButton onExport={() => undefined} disabled />
      </DemoBlock>

      <ToasterSlot />
    </section>
  )
}
