import { DEVICE_EXPLORER_DEVICE_TYPE, ExplorerDetail } from '@tetherto/mdk-react-devkit'
import { devicesStore } from '@tetherto/mdk-ui-foundation'
import { useEffect } from 'react'

// Synthetic placeholder selection — the panel reads the shared `devicesStore`,
// so the example seeds one container and clears it again on unmount.
const SAMPLE_CONTAINER = {
  id: 'container-demo-1',
  type: 'container-bd-d40-m56',
  info: { container: 'demo-1a' },
}

export const ExplorerDetailExample = () => {
  useEffect(() => {
    devicesStore.getState().setResetSelections()
    devicesStore.getState().selectContainer(SAMPLE_CONTAINER as never)
    return () => devicesStore.getState().setResetSelections()
  }, [])

  return (
    <div className="mdk-example-row">
      <ExplorerDetail deviceType={DEVICE_EXPLORER_DEVICE_TYPE.CONTAINER} />
    </div>
  )
}
