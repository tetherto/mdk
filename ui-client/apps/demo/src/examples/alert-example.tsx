import { CoreAlert as Alert, Button } from '@tetherto/mdk-core-ui'
import type { ReactElement } from 'react'

export const AlertExample = (): ReactElement => {
  return (
    <section className="demo-section">
      <h2 className="demo-section__title">Alert</h2>
      <section className="demo-section__alerts">
        {/* All Types */}
        <section>
          <h3>All Types</h3>
          <div className="demo-section__alerts--content">
            <Alert type="success" title="Success Text" />
            <Alert type="info" title="Info Text" />
            <Alert type="warning" title="Warning Text" />
            <Alert type="error" title="Error Text" />
          </div>
        </section>

        {/* With Icons */}
        <section>
          <h3>With Icons</h3>
          <div className="demo-section__alerts--content">
            <Alert type="success" title="Success Tips" showIcon />
            <Alert type="info" title="Informational Notes" showIcon />
            <Alert type="warning" title="Warning" showIcon />
            <Alert type="error" title="Error" showIcon />
          </div>
        </section>

        {/* Closable */}
        <section>
          <h3>Closable</h3>
          <div className="demo-section__alerts--content">
            <Alert type="success" title="Success Title" closable />
            <Alert type="info" title="Info Title" closable />
            <Alert type="warning" title="Warning Title" closable />
            <Alert type="error" title="Error Title" closable />
          </div>
        </section>

        {/* With Description */}
        <section>
          <h3>With Description</h3>
          <div className="demo-section__alerts--content">
            <Alert
              type="success"
              title="Success Text"
              description="Success Description Success Description Success Description"
              showIcon
            />
            <Alert
              type="info"
              title="Info Text"
              description="Info Description Info Description Info Description"
              showIcon
            />
            <Alert
              type="warning"
              title="Warning Text"
              description="Warning Description Warning Description Warning Description"
              showIcon
            />
            <Alert
              type="error"
              title="Error Text"
              description="Error Description Error Description Error Description"
              showIcon
            />
          </div>
        </section>

        {/* With Action */}
        <section>
          <h3>With Action</h3>
          <div className="demo-section__alerts--content">
            <Alert
              type="success"
              title="Success Tips"
              showIcon
              action={<Button variant="link">UNDO</Button>}
              closable
            />
            <Alert
              type="warning"
              title="Warning Text"
              action={<Button variant="link">Done</Button>}
              closable
            />
            <Alert
              type="error"
              title="Error Text"
              description="Error Description Error Description Error Description"
              showIcon
              action={<Button>Details</Button>}
            />
          </div>
        </section>

        {/* Banner */}
        <section>
          <h3>Banner</h3>
          <div className="demo-section__alerts--content">
            <Alert type="warning" title="Warning text" banner />
            <Alert type="error" title="Error text" banner />
            <Alert type="info" title="Info text" banner showIcon />
            <Alert type="success" title="Success text" banner closable />
          </div>
        </section>

        {/* No Title (description only) */}
        <section>
          <h3>Description Only</h3>
          <div className="demo-section__alerts--content">
            <Alert
              type="info"
              description="This is a standalone description without a title."
              showIcon
            />
            <Alert
              type="warning"
              description="Something might need your attention here."
              showIcon
              closable
            />
          </div>
        </section>
      </section>
    </section>
  )
}
