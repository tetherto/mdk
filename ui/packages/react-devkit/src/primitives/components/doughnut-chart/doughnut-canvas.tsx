import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js'
import { forwardRef } from 'react'
import type { ComponentProps, ComponentRef } from 'react'
import { Doughnut } from 'react-chartjs-2'

// Engine-bound leaf for DoughnutChart. Isolated in its own module so the
// chart.js + react-chartjs-2 runtime is code-split into a lazy chunk and only
// loaded when a doughnut chart actually renders (see `index.tsx`).
ChartJS.register(ArcElement, Tooltip, Legend)

export type DoughnutCanvasProps = Pick<ComponentProps<typeof Doughnut>, 'data' | 'options'>

export const DoughnutCanvas = forwardRef<ComponentRef<typeof Doughnut>, DoughnutCanvasProps>(
  (props, ref) => <Doughnut ref={ref} {...props} />,
)
DoughnutCanvas.displayName = 'DoughnutCanvas'

export default DoughnutCanvas
