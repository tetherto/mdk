/**
 * Runnable example for Badge.
 */
import { Badge, Button } from '@tetherto/mdk-react-devkit'

export const BadgeExample = () => (
  <div className="mdk-example-row">
    <Badge count={5}>
      <Button>Messages</Button>
    </Badge>
    <Badge count={120} overflowCount={99}>
      <Button>Notifications</Button>
    </Badge>
    <Badge dot>
      <Button>Updates</Button>
    </Badge>
    <Badge status="success" text="Online" />
    <Badge status="error" text="Offline" />
    <Badge text="NEW" color="primary" square />
  </div>
)
