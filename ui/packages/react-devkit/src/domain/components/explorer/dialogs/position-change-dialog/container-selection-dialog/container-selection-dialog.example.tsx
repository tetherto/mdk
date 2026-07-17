import { useState } from 'react'
import { ContainerSelectionDialog } from '@tetherto/mdk-react-devkit'

export const ContainerSelectionDialogExample = () => {
  const [open, setOpen] = useState(false)
  return (
    <div className="mdk-example-row">
      <button onClick={() => setOpen(true)}>Open Container Selection</button>
      <ContainerSelectionDialog
        open={open}
        onClose={() => setOpen(false)}
        containers={[]}
        isLoading={false}
      />
    </div>
  )
}
