import { GenericDataBox } from '@tetherto/mdk-react-devkit'

export const GenericDataBoxExample = () => (
  <div className="mdk-example-row">
    <GenericDataBox
      data={[
        { label: 'Temperature', value: 45, units: '°C' },
        { label: 'Pressure', value: 2.5, units: 'bar', isHighlighted: true },
        { label: 'Status', value: 'Running', color: 'green' },
      ]}
    />
  </div>
)
