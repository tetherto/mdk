/**
 * Runnable example for Indicator.
 */
import { Indicator } from '@tetherto/mdk-react-devkit'

export const IndicatorExample = () => (
  <div className="mdk-example-col">
    <div className="mdk-example-row">
      <Indicator color="green">Online</Indicator>
      <Indicator color="red">Offline</Indicator>
      <Indicator color="amber">Maintenance</Indicator>
      <Indicator color="gray">Unknown</Indicator>
    </div>

    <div className="mdk-example-row">
      <Indicator color="green" size="sm">
        Running
      </Indicator>
      <Indicator color="blue" size="md">
        Syncing
      </Indicator>
      <Indicator color="purple" size="lg">
        Overclocked
      </Indicator>
    </div>

    <div className="mdk-example-row">
      <Indicator color="green" vertical>
        <span>Running</span>
        <span>142</span>
      </Indicator>
      <Indicator color="red" vertical>
        <span>Offline</span>
        <span>23</span>
      </Indicator>
    </div>
  </div>
)
