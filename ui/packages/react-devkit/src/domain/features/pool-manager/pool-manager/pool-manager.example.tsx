/**
 * Runnable example for the composite PoolManager.
 *
 * Wrap the app in `<MdkProvider>` — the sub-views and the pending-actions tray
 * use adapter hooks (contextual modal, actions store, voting submit).
 */
import { PoolManager } from '@tetherto/mdk-react-devkit'
import type { DashboardStats, PoolConfigData } from '@tetherto/mdk-react-devkit'

const mockStats: DashboardStats = {
  items: [
    { label: 'Active workers', value: 1234 },
    { label: 'Hashrate', value: 102.4, secondaryValue: 'TH/s' },
    { label: 'Online miners', value: 456, secondaryValue: '/ 512', type: 'SUCCESS' },
  ],
}

const mockPoolConfig: PoolConfigData[] = [
  {
    id: 'pool-eu',
    name: 'EU primary',
    url: 'stratum+tcp://eu.example.pool:3333',
  } as unknown as PoolConfigData,
]

export const PoolManagerExample = () => {
  return (
    <PoolManager
      poolConfig={mockPoolConfig}
      stats={mockStats}
      onViewAllAlerts={() => {
        // eslint-disable-next-line no-console
        console.log('view all alerts')
      }}
    />
  )
}
