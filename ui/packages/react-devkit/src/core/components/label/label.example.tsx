/**
 * Runnable example for Label.
 */
import { Input, Label } from '@tetherto/mdk-react-devkit'

export const LabelExample = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 320 }}>
      <Label htmlFor="email">Email</Label>
      <Input id="email" type="email" placeholder="you@example.com" />
    </div>
  )
}
