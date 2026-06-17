import { CHART_COLORS, ThresholdLineChart, UNITS } from '@tetherto/mdk-react-devkit/core'

const powerData = {
  series: [
    {
      label: 'Power Consumption',
      color: CHART_COLORS.orange,
      points: [
        { timestamp: '2025-01-01T00:00:00.000Z', value: 28 },
        { timestamp: '2025-01-02T00:00:00.000Z', value: 31 },
        { timestamp: '2025-01-03T00:00:00.000Z', value: 29 },
      ],
    },
  ],
  thresholds: [{ label: 'Power Availability', value: 38, color: CHART_COLORS.green }],
}

export const ThresholdLineChartExample = () => (
  <div className="mdk-example-row">
    <ThresholdLineChart title="Power Consumption" data={powerData} unit={UNITS.ENERGY_MW} />
  </div>
)
