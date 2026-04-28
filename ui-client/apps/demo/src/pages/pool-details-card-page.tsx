import { PoolDetailsCard } from '@tetherto/foundation'
import type { PoolDetailItem } from '@tetherto/foundation'

const mockPoolDetails: PoolDetailItem[] = [
  { title: 'Pool Name', value: 'Alpha Pool' },
  { title: 'Hash Rate', value: '123.45 TH/s' },
  { title: 'Workers', value: 24 },
  { title: 'Uptime', value: '99.8%' },
  { title: 'Last Share', value: '2 minutes ago' },
  { title: 'Efficiency', value: '98.2%' },
]

export const PoolDetailsCardPage = (): JSX.Element => {
  return (
    <section className="demo-section">
      <h2 className="demo-section__title">Pool Details Card</h2>
      <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: '1fr', maxWidth: '600px' }}>
        <section>
          <h3>With Label</h3>
          <PoolDetailsCard label="Pool Information" details={mockPoolDetails} />
        </section>

        <section>
          <h3>With Underline</h3>
          <PoolDetailsCard label="Pool Information" details={mockPoolDetails} underline />
        </section>

        <section>
          <h3>Without Label</h3>
          <PoolDetailsCard details={mockPoolDetails} />
        </section>

        <section>
          <h3>Empty State</h3>
          <PoolDetailsCard label="Pool Information" details={[]} />
        </section>
      </div>
    </section>
  )
}
