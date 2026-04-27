import type { ComponentType } from 'react'

import { FluidAlarm } from './icons/fluid-alarm'
import { OtherAlarm } from './icons/other-alarm'
import { PressureAlarm } from './icons/pressure-alarm'
import { TemperatureAlarm } from './icons/temperature-alarm'

export type AlarmPropKey = 'liquidAlarms' | 'leakageAlarms' | 'pressureAlarms' | 'otherAlarms'

export type WidgetAlarmItem = {
  title: string
  propKey: AlarmPropKey
  Icon: ComponentType<Partial<{ width: number; height: number }>>
}

export const WIDGET_ALARMS: WidgetAlarmItem[] = [
  {
    title: 'Liquid',
    propKey: 'liquidAlarms',
    Icon: TemperatureAlarm,
  },
  {
    title: 'Leakage',
    propKey: 'leakageAlarms',
    Icon: FluidAlarm,
  },
  {
    title: 'Pressure',
    propKey: 'pressureAlarms',
    Icon: PressureAlarm,
  },
  {
    title: 'Other',
    propKey: 'otherAlarms',
    Icon: OtherAlarm,
  },
]
