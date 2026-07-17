/**
 * Runnable example for ChartWrapper.
 *
 * The wrapper handles three states (loading skeleton, no-data placeholder,
 * has-data) so individual chart components don't need to repeat the logic.
 */
import { ChartWrapper, LineChart } from '@tetherto/mdk-react-devkit'

const chartData = {
  labels: ['00:00', '01:00', '02:00', '03:00', '04:00', '05:00'],
  datasets: [
    {
      label: 'Hashrate (TH/s)',
      data: [102, 104, 103, 99, 101, 105],
    },
  ],
}

export const ChartWrapperExample = () => {
  return (
    <ChartWrapper data={chartData} isLoading={false} minHeight={300}>
      <LineChart data={chartData as never} />
    </ChartWrapper>
  )
}
