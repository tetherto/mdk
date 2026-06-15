import {
  PoolManagerSitesOverview,
  SITE_OVERVIEW_STATUSES,
} from '@tetherto/mdk-react-devkit/foundation'
import type { JSX } from 'react'
import { useNavigate } from 'react-router-dom'
import { DemoBlock } from '../../../components/demo-block'
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

const mockUnits = [
  {
    id: 'unit-1',
    type: 'container-bd-d40-m56',
    hashrateMhs: 1_420_000_000,
    status: SITE_OVERVIEW_STATUSES.MINING,
    info: { container: 'bitdeer-5a', poolConfig: 'pool-1' },
    miners: { total: 120, disconnected: 2, actualMiners: 118 },
    poolStats: { container: 'bitdeer-5a', overriddenConfig: 3 },
    last: { snap: { stats: { status: 'running' } } },
  },
  {
    id: 'unit-2',
    type: 'container-as-immersion',
    hashrateMhs: 1_380_000_000,
    status: SITE_OVERVIEW_STATUSES.MINING,
    info: { container: 'antspace-immersion-2', poolConfig: 'pool-1' },
    miners: { total: 120, disconnected: 0, actualMiners: 120 },
    poolStats: { container: 'antspace-immersion-2', overriddenConfig: 0 },
    last: { snap: { stats: { status: 'running' } } },
  },
  {
    id: 'unit-3',
    type: 'container-as-hk3',
    hashrateMhs: 0,
    status: SITE_OVERVIEW_STATUSES.OFFLINE,
    info: { container: 'bitmain-hydro-1', poolConfig: 'pool-2' },
    miners: { total: 60, disconnected: 60, actualMiners: 0 },
    poolStats: { container: 'bitmain-hydro-1', overriddenConfig: 0 },
    last: { snap: { stats: { status: 'offline' } } },
  },
  {
    id: 'unit-4',
    type: 'container-as-hk3',
    hashrateMhs: 950_000_000,
    status: SITE_OVERVIEW_STATUSES.MINING,
    info: { container: 'bitmain-hydro-2' },
    miners: { total: 80, disconnected: 5, actualMiners: 75 },
    poolStats: { container: 'bitmain-hydro-2', overriddenConfig: 1 },
    last: { snap: { stats: { status: 'running' } } },
  },
  {
    id: 'unit-5',
    type: 'container-mbt-kehua',
    hashrateMhs: 1_100_000_000,
    status: SITE_OVERVIEW_STATUSES.MINING,
    info: { container: 'microbt-1', poolConfig: 'pool-2' },
    miners: { total: 60, disconnected: 1, actualMiners: 59 },
    poolStats: { container: 'microbt-1', overriddenConfig: 0 },
    last: { snap: { stats: { status: 'running' } } },
  },
]

const InteractiveDemo = (): JSX.Element => {
  const { showToast, ToasterSlot } = useDemoToast()
  const navigate = useNavigate()

  return (
    <div>
      <PoolManagerSitesOverview
        units={mockUnits}
        poolConfig={mockPoolConfig}
        backButtonClick={() => showToast('Back to Pool Manager')}
        onCardClick={(unitId) => navigate(`/pool-manager-sites-overview/${unitId}`)}
      />
      <ToasterSlot />
    </div>
  )
}

export const PoolManagerSitesOverviewPage = (): JSX.Element => (
  <section className="demo-section">
    <div className="pm-dashboard-demo__examples">
      <section>
        <InteractiveDemo />
      </section>

      <DemoBlock title="Loading state">
        <PoolManagerSitesOverview
          units={[]}
          poolConfig={mockPoolConfig}
          isLoading
          backButtonClick={() => {}}
          onCardClick={() => {}}
        />
      </DemoBlock>

      <DemoBlock title="Error state">
        <PoolManagerSitesOverview
          units={[]}
          poolConfig={[]}
          error={new Error('Failed to load data')}
          backButtonClick={() => {}}
          onCardClick={() => {}}
        />
      </DemoBlock>

      <DemoBlock title="Empty units list">
        <PoolManagerSitesOverview
          units={[]}
          poolConfig={mockPoolConfig}
          backButtonClick={() => {}}
          onCardClick={() => {}}
        />
      </DemoBlock>
    </div>
  </section>
)
