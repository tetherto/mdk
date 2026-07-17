import { useState } from 'react'
import { ReportTimeFrameSelector } from '@tetherto/mdk-react-devkit'

export const ReportTimeFrameSelectorExample = () => {
  const [preset, setPreset] = useState<number | null>(30)
  const now = new Date()
  const [range, setRange] = useState<[Date, Date]>([now, now])
  return (
    <div className="mdk-example-row">
      <ReportTimeFrameSelector
        presetTimeFrame={preset}
        dateRange={range}
        setPresetTimeFrame={setPreset}
        setDateRange={setRange}
      />
    </div>
  )
}
