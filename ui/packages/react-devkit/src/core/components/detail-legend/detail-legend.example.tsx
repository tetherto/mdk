/**
 * Runnable example for DetailLegend.
 */
import { useState } from 'react'
import { DetailLegend } from '@tetherto/mdk-react-devkit'

const ITEMS = [
  {
    label: 'Hashrate',
    color: '#59E8E8',
    currentValue: { value: 3590, unit: 'TH/s' },
    percentChange: 2.5,
  },
  {
    label: 'Power',
    color: '#FF9500',
    currentValue: { value: 1200, unit: 'W' },
    percentChange: -0.8,
  },
  {
    label: 'Efficiency',
    color: '#A78BFA',
    currentValue: { value: 28.5, unit: 'J/TH' },
    percentChange: 0,
  },
]

export const DetailLegendExample = () => {
  const [hidden, setHidden] = useState<Record<number, boolean>>({})

  const items = ITEMS.map((item, i) => ({ ...item, hidden: !!hidden[i] }))

  return (
    <div className="mdk-example-row" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Interactive — click items to toggle visibility */}
      <DetailLegend
        items={items}
        onToggle={(_, index) => setHidden((prev) => ({ ...prev, [index]: !prev[index] }))}
      />

      {/* Static — no onToggle handler */}
      <DetailLegend
        items={[
          { label: 'Accepted', color: '#4ADE80', currentValue: { value: '98.7', unit: '%' } },
          { label: 'Rejected', color: '#F87171', currentValue: { value: '1.3', unit: '%' } },
        ]}
      />
    </div>
  )
}
