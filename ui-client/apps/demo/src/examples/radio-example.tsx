import { Label, Radio, RadioCard, RadioGroup } from '@tetherto/mdk-core-ui'

export const RadioExample = (): React.ReactElement => {
  return (
    <section className="demo-section">
      <h2 className="demo-section__title">Radio</h2>

      {/* RadioCard - Time Selector */}
      <h3>RadioCard - Time Selector</h3>
      <section className="demo-section__radio-card">
        <RadioGroup defaultValue="5min" orientation="horizontal" noGap>
          <RadioCard value="5min" label="5 Min" />
          <RadioCard value="30min" label="30 Min" />
          <RadioCard value="3h" label="3 H" />
          <RadioCard value="1d" label="1 D" />
        </RadioGroup>
      </section>

      {/* RadioCard Sizes */}
      <h3>RadioCard Sizes</h3>
      <section className="demo-section__radio-card">
        <div className="demo-section__radio-card--column">
          <RadioGroup defaultValue="sm" orientation="horizontal">
            <RadioCard value="sm" label="Small" size="sm" />
            <RadioCard value="sm2" label="Small" size="sm" />
          </RadioGroup>
          <RadioGroup defaultValue="md" orientation="horizontal">
            <RadioCard value="md" label="Medium" size="md" />
            <RadioCard value="md2" label="Medium" size="md" />
          </RadioGroup>
          <RadioGroup defaultValue="lg" orientation="horizontal">
            <RadioCard value="lg" label="Large" size="lg" />
            <RadioCard value="lg2" label="Large" size="lg" />
          </RadioGroup>
        </div>
      </section>

      {/* RadioCard Colors */}
      <h3>RadioCard Colors</h3>
      <section className="demo-section__radio-card">
        <RadioGroup defaultValue="primary" orientation="horizontal">
          <RadioCard value="primary" label="Primary" color="primary" />
          <RadioCard value="success" label="Success" color="success" />
          <RadioCard value="warning" label="Warning" color="warning" />
          <RadioCard value="error" label="Error" color="error" />
        </RadioGroup>
      </section>

      {/* RadioCard Radius */}
      <h3>RadioCard Radius</h3>
      <section className="demo-section__radio-card">
        <RadioGroup defaultValue="small" orientation="horizontal">
          <RadioCard value="none" label="None" radius="none" />
          <RadioCard value="small" label="Small" radius="small" />
          <RadioCard value="medium" label="Medium" radius="medium" />
          <RadioCard value="full" label="Full" radius="full" />
        </RadioGroup>
      </section>

      <section className="demo-section__radio">
        {/* Color Variants */}
        <section>
          <h3>Color Variants</h3>
          <RadioGroup defaultValue="primary">
            <div className="demo-section__radio--item">
              <Radio value="default" color="default" id="radio-default" />
              <Label htmlFor="radio-default">Default</Label>
            </div>
            <div className="demo-section__radio--item">
              <Radio value="primary" color="primary" id="radio-primary" />
              <Label htmlFor="radio-primary">Primary</Label>
            </div>
            <div className="demo-section__radio--item">
              <Radio value="success" color="success" id="radio-success" />
              <Label htmlFor="radio-success">Success</Label>
            </div>
            <div className="demo-section__radio--item">
              <Radio value="warning" color="warning" id="radio-warning" />
              <Label htmlFor="radio-warning">Warning</Label>
            </div>
            <div className="demo-section__radio--item">
              <Radio value="error" color="error" id="radio-error" />
              <Label htmlFor="radio-error">Error</Label>
            </div>
          </RadioGroup>
        </section>

        {/* Sizes */}
        <section>
          <h3>Sizes</h3>
          <RadioGroup defaultValue="md" orientation="horizontal">
            <Radio value="sm" size="sm" />
            <Radio value="md" size="md" />
            <Radio value="lg" size="lg" />
          </RadioGroup>
        </section>

        {/* Radius */}
        <section>
          <h3>Radius Variants</h3>
          <RadioGroup defaultValue="full" orientation="horizontal">
            <Radio value="none" radius="none" />
            <Radio value="small" radius="small" />
            <Radio value="medium" radius="medium" />
            <Radio value="large" radius="large" />
            <Radio value="full" radius="full" />
          </RadioGroup>
        </section>
        {/*  States */}
        <section>
          <h3>States</h3>
          <RadioGroup defaultValue="checked">
            <div className="demo-section__radio--item">
              <Radio value="unchecked" id="radio-state-unchecked" />
              <Label htmlFor="radio-state-unchecked">Unchecked</Label>
            </div>
            <div className="demo-section__radio--item">
              <Radio value="checked" id="radio-state-checked" />
              <Label htmlFor="radio-state-checked">Checked</Label>
            </div>
            <div className="demo-section__radio--item">
              <Radio value="disabled-unchecked" disabled id="radio-state-disabled-unchecked" />
              <Label htmlFor="radio-state-disabled-unchecked">Disabled (Unchecked)</Label>
            </div>
            <div className="demo-section__radio--item">
              <Radio value="checked" disabled id="radio-state-disabled-checked" />
              <Label htmlFor="radio-state-disabled-checked">Disabled (Checked)</Label>
            </div>
          </RadioGroup>
        </section>
      </section>
    </section>
  )
}
