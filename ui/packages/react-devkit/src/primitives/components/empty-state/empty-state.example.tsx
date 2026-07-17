/**
 * Runnable example for EmptyState.
 */
import { EmptyState } from '@tetherto/mdk-react-devkit'

export const EmptyStateExample = () => (
  <div className="mdk-example-grid-3">
    <EmptyState description="No miners found" size="sm" />
    <EmptyState description="No alerts in the selected range" image="simple" />
    <EmptyState description="No data — try a different filter." size="lg" />
  </div>
)
