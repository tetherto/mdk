import { ImportExportSettings } from '@tetherto/mdk-react-devkit'

export const ImportExportSettingsExample = () => (
  <div className="mdk-example-row">
    <ImportExportSettings
      onExport={() => console.warn('export')}
      onImport={(data) => console.warn('import', data)}
    />
  </div>
)
