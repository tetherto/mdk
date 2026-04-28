import { EmptyState } from '@tetherto/core'
import { CubeIcon } from '@radix-ui/react-icons'

export const EmptyStatePage = (): JSX.Element => {
  return (
    <section className="demo-section">
      <h2 className="demo-section__title">Empty State</h2>
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <section>
          <h3>Default (md)</h3>
          <div style={{ border: '1px solid #ffffff1a', padding: '16px', width: '280px' }}>
            <EmptyState description="No data available" />
          </div>
        </section>

        <section>
          <h3>Simple image</h3>
          <div style={{ border: '1px solid #ffffff1a', padding: '16px', width: '280px' }}>
            <EmptyState description="No miners found" image="simple" />
          </div>
        </section>

        <section>
          <h3>Small</h3>
          <div style={{ border: '1px solid #ffffff1a', padding: '16px', width: '200px' }}>
            <EmptyState description="Empty" size="sm" />
          </div>
        </section>

        <section>
          <h3>Large</h3>
          <div style={{ border: '1px solid #ffffff1a', padding: '16px', width: '320px' }}>
            <EmptyState description="No results match your search criteria" size="lg" />
          </div>
        </section>

        <section>
          <h3>Custom description (ReactNode)</h3>
          <div style={{ border: '1px solid #ffffff1a', padding: '16px', width: '280px' }}>
            <EmptyState
              description={
                <span>
                  No pools configured. <strong style={{ color: '#f7931a' }}>Add one now</strong>
                </span>
              }
            />
          </div>
        </section>

        <section>
          <h3>Custom image (Radix Icon)</h3>
          <div style={{ border: '1px solid #ffffff1a', padding: '16px', width: '280px' }}>
            <EmptyState
              description="Custom icon example"
              image={<CubeIcon width="48" height="48" color="#f7931a" />}
            />
          </div>
        </section>
      </div>
    </section>
  )
}
