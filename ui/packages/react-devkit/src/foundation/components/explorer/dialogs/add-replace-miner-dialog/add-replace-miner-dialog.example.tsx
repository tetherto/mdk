import { useState } from 'react'
import { AddReplaceMinerDialog } from '@tetherto/mdk-react-devkit'

export const AddReplaceMinerDialogExample = () => {
  const [open, setOpen] = useState(false)
  return (
    <div className="mdk-example-row">
      <button onClick={() => setOpen(true)}>Add / Replace Miner</button>
      <AddReplaceMinerDialog open={open} onClose={() => setOpen(false)} />
    </div>
  )
}
