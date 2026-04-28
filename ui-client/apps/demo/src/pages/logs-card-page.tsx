import {
  ACTIVITY_LOG_STATUS,
  LOG_TYPES,
  LogActivityIcon,
  LogDot,
  LogItem,
  LogRow,
  LogsCard,
} from '@tetherto/core'

const sampleLogs = [
  {
    status: ACTIVITY_LOG_STATUS.COMPLETED,
    title: 'Miner Started',
    subtitle: '2024-03-17 10:30:00',
    body: 'Hash rate: 120 MH/s|Temperature: 65°C',
    uuid: '1',
  },
  {
    status: ACTIVITY_LOG_STATUS.PENDING,
    title: 'Configuration Update',
    subtitle: '2024-03-17 10:25:00',
    body: 'Updating pool settings|Waiting for confirmation',
    uuid: '2',
  },
  {
    status: ACTIVITY_LOG_STATUS.COMPLETED,
    title: 'Pool Connected',
    subtitle: '2024-03-17 10:20:00',
    body: 'Connected to pool.example.com:3333|Latency: 45ms',
    uuid: '3',
  },
]

export const LogsCardPage = (): JSX.Element => {
  return (
    <section className="demo-section">
      <h2 className="demo-section__title">Logs Card</h2>

      <div className="demo-section__column" style={{ gap: '2rem' }}>
        {/* LogActivityIcon */}
        <div>
          <h3>LogActivityIcon</h3>
          <div style={{ display: 'flex', gap: '20px', marginTop: '1rem' }}>
            <div>
              <p style={{ marginBottom: '0.5rem', color: 'var(--mdk-color-white)' }}>Completed</p>
              <LogActivityIcon status={ACTIVITY_LOG_STATUS.COMPLETED} />
            </div>
            <div>
              <p style={{ marginBottom: '0.5rem', color: 'var(--mdk-color-white)' }}>Pending</p>
              <LogActivityIcon status={ACTIVITY_LOG_STATUS.PENDING} />
            </div>
          </div>
        </div>

        {/* LogDot */}
        <div>
          <h3>LogDot</h3>
          <div
            style={{ display: 'flex', gap: '20px', marginTop: '1rem', alignItems: 'flex-start' }}
          >
            <div>
              <p style={{ marginBottom: '0.5rem', color: 'var(--mdk-color-white)' }}>
                Activity - Completed
              </p>
              <LogDot type={LOG_TYPES.ACTIVITY} status={ACTIVITY_LOG_STATUS.COMPLETED} />
            </div>
            <div>
              <p style={{ marginBottom: '0.5rem', color: 'var(--mdk-color-white)' }}>
                Activity - Pending
              </p>
              <LogDot type={LOG_TYPES.ACTIVITY} status={ACTIVITY_LOG_STATUS.PENDING} />
            </div>
            <div>
              <p style={{ marginBottom: '0.5rem', color: 'var(--mdk-color-white)' }}>
                Incidents - Critical
              </p>
              <LogDot type={LOG_TYPES.INCIDENTS} status="Critical" />
            </div>
            <div>
              <p style={{ marginBottom: '0.5rem', color: 'var(--mdk-color-white)' }}>
                Incidents - High
              </p>
              <LogDot type={LOG_TYPES.INCIDENTS} status="High" />
            </div>
            <div>
              <p style={{ marginBottom: '0.5rem', color: 'var(--mdk-color-white)' }}>
                Incidents - Medium
              </p>
              <LogDot type={LOG_TYPES.INCIDENTS} status="Medium" />
            </div>
          </div>
        </div>

        {/* LogItem */}
        <div>
          <h3>LogItem</h3>
          <div style={{ marginTop: '1rem', maxWidth: '400px' }}>
            <LogItem
              data={{
                status: ACTIVITY_LOG_STATUS.COMPLETED,
                title: 'Sample Log Entry',
                subtitle: '2024-03-17 10:00:00',
                body: 'First detail|Second detail|Third detail',
                uuid: 'sample-1',
              }}
              onLogClicked={() => {}}
            />
          </div>
        </div>

        {/* LogRow */}
        <div>
          <h3>LogRow</h3>
          <div style={{ marginTop: '1rem', maxWidth: '500px' }}>
            <LogRow log={sampleLogs[0]!} onLogClicked={() => {}} type={LOG_TYPES.ACTIVITY} />
          </div>
        </div>

        {/* LogsCard - Activity Logs */}
        <div>
          <h3>LogsCard (Activity Logs Without Pagination)</h3>
          <div style={{ marginTop: '1rem', maxWidth: '600px' }}>
            <LogsCard
              type={LOG_TYPES.ACTIVITY}
              logsData={sampleLogs}
              label="Activity Log"
              onLogClicked={() => {}}
            />
          </div>
        </div>

        {/* LogsCard - Activity Logs */}
        <div>
          <h3>LogsCard (With Pagination)</h3>
          <div style={{ marginTop: '1rem', maxWidth: '600px' }}>
            <LogsCard
              type={LOG_TYPES.ACTIVITY}
              logsData={[...sampleLogs, ...sampleLogs, ...sampleLogs]}
              label="Activity Log"
              onLogClicked={() => {}}
              pagination={{
                current: 2,
                total: 30,
                pageSize: 10,
                handlePaginationChange: () => {},
              }}
            />
          </div>
        </div>

        {/* LogsCard - Loading State */}
        <div>
          <h3>LogsCard (Loading State)</h3>
          <div style={{ marginTop: '1rem', maxWidth: '600px' }}>
            <LogsCard type={LOG_TYPES.ACTIVITY} label="Loading Logs" isLoading />
          </div>
        </div>

        {/* LogsCard - Empty State */}
        <div>
          <h3>LogsCard (Empty State)</h3>
          <div style={{ marginTop: '1rem', maxWidth: '600px' }}>
            <LogsCard
              type={LOG_TYPES.INCIDENTS}
              logsData={[]}
              label="Incidents"
              emptyMessage="No incidents to display"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

export default LogsCardPage
