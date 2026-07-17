import { TimeframeControls } from '@tetherto/mdk-react-devkit'

export const TimeframeControlsExample = () => (
  <div className="mdk-example-row">
    <TimeframeControls
      onRangeChange={(range) => console.warn('range changed', range)}
      layout="horizontal"
    />
  </div>
)
