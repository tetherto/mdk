/**
 * Runnable example for TimelineSelector.
 *
 * Controlled component — owns its `value` and reacts to `onChange`. Pair
 * with `useDashboardTimeRange` from `@tetherto/mdk-react-adapter` in a
 * real dashboard.
 */
import { TimelineSelector } from '@tetherto/mdk-react-devkit'
import { useState } from 'react'

export const TimelineSelectorExample = () => {
  const [value, setValue] = useState('5m')
  return <TimelineSelector value={value} onChange={setValue} />
}
