/**
 * Runnable example for AlarmContents and AlarmRow.
 */
import { AlarmContents } from '@tetherto/mdk-react-devkit'

const mockAlarms = [
  {
    item: {
      title: 'Miner 0xA1 offline',
      subtitle: '2 min ago',
      body: 'No telemetry received in 2 min.|Check network connection.',
      uuid: 'alarm-001',
      status: 'critical',
    },
    dot: null,
    children: null,
  },
  {
    item: {
      title: 'Container 03 temp >78°C',
      subtitle: '12 min ago',
      body: 'Sustained above warning threshold.|Fan speed at maximum.',
      uuid: 'alarm-002',
      status: 'warning',
    },
    dot: null,
    children: null,
  },
  {
    item: {
      title: 'Pool latency elevated',
      subtitle: '1 h ago',
      body: 'Round-trip 220ms (baseline 80ms).',
      uuid: 'alarm-003',
      status: 'info',
    },
    dot: null,
    children: null,
  },
]

export const AlarmExample = () => (
  <div className="mdk-example-row">
    <AlarmContents
      alarmsData={mockAlarms}
      onNavigate={(path) => {
        // eslint-disable-next-line no-console
        console.log(`navigate to ${path}`)
      }}
    />
  </div>
)
