/**
 * Runnable example for ActiveIncidentsCard.
 */
import { ActiveIncidentsCard, type TIncidentRowProps } from '@tetherto/mdk-react-devkit'

const mockItems: TIncidentRowProps[] = [
  {
    id: '1',
    severity: 'critical',
    title: 'Miner 0xA1 offline',
    body: 'No telemetry received in 2 min.',
    subtitle: '2 min ago',
  },
  {
    id: '2',
    severity: 'high',
    title: 'Container 03 temp >78°C',
    body: 'Sustained above warning threshold.',
    subtitle: '12 min ago',
  },
  {
    id: '3',
    severity: 'medium',
    title: 'Pool latency elevated',
    body: 'Round-trip 220ms (baseline 80ms).',
    subtitle: '1 h ago',
  },
]

export const ActiveIncidentsCardExample = () => {
  return (
    <ActiveIncidentsCard
      label="Active Alerts"
      items={mockItems}
      onItemClick={(id) => {
        // eslint-disable-next-line no-console
        console.log(`open alert ${id}`)
      }}
    />
  )
}
