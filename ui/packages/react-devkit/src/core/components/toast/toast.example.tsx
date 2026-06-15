/**
 * Runnable example for Toast / Toaster.
 */
import { useState } from 'react'
import { Button, Toast, Toaster } from '@tetherto/mdk-react-devkit'

export const ToastExample = () => {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        Show toast
      </Button>
      <Toaster position="bottom-right">
        <Toast
          open={open}
          onOpenChange={setOpen}
          title="Saved"
          description="Your changes were saved successfully."
          variant="success"
          duration={3000}
        />
      </Toaster>
    </>
  )
}
