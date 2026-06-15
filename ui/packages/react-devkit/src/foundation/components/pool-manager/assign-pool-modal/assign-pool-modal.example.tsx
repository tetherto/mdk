/**
 * Runnable example for AssignPoolModal.
 */
import { useState } from 'react'

import type { Device, PoolConfigData, PoolSummary } from '@tetherto/mdk-react-devkit'
import { AssignPoolModal } from '@tetherto/mdk-react-devkit'

const mockPoolConfig: PoolConfigData[] = [
  {
    id: 'pool-1',
    poolConfigName: 'Alpha Pool',
    description: 'Primary pool with failover',
    poolUrls: [
      { url: 'stratum+tcp://pool-primary.example.com:3333', pool: 'pool1', workerName: 'wn-1', workerPassword: 'x' },
      { url: 'stratum+tcp://pool-failover.example.com:3333', pool: 'pool1', workerName: 'wn-1', workerPassword: 'x' },
    ],
    miners: 120,
    containers: 4,
    updatedAt: 1773159239533,
  },
  {
    id: 'pool-2',
    poolConfigName: 'Beta Pool',
    description: 'Secondary pool — low fees',
    poolUrls: [
      { url: 'stratum+tcp://pool-secondary.example.com:3333', pool: 'pool2', workerName: 'worker1', workerPassword: 'x' },
    ],
    miners: 39,
    containers: 6,
    updatedAt: 1773172151132,
  },
]

const mockMiners: Device[] = [
  {
    id: 'miner-1',
    type: 'miner',
    code: 'S19XP.192.168.1.10',
    tags: ['site-a'],
    info: { container: 'Unit-01', poolConfig: 'pool-1' },
    last: { snap: { stats: { status: 'mining' } } },
  },
  {
    id: 'miner-2',
    type: 'miner',
    code: 'S21.192.168.1.11',
    tags: ['site-a'],
    info: { container: 'Unit-01', poolConfig: 'pool-2' },
    last: { snap: { stats: { status: 'offline' } } },
  },
]

export const AssignPoolModalExample = () => {
  const [isOpen, setIsOpen] = useState(false)

  const handleSubmit = async ({ pool }: { pool: PoolSummary }) => {
    await new Promise((resolve) => setTimeout(resolve, 800))
    // eslint-disable-next-line no-console
    console.log(`Assigned ${mockMiners.length} miners to "${pool.name}"`)
    setIsOpen(false)
  }

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Assign Pool</button>
      <AssignPoolModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSubmit={handleSubmit}
        miners={mockMiners}
        poolConfig={mockPoolConfig}
      />
    </>
  )
}
