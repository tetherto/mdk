/**
 * Runnable example for Radio and RadioGroup.
 */
import { useState } from 'react'
import { Radio, RadioCard, RadioGroup } from '@tetherto/mdk-react-devkit'

export const RadioExample = () => {
  const [plan, setPlan] = useState('standard')
  const [interval, setInterval] = useState('5min')

  return (
    <div className="mdk-example-col">
      <RadioGroup value={plan} onValueChange={setPlan} orientation="vertical">
        <div className="mdk-example-inline">
          <Radio value="basic" color="primary" />
          <span>Basic</span>
        </div>
        <div className="mdk-example-inline">
          <Radio value="standard" color="primary" />
          <span>Standard</span>
        </div>
        <div className="mdk-example-inline">
          <Radio value="pro" color="primary" disabled />
          <span>Pro (unavailable)</span>
        </div>
      </RadioGroup>

      <RadioGroup value={interval} onValueChange={setInterval} orientation="horizontal">
        <RadioCard value="5min" label="5 Min" />
        <RadioCard value="15min" label="15 Min" />
        <RadioCard value="30min" label="30 Min" />
        <RadioCard value="1h" label="1 Hour" />
      </RadioGroup>
    </div>
  )
}
