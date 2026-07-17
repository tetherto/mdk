/**
 * Runnable example for Switch.
 */
import { useState } from 'react'
import { Label, Switch } from '@tetherto/mdk-react-devkit'

export const SwitchExample = () => {
  const [enabled, setEnabled] = useState(true)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Switch id="notify" checked={enabled} onCheckedChange={setEnabled} />
        <Label htmlFor="notify">Enable notifications</Label>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Switch id="disabled" disabled />
        <Label htmlFor="disabled">Disabled</Label>
      </div>
    </div>
  )
}
