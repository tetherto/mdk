/**
 * Runnable example for PoolManagerMinerExplorer.
 *
 * Wrap the app in `<MdkProvider>`. The page reads / writes the actions store
 * and checks `actions:write` permission via the adapter hooks.
 */
import { PoolManagerMinerExplorer } from '@tetherto/mdk-react-devkit'
import type { Device, PoolConfigData } from '@tetherto/mdk-react-devkit'

const mockMiners = [
  {
    id: 'miner-A1',
    code: 'A1',
    name: 'Rig A1',
    last: { hashrate: 102.4, status: 'online' },
  },
  {
    id: 'miner-A2',
    code: 'A2',
    name: 'Rig A2',
    last: { hashrate: 98.7, status: 'online' },
  },
] as unknown as Device[]

const mockPools = [
  { id: 'pool-eu', name: 'EU primary', priority: 1 } as unknown as PoolConfigData,
  { id: 'pool-us', name: 'US backup', priority: 2 } as unknown as PoolConfigData,
]

export const PoolManagerMinerExplorerExample = () => {
  return (
    <PoolManagerMinerExplorer
      miners={mockMiners}
      poolConfig={mockPools}
      backButtonClick={() => {
        // eslint-disable-next-line no-console
        console.log('back to pool manager')
      }}
    />
  )
}
