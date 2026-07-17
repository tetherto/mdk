/**
 * Shared demo fixtures for pool-manager pages.
 * Used by: PoolManagerPools, PoolManagerMinerExplorer, AssignPoolModal demos.
 */

import type { Device, PoolConfigData } from '@tetherto/mdk-react-devkit/domain'
import { COMPLETE_MINER_TYPES } from '@tetherto/mdk-react-devkit/domain'

export const DEMO_POOL_CONFIG: PoolConfigData[] = [
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

export const DEMO_MINERS: Device[] = Array.from({ length: 30 }, (_, i) => ({
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
