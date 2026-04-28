import { ArrowIcon, Indicator } from '@tetherto/mdk-core-ui'

export const IndicatorsExample = (): React.ReactElement => {
  return (
    <section className="demo-section">
      <h2 className="demo-section__title">Indicators</h2>
      <section className="demo-section__indicators">
        {/* With Icons/Arrows */}
        <section>
          <h3>With Icons & Arrows</h3>
          <div className="demo-section__indicators--content">
            <Indicator color="green" onClick={() => {}}>
              <span>Active</span>
              <ArrowIcon />
            </Indicator>
            <Indicator color="red" size="md" onClick={() => {}}>
              <span>Functioning</span>
              <ArrowIcon isOpen={true} />
            </Indicator>
            <Indicator color="blue" size="md" onClick={() => {}}>
              <span>Functioning</span>
              <ArrowIcon isOpen={true} />
            </Indicator>
            <Indicator color="amber" size="md" onClick={() => {}}>
              <span>Functioning</span>
              <ArrowIcon isOpen={true} />
            </Indicator>
          </div>
        </section>
        {/* Size Variants */}
        <section>
          <h3>Size Variants</h3>
          <div className="demo-section__indicators--content">
            <Indicator color="green" size="sm">
              Small
            </Indicator>
            <Indicator color="green" size="md">
              Medium
            </Indicator>
            <Indicator color="green" size="lg">
              Large
            </Indicator>
          </div>
        </section>

        {/* All Colors  */}
        <section>
          <h3>All Colors</h3>
          <div className="demo-section__indicators--content">
            <Indicator color="red">Red</Indicator>
            <Indicator color="gray">Gray</Indicator>
            <Indicator color="blue">Blue</Indicator>
            <Indicator color="yellow">Yellow</Indicator>
            <Indicator color="green">Green</Indicator>
            <Indicator color="purple">Purple</Indicator>
            <Indicator color="amber">Amber</Indicator>
            <Indicator color="slate">Slate</Indicator>
          </div>
        </section>

        {/* Status Indicators */}
        <section>
          <h3>Status Indicators</h3>
          <div className="demo-section__indicators--content">
            <Indicator color="red">Offline</Indicator>
            <Indicator color="red">Error</Indicator>
            <Indicator color="gray">Sleep</Indicator>
            <Indicator color="amber">Low</Indicator>
            <Indicator color="green">Normal</Indicator>
            <Indicator color="purple">High</Indicator>
            <Indicator color="slate">Empty</Indicator>
          </div>
        </section>

        {/* System Status */}
        <section>
          <h3>System Status</h3>
          <div className="demo-section__indicators--content">
            <Indicator color="green" vertical>
              <span>Running</span>
              <span>10</span>
            </Indicator>
            <Indicator color="blue" vertical>
              <span>Sleep</span>
              <span>0</span>
            </Indicator>
            <Indicator color="amber" vertical>
              <span>Empty</span>
              <span>4</span>
            </Indicator>
            <Indicator color="red" vertical>
              <span>Error</span>
              <span>2</span>
            </Indicator>
            <Indicator color="gray" vertical>
              <span>Offline</span>
              <span>1</span>
            </Indicator>
          </div>
        </section>

        {/* Status Dashboard Example */}
        <section>
          <h3>Status Dashboard</h3>
          <div className="demo-section__indicators--content">
            <div>
              <code>Offline</code>
              <Indicator color="gray">0</Indicator>
            </div>
            <div>
              <code>Error</code>
              <Indicator color="red">0</Indicator>
            </div>
            <div>
              <code>Sleep</code>
              <Indicator color="blue">0</Indicator>
            </div>
            <div>
              <code>Low</code>
              <Indicator color="yellow">0</Indicator>
            </div>
            <div>
              <code>Normal</code>
              <Indicator color="green">39</Indicator>
            </div>
            <div>
              <code>High</code>
              <Indicator color="purple">0</Indicator>
            </div>
            <div>
              <code>Empty</code>
              <Indicator color="slate">69</Indicator>
            </div>
          </div>
        </section>
      </section>
    </section>
  )
}
