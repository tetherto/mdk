import type { RangeSelectorOption } from '@mdk/core'

type DropdownItem = {
  key: string
  label: string
}

type DropdownGroup = {
  key: string
  type: string
  label: string
  children: DropdownItem[]
}

type TimelineParam = {
  isOneMinEnabled: boolean
  isShort: boolean
}

export const shortTimelineRadioButtons: RangeSelectorOption[] = [
  { value: '30m', label: '30 Min' },
  { value: '3h', label: '3 H' },
  { value: '1D', label: '1 D' },
]

export const longTimelineRadioButtons: RangeSelectorOption[] = [{ value: '1D', label: '1D' }]

export const timelineRadioButtons: RangeSelectorOption[] = [
  { value: '5m', label: '5 Min' },
  ...shortTimelineRadioButtons,
]

export const oneMinuteTimeLineRadioButton: RangeSelectorOption[] = [
  { value: '1m', label: '1 Min' },
  ...timelineRadioButtons,
]

export const getTimelineRadioButtons = ({
  isOneMinEnabled,
  isShort,
}: Partial<TimelineParam>): RangeSelectorOption[] => {
  if (isShort) return shortTimelineRadioButtons
  if (isOneMinEnabled) return [{ value: '1m', label: '1 Min' }, ...timelineRadioButtons]
  return timelineRadioButtons
}

export const timelineDropdownItems: DropdownGroup[] = [
  {
    key: 'minutes',
    type: 'group',
    label: 'Minutes',
    children: [
      { key: '15min', label: '15 minutes' },
      { key: '30min', label: '30 minutes' },
      { key: '45min', label: '45 minutes' },
    ],
  },
  {
    key: 'hours',
    type: 'group',
    label: 'Hours',
    children: [
      { key: '1h', label: '1 hour' },
      { key: '6h', label: '6 hours' },
      { key: '12h', label: '12 hours' },
    ],
  },
  {
    key: 'days',
    type: 'group',
    label: 'Days',
    children: [
      { key: '1d', label: '1 day' },
      { key: '7d', label: '1 week' },
      { key: '30d', label: '1 month' },
      { key: '90d', label: '3 months' },
    ],
  },
]
