import { AlarmsBellButton } from '@tetherto/mdk-react-devkit/domain'
import type { JSX } from 'react'

import { DemoBlock } from '../components/demo-block'
import { DemoPageHeader } from '../components/demo-page-header'
import { useDemoToast } from '../utils/use-demo-toast'

export const AlarmsBellButtonPage = (): JSX.Element => {
  const { showToast, ToasterSlot } = useDemoToast()

  return (
    <section className="demo-section">
      <DemoPageHeader
        title="Alarms Bell Button"
        description="Top-bar bell trigger with a three-line severity badge (critical / high / medium). Counts are caller-provided so the button stays domain-agnostic."
      />

      <DemoBlock
        title="All severities populated"
        description="Click the bell to open an alerts panel — here the click fires a toast."
      >
        <AlarmsBellButton
          counts={{ critical: 171, high: 72, medium: 322 }}
          onClick={() =>
            showToast('Open alerts panel', { variant: 'info', description: 'Click handler fired.' })
          }
        />
      </DemoBlock>

      <DemoBlock title="Critical only" description="Omitted severities hide their badge row.">
        <AlarmsBellButton counts={{ critical: 3 }} />
      </DemoBlock>

      <DemoBlock
        title="No active alarms"
        description="When all severity counts are missing, the badge stack collapses entirely."
      >
        <AlarmsBellButton counts={{}} />
      </DemoBlock>

      <ToasterSlot />
    </section>
  )
}
