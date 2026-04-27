import {
  Button,
  SimpleTooltip,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@mdk/core'

export const TooltipPage = (): JSX.Element => {
  return (
    <section className="demo-section">
      <h2 className="demo-section__title">Tooltip</h2>
      <div className="demo-section__tooltip">
        <section>
          <h3>Simple Tooltip (Convenient Wrapper)</h3>
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <SimpleTooltip content="This is a helpful tooltip">
              <Button variant="primary">Hover me (top)</Button>
            </SimpleTooltip>

            <SimpleTooltip content="Tooltip on the right side" side="right">
              <Button variant="secondary">Hover me (right)</Button>
            </SimpleTooltip>

            <SimpleTooltip content="Tooltip at the bottom" side="bottom">
              <Button variant="tertiary">Hover me (bottom)</Button>
            </SimpleTooltip>

            <SimpleTooltip content="Tooltip on the left side" side="left">
              <Button variant="danger">Hover me (left)</Button>
            </SimpleTooltip>
          </div>
        </section>

        <section style={{ marginTop: '2rem' }}>
          <h3>Compound Components (Full Control)</h3>
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="primary">Fast tooltip (100ms)</Button>
                </TooltipTrigger>
                <TooltipContent>
                  <div style={{ maxWidth: '200px' }}>
                    This tooltip appears quickly with a 100ms delay
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider delayDuration={500}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="secondary">Slow tooltip (500ms)</Button>
                </TooltipTrigger>
                <TooltipContent side="right" showArrow={false}>
                  <div style={{ maxWidth: '250px' }}>
                    <strong>No Arrow</strong>
                    <br />
                    This tooltip has a longer delay and no arrow
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </section>

        <section style={{ marginTop: '2rem' }}>
          <h3>Rich Content Tooltips</h3>
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <SimpleTooltip
              content={
                <div style={{ maxWidth: '300px' }}>
                  <strong style={{ color: '#f7931a' }}>Mining Status</strong>
                  <div style={{ marginTop: '8px', fontSize: '11px' }}>
                    <div>Hashrate: 100 TH/s</div>
                    <div>Temperature: 65°C</div>
                    <div>Power: 3250W</div>
                  </div>
                </div>
              }
            >
              <Button variant="primary">Miner Info</Button>
            </SimpleTooltip>

            <SimpleTooltip
              content={
                <div>
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>Long Text Example</div>
                  <div style={{ fontSize: '11px' }}>
                    This tooltip demonstrates word wrapping for longer content. The text will
                    automatically wrap within the maximum width constraint.
                  </div>
                </div>
              }
              side="bottom"
            >
              <Button variant="secondary">Long Content</Button>
            </SimpleTooltip>
          </div>
        </section>
      </div>
    </section>
  )
}
