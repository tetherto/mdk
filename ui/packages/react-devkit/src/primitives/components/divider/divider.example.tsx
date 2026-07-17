/**
 * Runnable example for Divider.
 */
import { Divider } from '@tetherto/mdk-react-devkit'

export const DividerExample = () => (
  <div className="mdk-example-col">
    {/* Solid (default) */}
    <Divider />

    {/* Dashed */}
    <Divider dashed />

    {/* Dotted */}
    <Divider dotted />

    {/* With centered label */}
    <Divider>Section</Divider>

    {/* With left-aligned label */}
    <Divider align="left">Pool Statistics</Divider>

    {/* Plain (no border around label) */}
    <Divider plain>or</Divider>
  </div>
)
