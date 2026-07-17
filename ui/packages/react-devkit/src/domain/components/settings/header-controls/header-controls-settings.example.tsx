import { HeaderControlsSettings } from '@tetherto/mdk-react-devkit'

export const HeaderControlsSettingsExample = () => (
  <div className="mdk-example-row">
    <HeaderControlsSettings
      preferences={{ sticky: true, showTimezone: true } as never}
      onToggle={(key, value) => console.warn(key, value)}
      onReset={() => console.warn('reset')}
    />
  </div>
)
