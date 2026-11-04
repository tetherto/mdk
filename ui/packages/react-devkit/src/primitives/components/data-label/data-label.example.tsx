/**
 * Runnable example for DataLabel.
 *
 * Pure: dates render in the browser's timezone. Pass `timezone` to override it, or
 * `useTimezone().timezone` from `@tetherto/mdk-react-adapter` to follow the user's selection.
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
