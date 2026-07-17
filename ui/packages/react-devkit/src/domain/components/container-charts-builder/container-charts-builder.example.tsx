/**
 * Runnable example for ContainerChartsBuilder.
 */
import ContainerChartsBuilder from './index'

const NOW = Date.now() / 1000

const mockTelemetry = Array.from({ length: 60 }, (_, i) => ({
  ts: NOW - (60 - i) * 60,
  container_specific_stats_group_aggr: {
    'cont-A': {
      inlet_c: 22 + Math.sin(i / 8) + Math.random() * 0.3,
      outlet_c: 38 + Math.sin(i / 9) * 1.5 + Math.random() * 0.4,
    },
  },
}))

const chartDataPayload = {
  unit: '°C',
  lines: [
    { backendAttribute: 'inlet_c', label: 'Inlet', borderColor: '#4f9ef5' },
    { backendAttribute: 'outlet_c', label: 'Outlet', borderColor: '#f97316' },
  ],
  currentValueLabel: { backendAttribute: 'outlet_c', decimals: 1 },
  valueDecimals: 1,
}

export const ContainerChartsBuilderExample = () => {
  return (
    <ContainerChartsBuilder
      tag="cont-A"
      chartTitle="Container temperature"
      chartDataPayload={chartDataPayload}
      data={mockTelemetry}
      fixedTimezone="UTC"
      height={320}
    />
  )
}
