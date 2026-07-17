/**
 * Runnable example for Button.
 */
import { Button } from '@tetherto/mdk-react-devkit'

export const ButtonExample = () => (
  <div className="mdk-example-row">
    <Button variant="primary">Primary</Button>
    <Button variant="secondary">Secondary</Button>
    <Button variant="primary" loading>
      Submitting
    </Button>
    <Button variant="secondary" disabled>
      Disabled
    </Button>
    <Button variant="primary" size="sm">
      Small
    </Button>
    <Button variant="primary" size="lg">
      Large
    </Button>
  </div>
)
