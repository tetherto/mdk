/**
 * Runnable example for the ExplorerLayout feature.
 */
import { ExplorerLayout } from "@tetherto/mdk-react-devkit"

export const ExplorerLayoutExample = () => (
  <ExplorerLayout
    title="Explorer"
    hasSelection
    list={<div>List / table goes here</div>}
    detail={<div>Selected-item details go here</div>}
  />
)
