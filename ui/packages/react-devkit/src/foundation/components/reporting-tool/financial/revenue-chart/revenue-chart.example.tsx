import { RevenueChart } from '@tetherto/mdk-react-devkit/foundation'

const DEMO_SITE_LIST = [
  { id: 'site-a', name: 'Paraguay' },
  { id: 'site-b', name: 'Uruguay' },
  { id: 'site-c', name: 'Argentina' },
]

const DEMO_DATA = [
  { timeKey: 'Jan 2024', period: 'monthly', timestamp: 1704067200000, 'site-a': 0.0042, 'site-b': 0.0031, 'site-c': 0.0018 },
  { timeKey: 'Feb 2024', period: 'monthly', timestamp: 1706745600000, 'site-a': 0.0051, 'site-b': 0.0028, 'site-c': 0.0022 },
  { timeKey: 'Mar 2024', period: 'monthly', timestamp: 1709251200000, 'site-a': 0.0045, 'site-b': 0.0035, 'site-c': 0.0019 },
]

export const RevenueChartExample = () => (
  <div className="mdk-example-row">
    <RevenueChart data={DEMO_DATA} siteList={DEMO_SITE_LIST} />
  </div>
)
