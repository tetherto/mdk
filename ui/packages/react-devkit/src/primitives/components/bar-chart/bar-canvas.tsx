import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js'
import 'chartjs-adapter-date-fns'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import type { ComponentProps } from 'react'
import { Bar } from 'react-chartjs-2'
import { legendMarginPlugin } from '../../utils/chart-options'

// Engine-bound leaf for BarChart. Isolated in its own module so the chart.js +
// react-chartjs-2 runtime (and the datalabels plugin) is code-split into a lazy
// chunk and only loaded when a bar chart actually renders (see `index.tsx`).
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend)

export type BarCanvasProps = Pick<ComponentProps<typeof Bar>, 'data' | 'options'> & {
  showDataLabels?: boolean
}

export const BarCanvas = ({ showDataLabels, ...rest }: BarCanvasProps): React.JSX.Element => {
  const plugins = showDataLabels ? [legendMarginPlugin, ChartDataLabels] : [legendMarginPlugin]
  return <Bar {...rest} plugins={plugins} />
}
BarCanvas.displayName = 'BarCanvas'

export default BarCanvas
