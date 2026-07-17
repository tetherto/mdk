/**
 * Runnable example for PoolManagerSiteOverviewDetails.
 */
import { PoolManagerSiteOverviewDetails } from '@tetherto/mdk-react-devkit'
import type { Device, PoolConfigData } from '@tetherto/mdk-react-devkit'

const mockUnit = {
  id: 'site-eu-01',
  code: 'EU-01',
  name: 'EU Site 01',
  last: {
    hashrate: 102_400,
    minersOnline: 998,
    minersTotal: 1024,
    status: 'online',
  },
} as unknown as Device

const mockPools: PoolConfigData[] = [
  { id: 'pool-eu', name: 'EU primary', priority: 1 } as unknown as PoolConfigData,
  { id: 'pool-us', name: 'US backup', priority: 2 } as unknown as PoolConfigData,
]

export const PoolManagerSiteOverviewDetailsExample = () => {
  return (
    <PoolManagerSiteOverviewDetails
      unit={mockUnit}
      unitName="EU Site 01"
      poolConfig={mockPools}
      backButtonClick={() => {}}
    />
  )
}
