/**
 * Runnable example for WidgetTopRow.
 */
import { WidgetTopRow } from '@tetherto/mdk-react-devkit'

export const WidgetTopRowExample = () => {
  return (
    <WidgetTopRow
      title="Container 03"
      power={31_500}
      unit="kW"
      alarms={{
        liquidAlarms: [
          {
            severity: 'critical',
            name: 'inlet_overheating',
            description: 'Inlet > 78°C',
            createdAt: Date.now() - 5 * 60 * 1000,
          },
        ],
      }}
    />
  )
}
