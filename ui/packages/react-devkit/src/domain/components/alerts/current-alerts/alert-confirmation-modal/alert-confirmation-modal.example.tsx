import { useState } from 'react'
import { AlertConfirmationModal } from '@tetherto/mdk-react-devkit'

export const AlertConfirmationModalExample = () => {
  const [open, setOpen] = useState(false)
  return (
    <div className="mdk-example-row">
      <button onClick={() => setOpen(true)}>Clear All Alerts</button>
      <AlertConfirmationModal
        isOpen={open}
        onOk={() => {
          console.warn('confirmed')
          setOpen(false)
        }}
      />
    </div>
  )
}
