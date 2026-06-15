import { EnabledDisableToggle } from '@tetherto/mdk-react-devkit'

export const EnabledDisableToggleExample = () => (
  <div className="mdk-example-row">
    <EnabledDisableToggle
      value={true}
      tankNumber={1}
      isButtonDisabled={false}
      isOffline={false}
      onToggle={({ tankNumber, isOn }) => {
        console.warn(`tank ${tankNumber} toggled to ${isOn}`)
      }}
    />
  </div>
)
