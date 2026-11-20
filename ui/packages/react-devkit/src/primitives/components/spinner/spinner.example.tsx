/**
 * Runnable example for Spinner.
 */
import { Spinner } from '@tetherto/mdk-react-devkit'

export const SpinnerExample = () => {
  return (
    <div className="mdk-example-inline mdk-example-inline--gap-2xl">
      <Spinner size="sm" />
      <Spinner size="md" type="circle" />
      <Spinner size="lg" label="Loading miners…" />
    </div>
  )
}
