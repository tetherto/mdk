/**
 * Runnable example for PoolManagerPools.
 *
 * Wrap the app in `<MdkProvider>` — the "Add Pool" modal uses the
 * contextual-modal adapter hook.
 */
import { PoolManagerPools } from '@tetherto/mdk-react-devkit'
import type { PoolConfigData } from '@tetherto/mdk-react-devkit'

const mockPools: PoolConfigData[] = [
  {
    id: 'pool-eu',
    name: 'EU primary',
    url: 'stratum+tcp://eu.example.pool:3333',
    worker: 'rig-eu-01',
    priority: 1,
    fee: 1.5,
    activeWorkers: 124,
    status: 'Healthy',
  } as unknown as PoolConfigData,
  {
    id: 'pool-us',
    name: 'US backup',
    url: 'stratum+tcp://us.example.pool:3333',
    worker: 'rig-us-01',
    priority: 2,
    fee: 2,
    activeWorkers: 0,
    status: 'Standby',
  } as unknown as PoolConfigData,
]

export const PoolManagerPoolsExample = () => {
  return (
    <PoolManagerPools
      poolConfig={mockPools}
      backButtonClick={() => {
        // eslint-disable-next-line no-console
        console.log('back to pool manager')
      }}
    />
  )
}
