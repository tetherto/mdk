/**
 * Runnable example for DataLabel.
 *
 * Wrap the app in `<MdkProvider>` so `useTimezone` can read the timezone store.
 */
import { DataLabel } from '@tetherto/mdk-react-devkit'

const start = new Date(2025, 0, 6)
const end = new Date(2025, 2, 15)

export const DataLabelExample = () => (
  <div className="mdk-example-col">
    <DataLabel startDate={start} endDate={end} />
    <DataLabel startDate={null} endDate={null} />
  </div>
)
