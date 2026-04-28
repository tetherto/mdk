import { configureStore } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'

import type { Device, PoolConfigData } from '@tetherto/mdk-foundation-ui'
import {
  actionsSlice,
  COMPLETE_MINER_TYPES,
  PoolManagerMinerExplorer,
  timezoneSlice,
} from '@tetherto/mdk-foundation-ui'

import { DemoPageHeader } from '../../../components/demo-page-header'
import { useDemoToast } from '../../../utils/use-demo-toast'

const store = configureStore({
  reducer: {
    actions: actionsSlice.reducer,
    auth: () => {
      return {
        permissions: {
          superAdmin: true,
          write: true,
          permissions: ['actions:rw'],
        },
      }
    },
    timezone: timezoneSlice.reducer,
  },
})

const DEMO_POOL_CONFIG: PoolConfigData[] = [
  {
    id: 'pool-1',
    poolConfigName: 'Alpha Pool',
    description: 'Main pool configuration',
    poolUrls: [
      {
        url: 'tcp://pool.example.com:3333',
        pool: 'pool1',
        workerName: 'wn-1',
        workerPassword: 'x',
      },
      {
        url: 'tcp://pool.example.com:3333',
        pool: 'pool2',
        workerName: 'wn-1',
        workerPassword: 'x',
      },
    ],
    miners: 12,
    containers: 3,
    updatedAt: 1773159239533,
  },
  {
    id: 'pool-2',
    poolConfigName: 'Beta Pool',
    description: 'Secondary pool',
    poolUrls: [
      {
        url: 'tcp://pool.example.com:3333',
        pool: 'pool3',
        workerName: 'worker1-ocean',
        workerPassword: 'x',
      },
    ],
    miners: 39,
    containers: 6,
    updatedAt: 1773172151132,
  },
  {
    id: 'pool-3',
    poolConfigName: 'Gamma Pool',
    description: 'Staging / testing pool',
    poolUrls: [
      {
        url: 'tcp://pool.example.com:3333',
        pool: 'pool4',
        workerName: 'wn-dev',
        workerPassword: 'wp-dev',
      },
      {
        url: 'tcp://pool.example.com:3333',
        pool: 'pool5',
        workerName: 'wn-dev',
        workerPassword: 'wp-dev',
      },
    ],
    miners: 0,
    containers: 0,
    updatedAt: 1773230091305,
  },
]

const DEMO_MINERS: Device[] = Array.from({ length: 30 }, (_, i) => ({
  id: `device-${i + 1}`,
  code: `M-${String(i + 1).padStart(3, '0')}`,
  type: Object.values(COMPLETE_MINER_TYPES)[i],
  tags: [`code-M-${String(i + 1).padStart(3, '0')}`, 't-miner'],
  info: {
    container: `unit-0${(i % 3) + 1}`,
    poolConfig: ['pool-1', 'pool-2', 'pool-3'][i % 3],
  },
  last: {
    ts: Date.now() - i * 120_000,
    snap: {
      stats: {
        status: i % 4 === 0 ? 'offline' : i % 4 === 1 ? 'sleeping' : 'mining',
        hashrate_mhs: {
          t_5m: i % 4 === 0 ? 0 : 90 + i * 10,
        },
      },
    },
  },
})) as Device[]

export const PoolManagerMinerExplorerPageDemo = () => {
  const { showToast, ToasterSlot } = useDemoToast()

  return (
    <Provider store={store}>
      <div className="mdk-pm-miner-explorer-page-demo">
        <DemoPageHeader title="Miner Explorer" />
        <PoolManagerMinerExplorer
          miners={DEMO_MINERS}
          poolConfig={DEMO_POOL_CONFIG}
          backButtonClick={() => showToast('Back to Pool Manager')}
        />
        <ToasterSlot />
      </div>
    </Provider>
  )
}
