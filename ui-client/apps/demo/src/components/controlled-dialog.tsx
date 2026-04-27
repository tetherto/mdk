import { Button, Dialog, DialogContent, DialogFooter, DialogTrigger } from '@mdk/core'
import { useState } from 'react'

export const ControlledDialog = (): JSX.Element => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="primary">Open Controlled Dialog</Button>
      </DialogTrigger>
      <DialogContent
        closable
        closeOnClickOutside={true}
        closeOnEscape={true}
        title="This is a controlled dialog"
      >
        <div className="demo-section__dialog-content">
          <p>This is a controlled dialog example.</p>
          <p>You can close it by clicking outside, pressing escape, or using the buttons below.</p>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => setIsOpen(false)}>
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
