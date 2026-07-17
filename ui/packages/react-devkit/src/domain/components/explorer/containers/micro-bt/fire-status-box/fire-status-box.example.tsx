import { FireStatusBox } from '@tetherto/mdk-react-devkit'

export const FireStatusBoxExample = () => (
  <div className="mdk-example-row">
    <FireStatusBox data={{ smokeDetector: 0, waterIngressDetector: 0, coolingFanStatus: 1 }} />
  </div>
)
