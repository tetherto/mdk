/**
 * Runnable example for LogsCard (and supporting log components).
 */
import { useState } from 'react'
import { LogsCard } from '@tetherto/mdk-react-devkit'
import type { LogData } from '@tetherto/mdk-react-devkit'

const INCIDENT_LOGS: LogData[] = [
  {
    uuid: '1',
    title: 'High temperature detected',
    subtitle: 'Miner S19-042 · Rack 3',
    body: 'Chip temp: 98°C|Ambient: 42°C',
    status: 'Critical',
  },
  {
    uuid: '2',
    title: 'Hash rate drop',
    subtitle: 'Miner S19-017 · Rack 1',
    body: 'Expected: 100 TH/s|Actual: 62 TH/s',
    status: 'High',
  },
  {
    uuid: '3',
    title: 'Pool connection unstable',
    subtitle: 'Pool Manager',
    body: 'Reconnections: 4 in last 15 min',
    status: 'Medium',
  },
]

const ACTIVITY_LOGS: LogData[] = [
  {
    uuid: '4',
    title: 'Firmware update completed',
    subtitle: '12 miners · Rack 2',
    body: 'Version: 2.1.4',
    status: 'Success',
  },
  {
    uuid: '5',
    title: 'Miner restarted',
    subtitle: 'Miner A1346-008',
    body: 'Reason: Manual restart',
    status: 'Info',
  },
]

export const LogsExample = () => {
  const [page, setPage] = useState(2)

  return (
    <div className="mdk-example-row" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Incidents with pagination */}
      <LogsCard
        label="Recent Incidents"
        type="Incidents"
        logsData={INCIDENT_LOGS}
        pagination={{
          current: page,
          total: 30,
          pageSize: 3,
          handlePaginationChange: setPage,
        }}
        onLogClicked={(uuid) => console.warn('clicked', uuid)}
      />

      {/* Activity log */}
      <LogsCard label="Activity Log" type="Activity" logsData={ACTIVITY_LOGS} />

      {/* Loading state */}
      <LogsCard label="Loading…" type="Incidents" isLoading skeletonRows={4} />

      {/* Empty state */}
      <LogsCard
        label="No Incidents"
        type="Incidents"
        logsData={[]}
        emptyMessage="All systems normal"
      />
    </div>
  )
}
