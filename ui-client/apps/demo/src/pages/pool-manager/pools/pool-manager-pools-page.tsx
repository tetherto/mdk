import { configureStore } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'

import type { PoolConfigData } from '@tetherto/foundation'
import { actionsSlice, PoolManagerPools, timezoneSlice } from '@tetherto/foundation'

import { DemoPageHeader } from '../../../components/demo-page-header'
import { useDemoToast } from '../../../utils/use-demo-toast'

const store = configureStore({
  reducer: {
    actions: actionsSlice.reducer,
    auth: () => ({
      permissions: {
        superAdmin: true,
        write: true,
        permissions: ['actions:rw'],
      },
    }),
    timezone: timezoneSlice.reducer,
  },
})

const DEMO_POOL_CONFIG: PoolConfigData[] = [
  {
    id: 'pool-1',
    poolConfigName: 'Alpha Pool',
    description: 'Main pool configuration with primary and backup endpoints',
    poolUrls: [
      {
        url: 'stratum+tcp://pool-primary.example.com:3333',
        pool: 'pool1',
        workerName: 'wn-1',
        workerPassword: 'x',
      },
      {
        url: 'stratum+tcp://pool-primary.example.com:4444',
        pool: 'pool1',
        workerName: 'wn-1',
        workerPassword: 'x',
      },
      {
        url: 'stratum+tcp://pool-failover.example.com:3333',
        pool: 'pool1',
        workerName: 'wn-1',
        workerPassword: 'x',
      },
    ],
    miners: 120,
    containers: 4,
    updatedAt: 1773159239533,
  },
  {
    id: 'pool-2',
    poolConfigName: 'Beta Pool',
    description: 'Secondary pool — low fees, proportional rewards',
    poolUrls: [
      {
        url: 'stratum+tcp://pool-secondary.example.com:3333',
        pool: 'pool2',
        workerName: 'worker1-ocean',
        workerPassword: 'x',
      },
      {
        url: 'stratum+tcp://pool-secondary.example.com:4444',
        pool: 'pool2',
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
    description: 'Staging / testing pool — for demo use only',
    poolUrls: [
      {
        url: 'stratum+tcp://pool-staging.example.com:3333',
        pool: 'pool3',
        workerName: 'wn-dev',
        workerPassword: 'wp-dev',
      },
    ],
    miners: 0,
    containers: 0,
    updatedAt: 1773230091305,
  },
  {
    id: 'pool-4',
    poolConfigName: 'Delta Pool',
    description: '',
    poolUrls: [
      {
        url: 'stratum+tcp://pool-dev.example.com:3333',
        pool: 'pool4',
        workerName: 'wn-eu',
        workerPassword: 'x',
      },
      {
        url: 'stratum+tcp://pool-dev.example.com:4444',
        pool: 'pool4',
        workerName: 'wn-eu',
        workerPassword: 'x',
      },
    ],
    miners: 75,
    containers: 3,
    updatedAt: 1773100000000,
  },
]

export const PoolManagerPoolsPageDemo = () => {
  const { showToast, ToasterSlot } = useDemoToast()

  return (
    <Provider store={store}>
      <div>
        <DemoPageHeader title="Pools" />
        <PoolManagerPools
          poolConfig={DEMO_POOL_CONFIG}
          backButtonClick={() => showToast('Back to Pool Manager')}
        />
        <ToasterSlot />
      </div>
    </Provider>
  )
}
