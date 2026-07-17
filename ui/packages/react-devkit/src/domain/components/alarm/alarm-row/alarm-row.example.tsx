import { AlarmRow } from '@tetherto/mdk-react-devkit'

const mockAlarm = {
  item: {
    title: 'Container 03 temp >78°C',
    subtitle: '12 min ago',
    body: 'Sustained above warning threshold.|Fan speed at maximum.',
    uuid: 'alarm-002',
    status: 'warning',
  },
  dot: null,
  children: null,
}

export const AlarmRowExample = () => (
  <div className="mdk-example-row">
    <AlarmRow
      data={mockAlarm}
      onNavigate={(path) => {
        console.warn(`navigate to ${path}`)
      }}
    />
  </div>
)
