/**
 * Runnable example for ChartStatsFooter.
 */
import { ChartStatsFooter } from '@tetherto/mdk-react-devkit'

export const ChartStatsFooterExample = () => (
  <div className="mdk-example-row" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
    {/* Min/Max/Avg only */}
    <ChartStatsFooter minMaxAvg={{ min: '10 TH/s', avg: '55 TH/s', max: '100 TH/s' }} />

    {/* Stats grid alongside min/max/avg */}
    <ChartStatsFooter
      minMaxAvg={{ min: '10 TH/s', avg: '55 TH/s', max: '100 TH/s' }}
      stats={[
        { label: 'Uptime', value: '99.5%' },
        { label: 'Rejected', value: '0.2%' },
      ]}
    />

    {/* Multiple stats per column */}
    <ChartStatsFooter
      stats={[
        { label: 'Pool A', value: '60 TH/s' },
        { label: 'Pool B', value: '42 TH/s' },
        { label: 'Pool C', value: '38 TH/s' },
        { label: 'Pool D', value: '27 TH/s' },
      ]}
      statsPerColumn={2}
    />

    {/* Secondary label row */}
    <ChartStatsFooter
      minMaxAvg={{ min: '800 W', avg: '1 100 W', max: '1 400 W' }}
      secondaryLabel={{ title: 'Time range', value: 'Last 24 hours' }}
    />

    {/* Average placeholder when no data */}
    <ChartStatsFooter minMaxAvg={{ min: '-', avg: '-', max: '-' }} />
  </div>
)
