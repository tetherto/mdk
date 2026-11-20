/**
 * Runnable example for Alert.
 */
import { CoreAlert } from '@tetherto/mdk-react-devkit'

export const AlertExample = () => (
  <div className="mdk-example-col">
    <CoreAlert
      type="info"
      title="Informational"
      description="Your miner firmware update is ready to install."
      showIcon
    />
    <CoreAlert
      type="success"
      title="Success"
      description="Pool credentials updated successfully."
      showIcon
      closable
    />
    <CoreAlert
      type="warning"
      title="Warning"
      description="Hash rate dropped below threshold — check your connections."
      showIcon
    />
    <CoreAlert
      type="error"
      title="Error"
      description="Failed to connect to the pool. Verify your credentials."
      showIcon
      closable
    />
    {/* Part of the page rather than a response to an action, so it is not a live region —
        without `role` a screen reader would re-announce it on every navigation. */}
    <CoreAlert type="info" title="Maintenance window tonight" banner role="none" />
  </div>
)
