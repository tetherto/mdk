/**
 * Runnable example for Dialog.
 */
import { useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from '@tetherto/mdk-react-devkit'

export const DialogExample = () => {
  const [open, setOpen] = useState(false)

  return (
    <div className="mdk-example-row">
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="secondary">Open Dialog</Button>
        </DialogTrigger>
        <DialogContent
          title="Device Settings"
          description="Adjust configuration for this miner."
          closable
        >
          <p>Dialog body content goes here. Add form fields, tables, or any content.</p>
          <DialogFooter>
            <Button variant="secondary">Cancel</Button>
            <Button variant="primary">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="primary">Controlled Dialog</Button>
        </DialogTrigger>
        <DialogContent
          title="Confirm Action"
          closable
          onClose={() => setOpen(false)}
          closeOnClickOutside={false}
        >
          <p>This dialog cannot be dismissed by clicking outside.</p>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
