import { ChartContainer } from '@tetherto/mdk-react-devkit/primitives'

import type { JSX } from 'react'
import { DemoBlock } from '../components/demo-block'
import { DemoPageHeader } from '../components/demo-page-header'
import './chart-container-page.scss'

export const ChartContainerPage = (): JSX.Element => {
  return (
    <section className="demo-section chart-container-page">
      <DemoPageHeader
        title="Chart Container"
        description="Wrapper for chart content with loading and empty states."
      />
      <DemoBlock title="States">
        <div className="chart-container-page__states">
          <ChartContainer title="Loading" loading>
            <div className="chart-container-page__placeholder" />
          </ChartContainer>
          <ChartContainer title="Empty" empty emptyMessage="No data for this period">
            <div className="chart-container-page__placeholder" />
          </ChartContainer>
        </div>
      </DemoBlock>
    </section>
  )
}
