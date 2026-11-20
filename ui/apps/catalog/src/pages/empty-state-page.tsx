import { EmptyState } from '@tetherto/mdk-react-devkit/primitives'
import { CubeIcon } from '@radix-ui/react-icons'

import type { JSX } from 'react'

export const EmptyStatePage = (): JSX.Element => {
  return (
    <section className="demo-section">
      <h2 className="demo-section__title">Empty State</h2>
      <div className="demo-section__showcase demo-section__showcase--start">
        <section>
          <h3>Default (md)</h3>
          <div className="demo-section__frame">
            <EmptyState description="No data available" />
          </div>
        </section>

        <section>
          <h3>Simple image</h3>
          <div className="demo-section__frame">
            <EmptyState description="No miners found" image="simple" />
          </div>
        </section>

        <section>
          <h3>Small</h3>
          <div className="demo-section__frame demo-section__frame--sm">
            <EmptyState description="Empty" size="sm" />
          </div>
        </section>

        <section>
          <h3>Large</h3>
          <div className="demo-section__frame demo-section__frame--lg">
            <EmptyState description="No results match your search criteria" size="lg" />
          </div>
        </section>

        <section>
          <h3>Custom description (ReactNode)</h3>
          <div className="demo-section__frame">
            <EmptyState
              description={
                <span>
                  No pools configured.{' '}
                  <strong className="demo-section__text-primary">Add one now</strong>
                </span>
              }
            />
          </div>
        </section>

        <section>
          <h3>Custom image (Radix Icon)</h3>
          <div className="demo-section__frame">
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
