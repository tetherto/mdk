/**
 * Runnable example for Checkbox.
 */
import { useState } from 'react'
import { Checkbox, Label } from '@tetherto/mdk-react-devkit'

export const CheckboxExample = () => {
  const [agreed, setAgreed] = useState(false)

  return (
    <div className="mdk-example-col">
      <div className="mdk-example-inline">
        <Checkbox
          id="agree"
          checked={agreed}
          onCheckedChange={(value) => setAgreed(value === true)}
        />
        <Label htmlFor="agree">I agree to the terms</Label>
      </div>
      <div className="mdk-example-inline">
        <Checkbox id="indet" checked="indeterminate" />
        <Label htmlFor="indet">Indeterminate</Label>
      </div>
      <div className="mdk-example-inline">
        <Checkbox id="disabled" disabled />
        <Label htmlFor="disabled">Disabled</Label>
      </div>
    </div>
  )
}
