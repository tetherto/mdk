import { RemoveMinerDialog } from '@tetherto/mdk-react-devkit'

export const RemoveMinerDialogExample = () => (
  <div className="mdk-example-row">
    <RemoveMinerDialog isRemoveMinerFlow={true} onCancel={() => console.warn('cancelled')} />
  </div>
)
