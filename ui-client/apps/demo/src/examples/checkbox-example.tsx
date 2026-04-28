import { Checkbox, Label, Switch } from '@tetherto/mdk-core-ui'

export const CheckboxExample = (): React.ReactElement => {
  return (
    <section className="demo-section">
      <h2 className="demo-section__title">Checkbox & Switch</h2>
      <div className="demo-section__form-controls">
        <h2>Checkbox</h2>
        <div
          className="demo-section__form-item demo-section__form-item--baseline"
          style={{ gap: '5rem' }}
        >
          {/* Color Variants */}
          <section>
            <h3>Color Variants</h3>
            <div className="demo-section__checkboxes">
              <div className="demo-section__checkboxes__item">
                <Checkbox id="checkbox-default" color="default" defaultChecked />
                <Label htmlFor="default">Default</Label>
              </div>

              <div className="demo-section__checkboxes__item">
                <Checkbox id="checkbox-primary" color="primary" defaultChecked />
                <Label htmlFor="checkbox-primary">Primary</Label>
              </div>

              <div className="demo-section__checkboxes__item">
                <Checkbox id="checkbox-success" color="success" defaultChecked />
                <Label htmlFor="checkbox-success">Success</Label>
              </div>

              <div className="demo-section__checkboxes__item">
                <Checkbox id="checkbox-warning" color="warning" defaultChecked />
                <Label htmlFor="checkbox-warning">Warning</Label>
              </div>

              <div className="demo-section__checkboxes__item">
                <Checkbox id="checkbox-error" color="error" defaultChecked />
                <Label htmlFor="checkbox-error">Error</Label>
              </div>
            </div>
          </section>

          {/* Size Variants */}
          <section>
            <h3>Size Variants</h3>
            <div className="demo-section__checkboxes">
              <div className="demo-section__checkboxes__item">
                <Checkbox id="checkbox-small" size="xs" color="primary" defaultChecked />
                <Label htmlFor="checkbox-small">Extra Small</Label>
              </div>

              <div className="demo-section__checkboxes__item">
                <Checkbox id="checkbox-small" size="sm" color="primary" defaultChecked />
                <Label htmlFor="checkbox-small">Small</Label>
              </div>

              <div className="demo-section__checkboxes__item">
                <Checkbox id="checkbox-medium" size="md" color="primary" defaultChecked />
                <Label htmlFor="checkbox-medium">Medium</Label>
              </div>

              <div className="demo-section__checkboxes__item">
                <Checkbox id="checkbox-large" size="lg" color="primary" defaultChecked />
                <Label htmlFor="checkbox-large">Large</Label>
              </div>
            </div>
          </section>

          {/* Radius Variants */}
          <section>
            <h3>Radius Variants</h3>
            <div className="demo-section__checkboxes">
              <div className="demo-section__checkboxes__item">
                <Checkbox id="checkbox-radius-none" radius="none" color="success" defaultChecked />
                <Label htmlFor="checkbox-radius-none">None</Label>
              </div>

              <div className="demo-section__checkboxes__item">
                <Checkbox
                  id="checkbox-radius-small"
                  radius="small"
                  color="success"
                  defaultChecked
                />
                <Label htmlFor="checkbox-radius-small">Small</Label>
              </div>

              <div className="demo-section__checkboxes__item">
                <Checkbox
                  id="checkbox-radius-medium"
                  radius="medium"
                  color="success"
                  defaultChecked
                />
                <Label htmlFor="checkbox-radius-medium">Medium</Label>
              </div>

              <div className="demo-section__checkboxes__item">
                <Checkbox
                  id="checkbox-radius-large"
                  radius="large"
                  color="success"
                  defaultChecked
                />
                <Label htmlFor="checkbox-radius-large">Large</Label>
              </div>

              <div className="demo-section__checkboxes__item">
                <Checkbox id="checkbox-radius-full" radius="full" color="success" defaultChecked />
                <Label htmlFor="checkbox-radius-full">Full</Label>
              </div>
            </div>
          </section>

          {/* States */}
          <section>
            <h3>States</h3>
            <div className="demo-section__checkboxes">
              <div className="demo-section__checkboxes__item">
                <Checkbox id="checkbox-unchecked" color="primary" />
                <Label htmlFor="checkbox-unchecked">Unchecked</Label>
              </div>

              <div className="demo-section__checkboxes__item">
                <Checkbox id="checkbox-checked" color="primary" defaultChecked />
                <Label htmlFor="checkbox-checked">Checked</Label>
              </div>

              <div className="demo-section__checkboxes__item">
                <Checkbox id="checkbox-indeterminate" color="primary" checked="indeterminate" />
                <Label htmlFor="checkbox-indeterminate">Indeterminate</Label>
              </div>

              <div className="demo-section__checkboxes__item">
                <Checkbox id="checkbox-disabled-unchecked" color="primary" disabled />
                <Label htmlFor="checkbox-disabled-unchecked">Disabled</Label>
              </div>

              <div className="demo-section__checkboxes__item">
                <Checkbox id="checkbox-disabled-checked" color="primary" disabled defaultChecked />
                <Label htmlFor="checkbox-disabled-checked">Disabled</Label>
              </div>
            </div>
          </section>

          {/* Combinations */}
          <section>
            <h3>Combination Examples</h3>
            <div className="demo-section__checkboxes">
              <div className="demo-section__checkboxes__item">
                <Checkbox
                  id="checkbox-combo-1"
                  size="sm"
                  color="primary"
                  radius="none"
                  defaultChecked
                />
                <Label htmlFor="checkbox-combo-1">Small + Primary + No Radius</Label>
              </div>

              <div className="demo-section__checkboxes__item">
                <Checkbox
                  id="checkbox-combo-2"
                  size="md"
                  color="success"
                  radius="medium"
                  defaultChecked
                />
                <Label htmlFor="checkbox-combo-2">Medium + Success + Medium Radius</Label>
              </div>

              <div className="demo-section__checkboxes__item">
                <Checkbox
                  id="checkbox-combo-3"
                  size="lg"
                  color="error"
                  radius="full"
                  defaultChecked
                />
                <Label htmlFor="checkbox-combo-3">Large + Error + Full Radius</Label>
              </div>

              <div className="demo-section__checkboxes__item">
                <Checkbox
                  id="checkbox-combo-4"
                  size="lg"
                  color="warning"
                  radius="large"
                  defaultChecked
                />
                <Label htmlFor="checkbox-combo-4">Large + Warning + Large Radius</Label>
              </div>
            </div>
          </section>
        </div>
      </div>
      <div className="demo-section__form-controls">
        <h2>Switch</h2>
        <div className="demo-section__form-item demo-section__form-item--baseline">
          <section>
            <h3>Color Variants</h3>
            <div className="demo-section__switches">
              <div className="demo-section__switches__item">
                <Switch id="switch-default" color="default" defaultChecked />
                <Label htmlFor="switch-default">Default</Label>
              </div>

              <div className="demo-section__switches__item">
                <Switch id="switch-primary" color="primary" defaultChecked />
                <Label htmlFor="switch-primary">Primary</Label>
              </div>

              <div className="demo-section__switches__item">
                <Switch id="switch-success" color="success" defaultChecked />
                <Label htmlFor="switch-success">Success</Label>
              </div>

              <div className="demo-section__switches__item">
                <Switch id="switch-warning" color="warning" defaultChecked />
                <Label htmlFor="switch-warning">Warning</Label>
              </div>

              <div className="demo-section__switches__item">
                <Switch id="switch-error" color="error" defaultChecked />
                <Label htmlFor="switch-error">Error</Label>
              </div>
            </div>
          </section>

          {/* Size Variants */}
          <section>
            <h3>Size Variants</h3>
            <div className="demo-section__switches">
              <div className="demo-section__switches__item">
                <Switch id="switch-small" size="sm" color="primary" defaultChecked />
                <Label htmlFor="switch-small">Small</Label>
              </div>

              <div className="demo-section__switches__item">
                <Switch id="switch-medium" size="md" color="primary" defaultChecked />
                <Label htmlFor="switch-medium">Medium</Label>
              </div>

              <div className="demo-section__switches__item">
                <Switch id="switch-large" size="lg" color="primary" defaultChecked />
                <Label htmlFor="switch-large">Large</Label>
              </div>
            </div>
          </section>

          {/* Radius Variants */}
          <section>
            <h3>Radius Variants</h3>
            <div className="demo-section__switches">
              <div className="demo-section__switches__item">
                <Switch id="switch-radius-none" radius="none" color="success" defaultChecked />
                <Label htmlFor="switch-radius-none">None</Label>
              </div>

              <div className="demo-section__switches__item">
                <Switch id="switch-radius-small" radius="small" color="success" defaultChecked />
                <Label htmlFor="switch-radius-small">Small</Label>
              </div>

              <div className="demo-section__switches__item">
                <Switch id="switch-radius-medium" radius="medium" color="success" defaultChecked />
                <Label htmlFor="switch-radius-medium">Medium</Label>
              </div>

              <div className="demo-section__switches__item">
                <Switch id="switch-radius-large" radius="large" color="success" defaultChecked />
                <Label htmlFor="switch-radius-large">Large</Label>
              </div>

              <div className="demo-section__switches__item">
                <Switch id="switch-radius-full" radius="full" color="success" defaultChecked />
                <Label htmlFor="switch-radius-full">Full</Label>
              </div>
            </div>
          </section>

          {/* States */}
          <section>
            <h3>States</h3>
            <div className="demo-section__switches">
              <div className="demo-section__switches__item">
                <Switch id="switch-unchecked" color="primary" />
                <Label htmlFor="switch-unchecked">Unchecked</Label>
              </div>

              <div className="demo-section__switches__item">
                <Switch id="switch-checked" color="primary" defaultChecked />
                <Label htmlFor="switch-checked">Checked</Label>
              </div>

              <div className="demo-section__switches__item">
                <Switch id="switch-disabled-unchecked" color="primary" disabled />
                <Label htmlFor="switch-disabled-unchecked">Disabled</Label>
              </div>

              <div className="demo-section__switches__item">
                <Switch id="switch-disabled-checked" color="primary" disabled defaultChecked />
                <Label htmlFor="switch-disabled-checked">Disabled</Label>
              </div>
            </div>
          </section>

          {/* Combinations */}
          <section>
            <h3>Combination Examples</h3>
            <div className="demo-section__switches">
              <div className="demo-section__switches__item">
                <Switch
                  id="switch-combo-1"
                  size="sm"
                  color="primary"
                  radius="small"
                  defaultChecked
                />
                <Label htmlFor="switch-combo-1">Small + Primary + Small Radius</Label>
              </div>

              <div className="demo-section__switches__item">
                <Switch
                  id="switch-combo-2"
                  size="md"
                  color="success"
                  radius="medium"
                  defaultChecked
                />
                <Label htmlFor="switch-combo-2">Medium + Success + Medium Radius</Label>
              </div>

              <div className="demo-section__switches__item">
                <Switch id="switch-combo-3" size="lg" color="error" radius="none" defaultChecked />
                <Label htmlFor="switch-combo-3">Large + Error + No Radius</Label>
              </div>

              <div className="demo-section__switches__item">
                <Switch
                  id="switch-combo-4"
                  size="lg"
                  color="warning"
                  radius="full"
                  defaultChecked
                />
                <Label htmlFor="switch-combo-4">Large + Warning + Full Radius</Label>
              </div>
            </div>
          </section>
        </div>
      </div>
    </section>
  )
}
