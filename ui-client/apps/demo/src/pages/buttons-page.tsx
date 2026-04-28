import { Button } from '@tetherto/mdk-core-ui'
import { PlusIcon } from '@radix-ui/react-icons'

export const ButtonsPage = (): JSX.Element => {
  return (
    <section className="demo-section">
      <h2 className="demo-section__title">Buttons</h2>
      <div className="demo-section__column">
        <div>
          <p className="demo-section__label">Buttons - Default & Hover</p>
          <div className="demo-section__buttons">
            <Button variant="primary">Primary</Button>
            <Button variant="primary" icon={<PlusIcon />} iconPosition="left">
              Primary
            </Button>
            <Button variant="primary" loading />
            <Button variant="danger">Danger</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="secondary" icon={<PlusIcon />} iconPosition="left">
              Secondary
            </Button>
            <Button variant="secondary" loading />
            <Button variant="tertiary">Tertiary</Button>
            <Button variant="link">Link</Button>
            <Button variant="icon" icon={<PlusIcon />} iconPosition="left" />
          </div>
        </div>
        <div>
          <p className="demo-section__label">Buttons - Disabled</p>
          <div className="demo-section__buttons">
            <Button variant="primary" disabled>
              Primary
            </Button>
            <Button variant="primary" icon={<PlusIcon />} iconPosition="left" disabled>
              Primary
            </Button>
            <Button variant="primary" loading disabled />
            <Button variant="danger" disabled>
              Danger
            </Button>
            <Button variant="secondary" disabled>
              Secondary
            </Button>
            <Button variant="secondary" icon={<PlusIcon />} iconPosition="left" disabled>
              Secondary
            </Button>
            <Button variant="secondary" loading disabled />
            <Button variant="tertiary" disabled>
              Tertiary
            </Button>
            <Button variant="link" disabled>
              Link
            </Button>
            <Button variant="icon" disabled icon={<PlusIcon />} iconPosition="left" />
          </div>
        </div>
      </div>
    </section>
  )
}
