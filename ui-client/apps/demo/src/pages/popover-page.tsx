import { Button, Popover, PopoverContent, PopoverTrigger, SimplePopover, Switch } from '@mdk/core'

export const PopoverPage = (): JSX.Element => {
  return (
    <section className="demo-section">
      <h2 className="demo-section__title">Popover</h2>
      <div className="demo-section__popover">
        <section>
          <h3>Simple Popover (Convenient Wrapper)</h3>
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <SimplePopover
              trigger={<Button variant="primary">Open Popover</Button>}
              content={
                <div style={{ padding: '8px' }}>
                  <h4 style={{ margin: '0 0 8px 0' }}>Popover Title</h4>
                  <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>
                    This is a simple popover with basic content.
                  </p>
                </div>
              }
            />

            <SimplePopover
              trigger={<Button variant="secondary">With Close Button</Button>}
              content={
                <div style={{ padding: '8px' }}>
                  <h4 style={{ margin: '0 0 8px 0' }}>Closeable Popover</h4>
                  <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>
                    Click the X button in the top-right to close.
                  </p>
                </div>
              }
              showClose
            />

            <SimplePopover
              trigger={<Button variant="secondary">With Arrow</Button>}
              content={
                <div style={{ padding: '8px' }}>
                  <h4 style={{ margin: '0 0 8px 0' }}>Arrow Popover</h4>
                  <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>
                    This popover includes a small arrow pointing to the trigger.
                  </p>
                </div>
              }
              showArrow
              side="top"
            />
          </div>
        </section>

        <section style={{ marginTop: '2rem' }}>
          <h3>Compound Components (Full Control)</h3>
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="primary">Custom Popover</Button>
              </PopoverTrigger>
              <PopoverContent side="bottom" align="start">
                <div style={{ width: '300px' }}>
                  <h4 style={{ margin: '0 0 12px 0', color: '#f7931a' }}>Mining Controls</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Auto-tune</span>
                      <Switch defaultChecked />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Low power mode</span>
                      <Switch />
                    </div>
                    <div style={{ marginTop: '8px' }}>
                      <Button variant="primary" style={{ width: '100%' }}>
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
                <div style={{ padding: '8px' }}>
                  <h4 style={{ margin: '0 0 8px 0' }}>Positioned Right</h4>
                  <p style={{ margin: 0, fontSize: '13px', opacity: 0.9 }}>
                    This popover appears on the right side of the trigger.
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </section>

        <section style={{ marginTop: '2rem' }}>
          <h3>Rich Content Example</h3>
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="primary">Miner Details</Button>
              </PopoverTrigger>
              <PopoverContent showClose>
                <div style={{ width: '350px' }}>
                  <h3 style={{ margin: '0 0 16px 0', color: '#f7931a', fontSize: '16px' }}>
                    Antminer S19 Pro
                  </h3>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '120px 1fr',
                      gap: '8px',
                      fontSize: '13px',
                    }}
                  >
                    <div style={{ opacity: 0.7 }}>Hashrate:</div>
                    <div style={{ fontWeight: 500 }}>110 TH/s</div>
                    <div style={{ opacity: 0.7 }}>Temperature:</div>
                    <div style={{ fontWeight: 500, color: '#72f59e' }}>65°C</div>
                    <div style={{ opacity: 0.7 }}>Power:</div>
                    <div style={{ fontWeight: 500 }}>3250W</div>
                    <div style={{ opacity: 0.7 }}>Efficiency:</div>
                    <div style={{ fontWeight: 500 }}>29.5 W/TH</div>
                    <div style={{ opacity: 0.7 }}>Uptime:</div>
                    <div style={{ fontWeight: 500 }}>45d 12h 30m</div>
                    <div style={{ opacity: 0.7 }}>Status:</div>
                    <div style={{ fontWeight: 500, color: '#72f59e' }}>Online</div>
                  </div>
                  <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                    <Button variant="primary" style={{ flex: 1 }}>
                      Restart
                    </Button>
                    <Button variant="secondary" style={{ flex: 1 }}>
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
}
