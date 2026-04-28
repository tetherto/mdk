import { ActiveIncidentsCard } from '@tetherto/foundation'
import type { TIncidentRowProps } from '@tetherto/foundation'

const mockIncidents: TIncidentRowProps[] = [
  {
    id: '1',
    title: 'High Temperature Alert',
    subtitle: 'Miner #A2341',
    body: 'Temperature exceeded 85°C threshold',
    severity: 'critical',
  },
  {
    id: '2',
    title: 'Network Connection Lost',
    subtitle: 'Pool: pool.example.com',
    body: 'Connection timeout after 30 seconds',
    severity: 'high',
  },
  {
    id: '3',
    title: 'Hashrate Dropped',
    subtitle: 'Worker: worker-05',
    body: 'Hashrate below expected threshold by 15%',
    severity: 'medium',
  },
  {
    id: '4',
    title: 'Fan Speed Warning',
    subtitle: 'Miner #B1122',
    body: 'Fan speed below optimal range',
    severity: 'medium',
  },
]

export const ActiveIncidentsCardPage = (): JSX.Element => {
  const handleIncidentClick = (_id: string): void => {
    // Handle incident click
  }

  return (
    <section className="demo-section">
      <h2 className="demo-section__title">Active Incidents Card</h2>
      <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: '1fr', maxWidth: '600px' }}>
        <section>
          <h3>With Incidents</h3>
          <ActiveIncidentsCard
            label="Active Alerts"
            items={mockIncidents}
            onItemClick={handleIncidentClick}
          />
        </section>

        <section>
          <h3>Empty State</h3>
          <ActiveIncidentsCard
            label="Active Alerts"
            items={[]}
            emptyMessage="No active incidents"
          />
        </section>

        <section>
          <h3>Loading State</h3>
          <ActiveIncidentsCard label="Active Alerts" isLoading skeletonRows={4} />
        </section>
      </div>
    </section>
  )
}
