import { RevenueChart } from '@tetherto/mdk-react-devkit/domain'
import type { ReactElement } from 'react'

import { DemoBlock } from '../../../../components/demo-block'
import { DemoPageHeader } from '../../../../components/demo-page-header'

const SITE_LIST = [
  { id: 'site-a', name: 'Site A' },
  { id: 'site-b', name: 'Site B' },
  { id: 'site-c', name: 'Site C' },
]

const MONTHS = ['Jan 2024', 'Feb 2024', 'Mar 2024', 'Apr 2024', 'May 2024', 'Jun 2024']

// Values well above 1 BTC per site → stays in BTC display
const BTC_DATA = MONTHS.map((month, i) => ({
  timeKey: month,
  period: 'monthly',
  timestamp: new Date(month).getTime() + i * 1000,
  'site-a': +(2.1 + i * 0.3).toFixed(4),
  'site-b': +(1.6 + i * 0.2).toFixed(4),
  'site-c': +(0.9 + i * 0.15).toFixed(4),
}))

// Values well below 1 BTC per site → auto-converted to Sats (× 1 000 000)
// After conversion: site-a ~420–670 Sats, site-b ~310–460 Sats, site-c ~180–280 Sats
const SATS_DATA = MONTHS.map((month, i) => ({
  timeKey: month,
  period: 'monthly',
  timestamp: new Date(month).getTime() + i * 1000,
  'site-a': +(0.00042 + i * 0.00005).toFixed(8),
  'site-b': +(0.00031 + i * 0.00003).toFixed(8),
  'site-c': +(0.00018 + i * 0.00002).toFixed(8),
}))

export const RevenueChartDemo = (): ReactElement => (
  <>
    <DemoPageHeader title="Revenue Chart" />

    <DemoBlock title="BTC Scale" description="Values > 1 BTC average — displayed in ₿">
      <RevenueChart data={BTC_DATA} siteList={SITE_LIST} />
    </DemoBlock>

    <DemoBlock title="Sats Scale" description="Values ≤ 1 BTC average — auto-converted to Sats">
      <RevenueChart data={SATS_DATA} siteList={SITE_LIST} />
    </DemoBlock>

    <DemoBlock title="Empty State">
      <RevenueChart data={[]} siteList={SITE_LIST} />
    </DemoBlock>
  </>
)
