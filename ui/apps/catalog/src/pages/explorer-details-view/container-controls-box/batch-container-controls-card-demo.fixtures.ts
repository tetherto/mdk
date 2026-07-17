/**
 * Synthetic fixture builders for the Batch Container Controls Card demo.
 *
 * IMPORTANT — these are mocks, not production guidance. In a real app
 * the page would seed `devicesStore` from a real device fetch (the
 * batch card reads `selectedContainers` directly from the shared
 * Zustand store). Tag strings (`t-bitdeer`, `t-antspace-hydro`,
 * `t-container`, …) live here on purpose — they're fixture inputs to
 * the component, not patterns to copy into real call sites.
 */

import { UNITS } from '@tetherto/mdk-react-devkit/primitives'
import type { TimelineItemData } from '@tetherto/mdk-react-devkit/domain'

export type SelectedContainersMap = Record<string, unknown>

export const makeBitdeerContainer = (overrides: Record<string, unknown> = {}) => ({
  id: 'container-bitdeer-01',
  type: 't-bitdeer',
  code: 'C-BTD-01',
  tags: ['t-container'],
  info: { container: 'CON-BTD-01', pos: 'A1' },
  last: {
    snap: {
      stats: { status: 'running' },
      cooling: {
        exhaust_fan_enabled: true,
        oil_pump: [{ tank: true }, { tank: false }],
      },
    },
  },
  connectedMiners: [],
  ...overrides,
})

export const makeAntspaceHydroContainer = (overrides: Record<string, unknown> = {}) => ({
  id: 'container-antspace-01',
  type: 't-antspace-hydro',
  code: 'C-ANT-01',
  tags: ['t-container'],
  info: { container: 'CON-ANT-01', pos: 'B2' },
  last: {
    snap: {
      stats: { status: 'running', pid_mode: true, running_mode: false },
    },
  },
  connectedMiners: [],
  ...overrides,
})

export const makeAntspaceImmersionContainer = (overrides: Record<string, unknown> = {}) => ({
  id: 'container-immersion-01',
  type: 't-antspace-immersion',
  code: 'C-IMM-01',
  tags: ['t-container'],
  info: { container: 'CON-IMM-01', pos: 'C3' },
  last: {
    snap: {
      stats: { status: 'stopped', pid_mode: false, running_mode: true },
    },
  },
  connectedMiners: [],
  ...overrides,
})

export const makeMicroBTContainer = (overrides: Record<string, unknown> = {}) => ({
  id: 'container-microbt-01',
  type: 't-microbt',
  code: 'C-MBT-01',
  tags: ['t-container'],
  info: { container: 'CON-MBT-01', pos: 'D4' },
  last: {
    snap: {
      stats: { status: 'running' },
    },
  },
  connectedMiners: [],
  ...overrides,
})

export const toRecord = (devices: Record<string, unknown>[]): SelectedContainersMap =>
  Object.fromEntries(devices.map((d) => [d.id as string, d]))

export const makeAlarmItem = (
  status: 'Critical' | 'High' | 'Medium',
  overrides: Partial<TimelineItemData['item']> = {},
): TimelineItemData => ({
  item: {
    title:
      status === 'Critical'
        ? 'High Temperature Alert'
        : status === 'High'
          ? 'Fan Speed Warning'
          : 'Power Fluctuation Notice',
    subtitle:
      status === 'Critical'
        ? 'Container CON-BTD-01 · Slot A1'
        : status === 'High'
          ? 'Container CON-BTD-01 · Slot B3'
          : 'Container CON-BTD-01 · Slot C2',
    body:
      status === 'Critical'
        ? `Triggered at 14:02:31|Threshold: 85${UNITS.TEMPERATURE_C} · Actual: 92${UNITS.TEMPERATURE_C}`
        : status === 'High'
          ? 'Triggered at 13:48:10|Expected: 3200 RPM · Actual: 1800 RPM'
          : 'Triggered at 12:30:00|Voltage drop detected on PDU-2',
    uuid: `uuid-${status}-001`,
    status,
    ...overrides,
  },
  dot: null,
  children: null,
})

export const ALARMS_CRITICAL: TimelineItemData[] = [makeAlarmItem('Critical')]

export const ALARMS_MIXED: TimelineItemData[] = [
  makeAlarmItem('Critical'),
  makeAlarmItem('High'),
  makeAlarmItem('Medium'),
]

export const ALARMS_HIGH_ONLY: TimelineItemData[] = [
  makeAlarmItem('High'),
  makeAlarmItem('High', {
    title: 'Cooling Pump Failure',
    subtitle: 'Container CON-ANT-01 · Slot D4',
    body: 'Triggered at 11:15:44|Pump 2 unresponsive',
    uuid: 'uuid-high-002',
  }),
]

export type Scenario = {
  id: string
  title: string
  description: string
  selectedContainers: SelectedContainersMap
  isBatch?: boolean
  isCompact?: boolean
  alarmsDataItems?: TimelineItemData[]
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'no-selection',
    title: 'No Selection',
    description:
      'No containers selected — only Power Mode selector and empty Active Alarms section.',
    selectedContainers: {},
  },
  {
    id: 'bitdeer-single',
    title: 'Single — Bitdeer (Running, No Alarms)',
    description:
      'One Bitdeer container: Start, Stop, Reset Alarm, Tank toggles, Socket controls. No active alarms.',
    selectedContainers: toRecord([makeBitdeerContainer()]),
    isBatch: false,
  },
  {
    id: 'bitdeer-single-critical',
    title: 'Single — Bitdeer (Running, Critical Alarm)',
    description: 'One Bitdeer container running with one critical temperature alarm.',
    selectedContainers: toRecord([makeBitdeerContainer()]),
    isBatch: false,
    alarmsDataItems: ALARMS_CRITICAL,
  },
  {
    id: 'bitdeer-single-mixed',
    title: 'Single — Bitdeer (Running, Mixed Alarms)',
    description: 'One Bitdeer container with critical, high, and medium severity alarms.',
    selectedContainers: toRecord([makeBitdeerContainer()]),
    isBatch: false,
    alarmsDataItems: ALARMS_MIXED,
  },
  {
    id: 'bitdeer-offline',
    title: 'Single — Bitdeer (Offline, Mixed Alarms)',
    description: 'Offline Bitdeer container — action buttons disabled. Alarms still visible.',
    selectedContainers: toRecord([
      makeBitdeerContainer({
        id: 'container-bitdeer-offline',
        last: { snap: { stats: { status: 'offline' } } },
      }),
    ]),
    isBatch: false,
    alarmsDataItems: ALARMS_MIXED,
  },
  {
    id: 'hydro-single',
    title: 'Single — Antspace Hydro (No Alarms)',
    description: 'One Antspace Hydro container: Start / Stop Cooling and PID Mode switch.',
    selectedContainers: toRecord([makeAntspaceHydroContainer()]),
    isBatch: false,
  },
  {
    id: 'hydro-single-high',
    title: 'Single — Antspace Hydro (High Alarms)',
    description: 'Antspace Hydro with two high severity pump alarms.',
    selectedContainers: toRecord([makeAntspaceHydroContainer()]),
    isBatch: false,
    alarmsDataItems: ALARMS_HIGH_ONLY,
  },
  {
    id: 'immersion-single',
    title: 'Single — Antspace Immersion (No Alarms)',
    description: 'One Antspace Immersion: Cooling, System Status, PID + Running Mode switches.',
    selectedContainers: toRecord([makeAntspaceImmersionContainer()]),
    isBatch: false,
  },
  {
    id: 'immersion-single-mixed',
    title: 'Single — Antspace Immersion (Mixed Alarms)',
    description: 'Antspace Immersion with critical, high and medium alarms active.',
    selectedContainers: toRecord([makeAntspaceImmersionContainer()]),
    isBatch: false,
    alarmsDataItems: ALARMS_MIXED,
  },
  {
    id: 'microbt-single',
    title: 'Single — MicroBT (No Alarms)',
    description: 'One MicroBT container: Start / Stop Cooling and Socket controls.',
    selectedContainers: toRecord([makeMicroBTContainer()]),
    isBatch: false,
  },
  {
    id: 'microbt-single-critical',
    title: 'Single — MicroBT (Critical Alarm)',
    description: 'MicroBT container with one critical alarm.',
    selectedContainers: toRecord([makeMicroBTContainer()]),
    isBatch: false,
    alarmsDataItems: ALARMS_CRITICAL,
  },
  {
    id: 'bitdeer-batch',
    title: 'Batch — Multiple Bitdeer (No Alarms)',
    description:
      'Multiple Bitdeer containers in batch: all buttons enabled, PID/Running Mode hidden.',
    selectedContainers: toRecord([
      makeBitdeerContainer({ id: 'container-bitdeer-01' }),
      makeBitdeerContainer({ id: 'container-bitdeer-02', code: 'C-BTD-02' }),
      makeBitdeerContainer({ id: 'container-bitdeer-03', code: 'C-BTD-03' }),
    ]),
    isBatch: true,
  },
  {
    id: 'bitdeer-batch-mixed',
    title: 'Batch — Multiple Bitdeer (Mixed Alarms)',
    description: 'Multiple Bitdeer containers in batch with all severity alarm types active.',
    selectedContainers: toRecord([
      makeBitdeerContainer({ id: 'container-bitdeer-01' }),
      makeBitdeerContainer({ id: 'container-bitdeer-02', code: 'C-BTD-02' }),
    ]),
    isBatch: true,
    alarmsDataItems: ALARMS_MIXED,
  },
  {
    id: 'hydro-batch',
    title: 'Batch — Multiple Antspace Hydro',
    description: 'Multiple Antspace Hydro in batch: PID Mode hidden, high severity alarms shown.',
    selectedContainers: toRecord([
      makeAntspaceHydroContainer({ id: 'container-antspace-01' }),
      makeAntspaceHydroContainer({ id: 'container-antspace-02', code: 'C-ANT-02' }),
    ]),
    isBatch: true,
    alarmsDataItems: ALARMS_HIGH_ONLY,
  },
  {
    id: 'microbt-batch',
    title: 'Batch — Multiple MicroBT',
    description:
      'Multiple MicroBT containers in batch: Cooling and Socket controls. Critical alarm shown.',
    selectedContainers: toRecord([
      makeMicroBTContainer({ id: 'container-microbt-01' }),
      makeMicroBTContainer({ id: 'container-microbt-02', code: 'C-MBT-02' }),
    ]),
    isBatch: true,
    alarmsDataItems: ALARMS_CRITICAL,
  },
  {
    id: 'mixed-batch',
    title: 'Batch — Mixed Types (No Alarms)',
    description:
      'Mixed container types: type resolves to undefined — only Power Mode and Alarms rendered.',
    selectedContainers: toRecord([
      makeBitdeerContainer({ id: 'container-bitdeer-01' }),
      makeAntspaceHydroContainer({ id: 'container-antspace-01' }),
      makeMicroBTContainer({ id: 'container-microbt-01' }),
    ]),
    isBatch: true,
  },
  {
    id: 'mixed-batch-mixed-alarms',
    title: 'Batch — Mixed Types (Mixed Alarms)',
    description:
      'Mixed container types with all alarm severities — demonstrates alarm list regardless of type.',
    selectedContainers: toRecord([
      makeBitdeerContainer({ id: 'container-bitdeer-01' }),
      makeAntspaceHydroContainer({ id: 'container-antspace-01' }),
    ]),
    isBatch: true,
    alarmsDataItems: ALARMS_MIXED,
  },
]
