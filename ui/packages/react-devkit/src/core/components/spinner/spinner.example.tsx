/**
 * Runnable example for Spinner.
 */
import { Spinner } from '@tetherto/mdk-react-devkit'

export const SpinnerExample = () => {
  return (
    <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
      <Spinner size="sm" />
      <Spinner size="md" type="circle" />
      <Spinner size="lg" label="Loading miners…" />
    </div>
  )
}
