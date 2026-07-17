import { cn, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@primitives'
import type { TimelineOption } from '@tetherto/mdk-ui-foundation'
import { getTimelineOptions } from '@tetherto/mdk-ui-foundation'
import type { JSX } from 'react'

export type TimelineSelectorProps = {
  /** Currently selected timeline value (e.g. `'1m'`, `'5m'`). */
  value: string
  /** Called whenever the user picks a new option. */
  onChange: (next: string) => void
  /**
   * Available options — defaults to {@link getTimelineOptions}. Pass a custom
   * list to localise labels or restrict the range.
   */
  options?: TimelineOption[]
  /** ARIA label / placeholder for the trigger. */
  label?: string
  /** Tailwind/BEM class hook on the trigger. */
  className?: string
}

/**
 * Dropdown for picking the dashboard time range. Wraps `core/Select` and the
 * canonical option list from `getTimelineOptions`. Pair with the
 * `useDashboardTimeRange` hook in `@tetherto/mdk-react-adapter`.
 *
 * @category dashboard
 * @kernelCapability hashrate-monitoring
 * @domain mining-operations
 *
 * @example
 * ```tsx
 * const { timeline, setTimeline, options } = useDashboardTimeRange()
 * return (
 *   <TimelineSelector value={timeline} onChange={setTimeline} options={options} />
 * )
 * ```
 * @tier agent-ready
 */
export const TimelineSelector = ({
  value,
  onChange,
  options,
  label = 'Time range',
  className,
}: TimelineSelectorProps): JSX.Element => {
  const list = options ?? getTimelineOptions()

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn('mdk-timeline-selector', className)} aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {list.map((option) => (
          <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

TimelineSelector.displayName = 'TimelineSelector'
