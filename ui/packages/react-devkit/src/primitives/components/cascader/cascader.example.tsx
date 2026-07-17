/**
 * Runnable example for Cascader.
 */
import { useState } from 'react'
import { Cascader } from '@tetherto/mdk-react-devkit'
import type { CascaderValue } from '@tetherto/mdk-react-devkit'

const poolOptions = [
  {
    value: 'foundry',
    label: 'Foundry',
    children: [
      { value: 'eu-primary', label: 'EU Primary' },
      { value: 'us-east', label: 'US East' },
      { value: 'asia', label: 'Asia Pacific' },
    ],
  },
  {
    value: 'antpool',
    label: 'AntPool',
    children: [
      { value: 'btc', label: 'BTC' },
      { value: 'ltc', label: 'LTC' },
    ],
  },
]

export const CascaderExample = () => {
  const [single, setSingle] = useState<CascaderValue>(['foundry', 'eu-primary'])
  const [multi, setMulti] = useState<CascaderValue[]>([
    ['foundry', 'eu-primary'],
    ['antpool', 'btc'],
  ])

  return (
    <div className="mdk-example-col">
      <Cascader
        options={poolOptions}
        value={single}
        onChange={(value) => setSingle(value as CascaderValue)}
        placeholder="Select pool..."
      />
      <Cascader
        options={poolOptions}
        value={multi}
        onChange={(value) => setMulti(value as CascaderValue[])}
        multiple
        placeholder="Select pools..."
      />
    </div>
  )
}
