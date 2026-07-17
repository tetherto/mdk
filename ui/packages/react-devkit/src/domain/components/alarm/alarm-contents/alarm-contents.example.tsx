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
]

export const AlarmContentsExample = () => (
  <div className="mdk-example-row">
    <AlarmContents
      alarmsData={mockAlarms}
      onNavigate={(path) => {
        console.warn(`navigate to ${path}`)
      }}
    />
  </div>
)
