/**
 * Runnable example for Progress (Radix Progress primitives re-exported as namespace).
 * Progress.Root and Progress.Indicator are unstyled — consumers supply their own classes.
 */
import { Progress } from '@tetherto/mdk-react-devkit'

export const ProgressExample = () => (
  <div className="mdk-example-col">
    <Progress.Root className="mdk-progress" value={65} max={100}>
      {/* transform is the Radix-standard way to drive the fill width */}
      <Progress.Indicator style={{ transform: 'translateX(-35%)' }} />
    </Progress.Root>

    <Progress.Root className="mdk-progress mdk-progress--thin" value={30} max={100}>
      <Progress.Indicator style={{ transform: 'translateX(-70%)' }} />
    </Progress.Root>

    <Progress.Root className="mdk-progress" value={100} max={100}>
      <Progress.Indicator style={{ transform: 'translateX(0%)' }} />
    </Progress.Root>
  </div>
)
