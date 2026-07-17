import { MaintenanceDialogContent } from '@tetherto/mdk-react-devkit'

export const MaintenanceDialogContentExample = () => (
  <div className="mdk-example-row">
    <MaintenanceDialogContent selectedEditSocket={{}} onCancel={() => console.warn('cancelled')} />
  </div>
)
