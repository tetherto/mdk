import { useState } from 'react'
import { ChangeConfirmationModal } from '@tetherto/mdk-react-devkit'

export const ChangeConfirmationModalExample = () => {
  const [open, setOpen] = useState(false)
  return (
    <div className="mdk-example-row">
      <button onClick={() => setOpen(true)}>Confirm Change</button>
      <ChangeConfirmationModal
        open={open}
        title="Apply Configuration Changes?"
        onConfirm={() => {
          console.warn('confirmed')
          setOpen(false)
        }}
        onClose={() => setOpen(false)}
        confirmText="Apply"
      >
        This will update pool assignments for 12 devices.
      </ChangeConfirmationModal>
    </div>
  )
}
