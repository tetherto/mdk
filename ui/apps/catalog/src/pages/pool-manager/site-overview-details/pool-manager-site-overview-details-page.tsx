import { UNITS } from '@tetherto/mdk-react-devkit/primitives'
import { PoolManagerSiteOverviewDetails } from '@tetherto/mdk-react-devkit/domain'
import type { JSX } from 'react'
import { useParams } from 'react-router-dom'
import { DemoPageHeader } from '../../../components/demo-page-header'
import { useDemoToast } from '../../../utils/use-demo-toast'

const mockPoolConfig = [
  {
    id: 'pool-1',
    poolConfigName: 'Alpha Pool',
    description: 'Primary mining pool',
    poolUrls: [{ url: 'stratum+tcp://alpha.pool.com:3333', pool: 'alpha', workerName: 'worker1' }],
    miners: 24,
    containers: 2,
    updatedAt: 1700000000000,
  },
  {
    id: 'pool-2',
    poolConfigName: 'Beta Pool',
    description: 'Failover pool',
    poolUrls: [{ url: 'stratum+tcp://beta.pool.com:3333', pool: 'beta', workerName: 'worker2' }],
    miners: 12,
    containers: 1,
    updatedAt: 1700000000000,
  },
]

const mockUnit = {
  id: 'unit-1',
  type: 'container-bd-d40-m30',
  info: { container: 'bd-d40-m30_01', poolConfig: 'pool-1' },
  last: {
    snap: {
      stats: {
        status: 'running',
        power_w: 42000,
        ambient_temp_c: 22.5,
      },
    },
    alerts: null,
    err: null,
  },
}

const makeSockets = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ socket: String(i + 1), enabled: true }))

const mockDataOptions = {
  pdus: [
    { pdu: 'a_a', power_w: 14200, sockets: makeSockets(10) },
    { pdu: 'a_b', power_w: 13800, sockets: makeSockets(10) },
    { pdu: 'a_c', power_w: 14000, sockets: makeSockets(10) },
    { pdu: 'a_d', power_w: 9500, sockets: makeSockets(10) },
    { pdu: 'a_e', power_w: 0, sockets: makeSockets(10), offline: true },
    { pdu: 'a_f', power_w: 14200, sockets: makeSockets(10) },
    { pdu: 'a_g', power_w: 13800, sockets: makeSockets(10) },
    { pdu: 'a_h', power_w: 14000, sockets: makeSockets(10) },
    { pdu: 'a_k', power_w: 9500, sockets: makeSockets(10) },
  ],
  connectedMiners: [
    {
      id: 'miner-1',
      type: 'miner',
      info: { pos: 'a_a_1', container: 'bd-d40-m30_01', poolConfig: 'pool-1' },
      last: {
        snap: {
          config: {
            pool_config: [
              { url: 'stratum+tcp://alpha.pool.com:3333', pool: 'alpha', workerName: 'worker1' },
            ],
          },
          stats: { status: 'mining', hashrate_mhs: { t_5m: 142 } },
        },
      },
    },
    {
      id: 'miner-2',
      type: 'miner',
      info: { pos: 'a_a_2', container: 'bd-d40-m30_01', poolConfig: 'pool-1' },
      last: { snap: { stats: { status: 'mining', hashrate_mhs: { t_5m: 138 } } } },
    },
    {
      id: 'miner-3',
      type: 'miner',
      info: { pos: 'a_b_1', container: 'bd-d40-m30_01', poolConfig: 'pool-2' },
      last: { snap: { stats: { status: 'not_mining' } } },
    },
    {
      id: 'miner-4',
      type: 'miner',
      info: { pos: 'a_b_3', container: 'bd-d40-m30_01', poolConfig: 'pool-1' },
      last: { snap: { stats: { status: 'mining', hashrate_mhs: { t_5m: 120 } } } },
    },
    {
      id: 'miner-5',
      type: 'miner',
      info: { pos: 'a_c_1', container: 'bd-d40-m30_01', poolConfig: 'pool-1' },
      last: { snap: { stats: { status: 'mining', hashrate_mhs: { t_5m: 135 } } } },
    },
    {
      id: 'miner-6',
      type: 'miner',
      info: { pos: 'a_d_2', container: 'bd-d40-m30_01', poolConfig: 'pool-2' },
      last: { snap: { stats: { status: 'not_mining' } } },
    },
  ],
  containerHashRate: `1.42 ${UNITS.HASHRATE_PH_S}`,
  actualMinersCount: 6,
}

const InteractiveDemo = (): JSX.Element => {
  const { unitId } = useParams()
  const { showToast, ToasterSlot } = useDemoToast()

  return (
    <div>
      <PoolManagerSiteOverviewDetails
        unit={mockUnit}
        unitName={unitId as string}
        poolConfig={mockPoolConfig}
        dataOptions={mockDataOptions}
        backButtonClick={() => showToast('Back to Site Overview')}
      />
      <ToasterSlot />
    </div>
  )
}

export const PoolManagerSiteOverviewDetailsPage = (): JSX.Element => (
  <section className="demo-section">
    <DemoPageHeader
      title="Site Overview Details"
      description="Detailed view for a single site unit with miner grid and pool assignment"
    />

    <div className="pm-dashboard-demo__examples">
      <section>
        <InteractiveDemo />
      </section>
    </div>
  </section>
)
