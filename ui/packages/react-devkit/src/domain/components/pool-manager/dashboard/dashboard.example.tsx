/**
 * Runnable example for PoolManagerDashboard.
 */
import { type DashboardStats, PoolManagerDashboard } from '@tetherto/mdk-react-devkit'

const mockStats: DashboardStats = {
  items: [
    { label: 'Active workers', value: 1234 },
    { label: 'Hashrate', value: 102.4, secondaryValue: 'TH/s' },
    { label: 'Online miners', value: 456, secondaryValue: '/ 512', type: 'SUCCESS' },
  ],
}

const mockAlerts = [
  {
    severity: 'critical',
    description: 'Miner offline',
    code: '001',
    createdAt: Date.now() - 5 * 60 * 1000,
    name: 'miner_offline',
  },
  {
    severity: 'warning',
    description: 'Container temp >78°C',
    code: '002',
    createdAt: Date.now() - 30 * 60 * 1000,
    name: 'temp_high',
  },
]

export const PoolManagerDashboardExample = () => {
  return (
    <PoolManagerDashboard
      stats={mockStats}
      alerts={mockAlerts as never}
      onNavigationClick={(url) => {
        // eslint-disable-next-line no-console
        console.log(`navigate to ${url}`)
      }}
      onViewAllAlerts={() => {
        // eslint-disable-next-line no-console
        console.log('view all alerts')
      }}
    />
  )
}
