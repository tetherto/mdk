import { PoolDetailsPopover } from '@tetherto/foundation'
import type { PoolDetailItem } from '@tetherto/foundation'

const mockPoolDetails: PoolDetailItem[] = [
  { title: 'Pool Name', value: 'Alpha Pool' },
  { title: 'Hash Rate', value: '123.45 TH/s' },
  { title: 'Workers', value: 24 },
  { title: 'Uptime', value: '99.8%' },
  { title: 'Last Share', value: '2 minutes ago' },
  { title: 'Efficiency', value: '98.2%' },
  { title: 'Total Shares', value: '45,231' },
  { title: 'Rejected Shares', value: '12' },
]

export const PoolDetailsPopoverPage = (): JSX.Element => {
  return (
    <section className="demo-section">
      <h2 className="demo-section__title">Pool Details Popover</h2>
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <section>
          <h3>Default</h3>
          <PoolDetailsPopover
            triggerLabel="View Pool Details"
            title="Pool Information"
            description="View detailed information about this mining pool"
            details={mockPoolDetails}
          />
        </section>

        <section>
          <h3>Disabled</h3>
          <PoolDetailsPopover
            triggerLabel="View Pool Details"
            title="Pool Information"
            description="View detailed information about this mining pool"
            details={mockPoolDetails}
            disabled
          />
        </section>

        <section>
          <h3>Empty Details</h3>
          <PoolDetailsPopover
            triggerLabel="View Empty Pool"
            title="Pool Information"
            description="No pool information available"
            details={[]}
          />
        </section>
      </div>
    </section>
  )
}
