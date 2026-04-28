import { lazy, Suspense } from 'react'
import { Button, Dialog, DialogContent, DialogFooter, DialogTrigger, Spinner } from '@tetherto/mdk-core-ui'

const ControlledDialog = lazy(() =>
  import('../components/controlled-dialog').then((module) => ({
    default: module.ControlledDialog,
  })),
)

const SectionLoader = (): JSX.Element => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '200px',
    }}
  >
    <Spinner />
  </div>
)

export const DialogPage = (): JSX.Element => {
  return (
    <section className="demo-section">
      <h2 className="demo-section__title">Dialog</h2>
      <div className="demo-section__dialog-grid">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="primary">Open Dialog</Button>
          </DialogTrigger>
          <DialogContent
            closable
            title="Welcome to @tetherto/mdk-core-ui"
            description="This is a dialog component built with Radix UI primitives."
          >
            <div className="demo-section__dialog-content">
              <p>You can add any content here.</p>
            </div>
            <DialogFooter>
              <Button variant="secondary">Cancel</Button>
              <Button variant="primary">Save changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Suspense fallback={<SectionLoader />}>
          <ControlledDialog />
        </Suspense>
      </div>
    </section>
  )
}
