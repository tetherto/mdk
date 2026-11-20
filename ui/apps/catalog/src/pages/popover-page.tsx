import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  SimplePopover,
  Switch,
  UNITS,
} from '@tetherto/mdk-react-devkit/primitives'

import type { JSX } from 'react'

export const PopoverPage = (): JSX.Element => (
  <section className="demo-section">
    <h2 className="demo-section__title">Popover</h2>
    <div className="demo-section__popover">
      <section>
        <h3>Simple Popover (Convenient Wrapper)</h3>
        <div className="demo-section__showcase">
          <SimplePopover
            trigger={<Button variant="primary">Open Popover</Button>}
            content={
              <div className="popover-demo__body">
                <h4 className="popover-demo__title">Popover Title</h4>
                <p className="popover-demo__text">This is a simple popover with basic content.</p>
              </div>
            }
          />

          <SimplePopover
            trigger={<Button variant="secondary">With Close Button</Button>}
            content={
              <div className="popover-demo__body">
                <h4 className="popover-demo__title">Closeable Popover</h4>
                <p className="popover-demo__text">Click the X button in the top-right to close.</p>
              </div>
            }
            showClose
          />

          <SimplePopover
            trigger={<Button variant="secondary">With Arrow</Button>}
            content={
              <div className="popover-demo__body">
                <h4 className="popover-demo__title">Arrow Popover</h4>
                <p className="popover-demo__text">
                  This popover includes a small arrow pointing to the trigger.
                </p>
              </div>
            }
            showArrow
            side="top"
          />
        </div>
      </section>

      <section className="demo-section__mt-2xl">
        <h3>Compound Components (Full Control)</h3>
        <div className="demo-section__showcase">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="primary">Custom Popover</Button>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="start">
              <div className="popover-demo__panel">
                <h4 className="popover-demo__title popover-demo__title--accent">Mining Controls</h4>
                <div className="popover-demo__controls">
                  <div className="popover-demo__control-row">
                    <span>Auto-tune</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="popover-demo__control-row">
                    <span>Low power mode</span>
                    <Switch />
                  </div>
                  <div className="demo-section__mt-sm">
                    <Button variant="primary" className="popover-demo__full-width">
                      Apply Settings
                    </Button>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="secondary">Position Options</Button>
            </PopoverTrigger>
            <PopoverContent side="right" align="center">
              <div className="popover-demo__body">
                <h4 className="popover-demo__title">Positioned Right</h4>
                <p className="popover-demo__text popover-demo__text--sm">
                  This popover appears on the right side of the trigger.
                </p>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </section>

      <section className="demo-section__mt-2xl">
        <h3>Rich Content Example</h3>
        <div className="demo-section__showcase">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="primary">Miner Details</Button>
            </PopoverTrigger>
            <PopoverContent showClose>
              <div className="popover-demo__panel popover-demo__panel--wide">
                <h3 className="popover-demo__heading">Antminer S19 Pro</h3>
                <div className="popover-demo__specs">
                  <div className="popover-demo__spec-label">Hashrate:</div>
                  <div className="popover-demo__spec-value">110 {UNITS.HASHRATE_TH_S}</div>
                  <div className="popover-demo__spec-label">Temperature:</div>
                  <div className="popover-demo__spec-value demo-section__text-success">
                    65{UNITS.TEMPERATURE_C}
                  </div>
                  <div className="popover-demo__spec-label">Power:</div>
                  <div className="popover-demo__spec-value">3250{UNITS.POWER_W}</div>
                  <div className="popover-demo__spec-label">Efficiency:</div>
                  <div className="popover-demo__spec-value">29.5 {UNITS.EFFICIENCY_W_PER_TH}</div>
                  <div className="popover-demo__spec-label">Uptime:</div>
                  <div className="popover-demo__spec-value">45d 12h 30m</div>
                  <div className="popover-demo__spec-label">Status:</div>
                  <div className="popover-demo__spec-value demo-section__text-success">Online</div>
                </div>
                <div className="popover-demo__actions">
                  <Button variant="primary" className="popover-demo__grow">
                    Restart
                  </Button>
                  <Button variant="secondary" className="popover-demo__grow">
                    Configure
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </section>
    </div>
  </section>
)
