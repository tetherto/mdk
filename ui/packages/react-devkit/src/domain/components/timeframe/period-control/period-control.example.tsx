import { usePeriod } from '@tetherto/mdk-react-adapter'
import type { SearchParamsState } from '@tetherto/mdk-react-adapter'
import { PeriodControl } from '@tetherto/mdk-react-devkit'
import { useState } from 'react'

// In an app, pass react-router's `useSearchParams()`; this demo keeps the
// query string in state so it runs without a router.
const useDemoSearchParams = (): SearchParamsState => {
  const [params, setParams] = useState(() => new URLSearchParams())
  return [params, (next) => setParams((prev) => next(prev))]
}

export const PeriodControlExample = () => {
  const period = usePeriod(useDemoSearchParams(), 'UTC', { preset: '30d' })
  return (
    <div className="mdk-example-row">
      <PeriodControl state={period} timezone="UTC" />
    </div>
  )
}
