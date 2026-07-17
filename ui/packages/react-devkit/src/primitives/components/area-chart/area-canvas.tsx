import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js'
import 'chartjs-adapter-date-fns'
import type { ComponentProps } from 'react'
import { Line } from 'react-chartjs-2'

// Engine-bound leaf for AreaChart. Isolated in its own module so the chart.js +
// react-chartjs-2 runtime is code-split into a lazy chunk and only loaded when
// an area chart actually renders (see `index.tsx`).
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Title, Tooltip, Legend)

export type AreaCanvasProps = Pick<ComponentProps<typeof Line>, 'data' | 'options' | 'plugins'>

export const AreaCanvas = (props: AreaCanvasProps): React.JSX.Element => <Line {...props} />
AreaCanvas.displayName = 'AreaCanvas'

export default AreaCanvas
