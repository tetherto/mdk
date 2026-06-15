/**
 * Runnable example for Input.
 */
import { useState } from 'react'
import { Input } from '@tetherto/mdk-react-devkit'

export const InputExample = () => {
  const [value, setValue] = useState('')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 320 }}>
      <Input
        id="mac"
        label="MAC address"
        placeholder="AA:BB:CC:00:00:01"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <Input variant="search" placeholder="Search miners" />
      <Input prefix="$" suffix="USD" placeholder="0.00" />
      <Input label="Invalid" error="Must be a hex string" defaultValue="abc" />
    </div>
  )
}
