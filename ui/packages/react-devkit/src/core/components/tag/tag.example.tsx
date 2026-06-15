/**
 * Runnable example for Tag.
 */
import { Tag } from '@tetherto/mdk-react-devkit'

export const TagExample = () => (
  <div className="mdk-example-col">
    <div className="mdk-example-row">
      <Tag color="dark">Default</Tag>
      <Tag color="green">Active</Tag>
      <Tag color="red">Error</Tag>
      <Tag color="amber">Warning</Tag>
      <Tag color="blue">Info</Tag>
    </div>

    <div className="mdk-example-row">
      <Tag color="green">Online</Tag>
      <Tag color="red">Offline</Tag>
      <Tag color="amber">Maintenance</Tag>
      <Tag color="dark">v2.1.4</Tag>
    </div>
  </div>
)
