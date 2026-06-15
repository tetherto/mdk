import { COLOR, UNITS } from '@tetherto/mdk-react-devkit/core'
import { MetricCard } from '@tetherto/mdk-react-devkit/foundation'
import type { JSX } from 'react'

import { DemoBlock } from '../components/demo-block'
import { DemoPageHeader } from '../components/demo-page-header'

import './metric-card-page.scss'

export const MetricCardPage = (): JSX.Element => (
  <section className="demo-section metric-card-page">
    <DemoPageHeader
      title="Metric Card"
      description="Compact label and value tile for dashboard metrics."
    />

    <div className="metric-card-page__content">
      <DemoBlock title="Default">
        <div className="metric-card-page__row">
          <MetricCard label="Hash Rate" value={1540} unit={UNITS.HASHRATE_TH_S} />
          <MetricCard label="Power" value={234} unit={UNITS.POWER_KW} />
          <MetricCard label="Temperature" value={65} unit={UNITS.TEMPERATURE_C} />
        </div>
      </DemoBlock>

      <DemoBlock title="Highlighted value">
        <MetricCard label="Active Workers" value={128} unit="" isHighlighted />
      </DemoBlock>

      <DemoBlock title="Muted value and zero dash">
        <div className="metric-card-page__row">
          <MetricCard
            label="Rejected"
            value={0}
            unit={UNITS.PERCENT}
            isTransparentColor
            showDashForZero
          />
          <MetricCard label="Stale Shares" value={0} unit="" showDashForZero />
        </div>
      </DemoBlock>

      <DemoBlock title="Medium value and custom background">
        <MetricCard
          label="Efficiency"
          value="32.5"
          isValueMedium
          bgColor={COLOR.RED}
          unit={UNITS.EFFICIENCY_W_PER_TH_S}
        />
      </DemoBlock>

      <DemoBlock title="No minimum width (dense row)">
        <div className="metric-card-page__row metric-card-page__row--dense">
          <MetricCard label="A" value={1} unit="" noMinWidth />
          <MetricCard label="B" value={2} unit="" noMinWidth />
          <MetricCard label="C" value={3} unit="" noMinWidth />
          <MetricCard label="D" value={4} unit="" noMinWidth />
        </div>
      </DemoBlock>
    </div>
  </section>
)
