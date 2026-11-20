/**
 * Runnable example for Tooltip / SimpleTooltip.
 */
import { Button, SimpleTooltip } from '@tetherto/mdk-react-devkit'

export const TooltipExample = () => {
  return (
    <div className="mdk-example-inline mdk-example-inline--gap-lg">
      <SimpleTooltip content="Refresh data" side="bottom">
        <Button>Refresh</Button>
      </SimpleTooltip>
      <SimpleTooltip content="Saves to the current workspace" side="right">
        <Button variant="primary">Save</Button>
      </SimpleTooltip>
    </div>
  )
}
