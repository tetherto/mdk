import { Typography } from '@tetherto/mdk-core-ui'

export const TypographyExample = (): React.ReactElement => {
  return (
    <section className="demo-section">
      <h2 className="demo-section__title">Typography</h2>
      <div className="demo-section__typography">
        {/* Variants */}
        <section>
          <h3 className="demo-section__typography--title">Variants</h3>
          <div className="demo-section__typography--item">
            <Typography variant="heading1">Heading 1</Typography>
            <Typography variant="heading2">Heading 2</Typography>
            <Typography variant="heading3">Heading 3</Typography>
            <Typography variant="body">Body Text</Typography>
            <Typography variant="secondary">Secondary Text</Typography>
            <Typography variant="caption">Caption Text</Typography>
          </div>
        </section>

        {/* Sizes */}
        <section>
          <h3 className="demo-section__typography--title">Sizes</h3>
          <div className="demo-section__typography--item">
            <Typography size="xs">Extra Small (12px)</Typography>
            <Typography size="sm">Small (14px)</Typography>
            <Typography size="md">Medium (16px)</Typography>
            <Typography size="lg">Large (18px)</Typography>
            <Typography size="xl">Extra Large (20px)</Typography>
            <Typography size="2xl">2X Large (24px)</Typography>
            <Typography size="3xl">3X Large (32px)</Typography>
            <Typography size="4xl">4X Large (40px)</Typography>
          </div>
        </section>

        {/* Weights */}
        <section>
          <h3 className="demo-section__typography--title">Font Weights</h3>
          <div className="demo-section__typography--item">
            <Typography weight="light">Light (300)</Typography>
            <Typography weight="normal">Normal (400)</Typography>
            <Typography weight="medium">Medium (500)</Typography>
            <Typography weight="semibold">Semibold (600)</Typography>
            <Typography weight="bold">Bold (700)</Typography>
          </div>
        </section>

        {/* Colors */}
        <section>
          <h3 className="demo-section__typography--title">Colors</h3>
          <div className="demo-section__typography--item">
            <Typography color="default">Default Color</Typography>
            <Typography color="primary">Primary Color (#F7931A)</Typography>
            <Typography color="success">Success Color (#72F59E)</Typography>
            <Typography color="warning">Warning Color (#FFC107)</Typography>
            <Typography color="error">Error Color (#EF4444)</Typography>
            <Typography color="muted">Muted Color</Typography>
          </div>
        </section>

        {/* Alignment */}
        <section>
          <h3 className="demo-section__typography--title">Alignment</h3>
          <div className="demo-section__typography--item">
            <Typography align="left">Left aligned text</Typography>
            <Typography align="center">Center aligned text</Typography>
            <Typography align="right">Right aligned text</Typography>
            <Typography align="justify">
              Justified text. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
              eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </Typography>
          </div>
        </section>

        {/* Truncate */}
        <section>
          <h3 className="demo-section__typography--title">Truncate</h3>
          <div
            style={{
              width: '300px',
            }}
          >
            <Typography truncate>
              This is a very long text that will be truncated with an ellipsis when it exceeds the
              container width
            </Typography>
          </div>
        </section>
      </div>
    </section>
  )
}
