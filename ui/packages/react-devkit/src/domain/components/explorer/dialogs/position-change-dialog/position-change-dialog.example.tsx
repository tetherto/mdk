import { useState } from 'react'
import { PositionChangeDialog } from '@tetherto/mdk-react-devkit'

export const PositionChangeDialogExample = () => {
  const [open, setOpen] = useState(false)
  return (
    <div className="mdk-example-row">
      <button onClick={() => setOpen(true)}>Open Position-Change Dialog</button>
      <PositionChangeDialog open={open} onClose={() => setOpen(false)} />
    </div>
  )
}
