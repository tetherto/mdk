/**
 * Runnable example for PoolManagerSitesOverview.
 *
 * Wire `units` to your data hook of choice (e.g. `useSitesOverviewData` +
 * TanStack Query) — the component renders loading / error / empty states
 * internally.
 */
import { PoolManagerSitesOverview } from '@tetherto/mdk-react-devkit'
import type { PoolConfigData } from '@tetherto/mdk-react-devkit'

const mockUnits = [
  {
    id: 'site-eu-01',
    name: 'EU Site 01',
    miners: 1024,
    minersOnline: 998,
    hashrateMhs: 102_400,
    activeIncidents: 2,
    pools: [{ id: 'pool-eu', name: 'EU primary', priority: 1 }],
  },
  {
    id: 'site-us-01',
    name: 'US Site 01',
    miners: 512,
    minersOnline: 512,
    hashrateMhs: 53_200,
    activeIncidents: 0,
    pools: [{ id: 'pool-us', name: 'US primary', priority: 1 }],
  },
] as never

const mockPools = [
  { id: 'pool-eu', name: 'EU primary', priority: 1 } as unknown as PoolConfigData,
  { id: 'pool-us', name: 'US primary', priority: 1 } as unknown as PoolConfigData,
]

export const PoolManagerSitesOverviewExample = () => {
  return (
    <PoolManagerSitesOverview
      units={mockUnits}
      poolConfig={mockPools}
      backButtonClick={() => {
        // eslint-disable-next-line no-console
        console.log('back to pool manager')
      }}
      onCardClick={(id) => {
        // eslint-disable-next-line no-console
        console.log(`navigate to site ${id}`)
      }}
    />
  )
}
