/**
 * Runnable example for Label.
 */
import { Input, Label } from '@tetherto/mdk-react-devkit'

export const LabelExample = () => {
  return (
    <div className="mdk-example-col mdk-example-col--gap-sm mdk-example-col--narrow">
      <Label htmlFor="email">Email</Label>
      <Input id="email" type="email" placeholder="you@example.com" />
    </div>
  )
}
