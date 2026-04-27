import { Badge, Button } from '@mdk/core'

export const BadgeExample = (): JSX.Element => {
  return (
    <section className="demo-section">
      <h2 className="demo-section__title">Badges</h2>
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        {/* Basic number badge */}
        <Badge count={5}>
          <Button>Messages</Button>
        </Badge>

        {/* Overflow count */}
        <Badge count={100} overflowCount={99}>
          <Button>Notifications</Button>
        </Badge>

        {/* Dot badge */}
        <Badge dot>
          <Button>Updates</Button>
        </Badge>

        {/* Show zero */}
        <Badge count={0} showZero>
          <Button>Tasks</Button>
        </Badge>

        {/* Custom text */}
        <Badge text="NEW" color="primary">
          <Button>Features</Button>
        </Badge>

        {/* Different variants */}
        <Badge count={5} color="success">
          <Button>Success</Button>
        </Badge>
        <Badge count={5} color="warning">
          <Button>Warning</Button>
        </Badge>
        <Badge count={5} color="error">
          <Button>Error</Button>
        </Badge>

        {/* Different sizes */}
        <Badge count={5} size="sm">
          <Button>Small</Button>
        </Badge>
        <Badge count={5} size="md">
          <Button>Medium</Button>
        </Badge>
        <Badge count={5} size="lg">
          <Button>Large</Button>
        </Badge>

        {/* With offset */}
        <Badge count={5} offset={[10, 10]}>
          <Button>Offset Badge</Button>
        </Badge>
      </div>
    </section>
  )
}
