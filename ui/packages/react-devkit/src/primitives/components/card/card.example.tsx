/**
 * Runnable example for Card.
 */
import { Button, Card } from '@tetherto/mdk-react-devkit'

export const CardExample = () => (
  <Card className="mdk-example-card">
    <Card.Header>
      <strong>Container 03</strong>
    </Card.Header>
    <Card.Body>
      <p>Power: 31.5 kW</p>
      <p>Hashrate: 102.4 TH/s</p>
    </Card.Body>
    <Card.Footer>
      <Button variant="primary" size="sm">
        Details
      </Button>
    </Card.Footer>
  </Card>
)
