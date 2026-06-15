/**
 * Runnable example for DoughnutChart.
 */
import { DoughnutChart } from '@tetherto/mdk-react-devkit'

const deviceStatusData = [
  { label: 'Online', value: 142, color: '#34C759' },
  { label: 'Offline', value: 23, color: '#FF3B30' },
  { label: 'Maintenance', value: 8, color: '#FF9500' },
]

const hashDistributionData = [
  { label: 'Foundry EU', value: 450 },
  { label: 'AntPool', value: 320 },
  { label: 'F2Pool', value: 180 },
  { label: 'Other', value: 50 },
]

export const DoughnutChartExample = () => (
  <div className="mdk-example-row">
    <DoughnutChart data={deviceStatusData} unit="devices" legendPosition="right" />
    <DoughnutChart data={hashDistributionData} unit="TH/s" height={200} legendPosition="bottom" />
  </div>
)
