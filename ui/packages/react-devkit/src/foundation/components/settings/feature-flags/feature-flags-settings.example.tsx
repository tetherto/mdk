import { FeatureFlagsSettings } from '@tetherto/mdk-react-devkit'

export const FeatureFlagsSettingsExample = () => (
  <div className="mdk-example-row">
    <FeatureFlagsSettings
      featureFlags={{ 'new-dashboard': true, 'beta-charts': false, 'pool-manager': true }}
      isEditingEnabled={true}
      onSave={(flags) => console.warn('saved flags', flags)}
    />
  </div>
)
