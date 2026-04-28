/* eslint-disable no-console */
import type { ReactElement } from 'react'

import { DemoPageHeader } from '../../../components/demo-page-header'
import type { Alert, DashboardStats } from '@tetherto/foundation'
import { PoolManagerDashboard } from '@tetherto/foundation'

import './pool-manager-dashboard-page.scss'

const STATS_FULL: DashboardStats = {
  items: [
    { label: 'Total Miners', value: 1240, type: 'SUCCESS' },
    {
      label: 'Configured Miners',
      value: 1102,
      secondaryValue: '88.87%',
      type: 'SUCCESS',
    },
    { label: 'Errors', value: 14, type: 'ERROR' },
  ],
}

const STATS_NO_ERRORS: DashboardStats = {
  items: [
    { label: 'Total Miners', value: 800, type: 'SUCCESS' },
    { label: 'Configured Miners', value: 800, secondaryValue: '100%', type: 'SUCCESS' },
    { label: 'Errors', value: 0, type: 'SUCCESS' },
  ],
}

const STATS_ZERO: DashboardStats = {
  items: [
    { label: 'Total Miners', value: 0 },
    { label: 'Configured Miners', value: 0, secondaryValue: '0%' },
    { label: 'Errors', value: 0 },
  ],
}

const ALERTS_FULL: Alert[] = [
  {
    id: '1',
    code: 'SN-001',
    severity: 'critical',
    description: 'Pool connection failed',
    createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    name: '',
  },
  {
    id: '2',
    code: 'SN-042',
    severity: 'high',
    description: 'All pools dead',
    createdAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    name: '',
  },
  {
    id: '3',
    code: 'SN-107',
    severity: 'medium',
    description: 'Wrong miner subaccount',
    createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    name: '',
  },
  {
    id: '4',
    code: 'SN-210',
    severity: 'low',
    description: 'Wrong worker name',
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    name: '',
  },
  {
    id: '5',
    code: 'SN-333',
    severity: 'info',
    description: 'IP worker name mismatch',
    createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    name: '',
  },
]

const ALERTS_SINGLE: Alert[] = [
  {
    id: '10',
    code: 'SN-099',
    severity: 'critical',
    description: 'Pool connection failed',
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    name: '',
  },
]

type DemoBlockProps = {
  title: string
  children: ReactElement
}

const DemoBlock = ({ title, children }: DemoBlockProps) => (
  <div className="pm-dashboard-demo__section">
    <h3>{title}</h3>
    <div className="pm-dashboard-demo__card">{children}</div>
  </div>
)

export const PoolManagerDashboardPage = (): ReactElement => (
  <div className="pm-dashboard-demo">
    <DemoPageHeader
      title="Dashboard"
      description={
        <>
          Renders <code>PoolManagerDashboard</code> across all prop combinations.
        </>
      }
    />

    <div className="pm-dashboard-demo__examples">
      <DemoBlock title="Full — Stats + Alerts">
        <PoolManagerDashboard
          stats={STATS_FULL}
          alerts={ALERTS_FULL}
          onNavigationClick={(url) => console.log('navigate:', url)}
          onViewAllAlerts={() => console.log('view all alerts')}
        />
      </DemoBlock>

      <DemoBlock title="All Green — No Errors">
        <PoolManagerDashboard
          stats={STATS_NO_ERRORS}
          alerts={[]}
          onNavigationClick={(url) => console.log('navigate:', url)}
          onViewAllAlerts={() => console.log('view all alerts')}
        />
      </DemoBlock>

      <DemoBlock title="Zero Stats">
        <PoolManagerDashboard
          stats={STATS_ZERO}
          alerts={[]}
          onNavigationClick={(url) => console.log('navigate:', url)}
          onViewAllAlerts={() => console.log('view all alerts')}
        />
      </DemoBlock>

      <h2 className="pm-dashboard-demo__group-title">Alerts</h2>

      <DemoBlock title="Single Alert">
        <PoolManagerDashboard
          stats={STATS_FULL}
          alerts={ALERTS_SINGLE}
          onNavigationClick={(url) => console.log('navigate:', url)}
          onViewAllAlerts={() => console.log('view all alerts')}
        />
      </DemoBlock>

      <DemoBlock title="No Alerts">
        <PoolManagerDashboard
          stats={STATS_FULL}
          alerts={[]}
          onNavigationClick={(url) => console.log('navigate:', url)}
          onViewAllAlerts={() => console.log('view all alerts')}
        />
      </DemoBlock>

      <h2 className="pm-dashboard-demo__group-title">Loading & No Stats</h2>

      <DemoBlock title="Stats Loading">
        <PoolManagerDashboard
          isStatsLoading
          alerts={ALERTS_FULL}
          onNavigationClick={(url) => console.log('navigate:', url)}
          onViewAllAlerts={() => console.log('view all alerts')}
        />
      </DemoBlock>

      <DemoBlock title="No Stats Prop">
        <PoolManagerDashboard
          alerts={ALERTS_FULL}
          onNavigationClick={(url) => console.log('navigate:', url)}
          onViewAllAlerts={() => console.log('view all alerts')}
        />
      </DemoBlock>
    </div>
  </div>
)
