import { configureStore } from '@reduxjs/toolkit'
import type { ReactElement, ReactNode } from 'react'
import { Provider } from 'react-redux'

import { DemoPageHeader } from '../../../components/demo-page-header'
import type { DevicesState, TimelineItemData } from '@mdk/foundation'
import { actionsSlice, BatchContainerControlsCard, devicesSlice } from '@mdk/foundation'

import './batch-container-controls-card-demo.scss'

const createDemoStore = (selectedContainers: DevicesState['selectedContainers']) =>
  configureStore({
    reducer: {
      actions: actionsSlice.reducer,
      devices: devicesSlice.reducer,
    },
    preloadedState: {
      devices: {
        selectedContainers,
        selectedDevices: [],
        selectedSockets: {},
        filterTags: [],
        selectedDevicesTags: {},
        selectedLvCabinets: {},
      },
    },
    devTools: true,
  })

const makeBitdeerContainer = (overrides: Record<string, unknown> = {}) => ({
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

const makeAntspaceHydroContainer = (overrides: Record<string, unknown> = {}) => ({
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

const makeAntspaceImmersionContainer = (overrides: Record<string, unknown> = {}) => ({
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

const makeMicroBTContainer = (overrides: Record<string, unknown> = {}) => ({
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

const toRecord = (devices: Record<string, unknown>[]) =>
  Object.fromEntries(devices.map((d) => [d.id, d]))

const makeAlarmItem = (
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
        ? 'Triggered at 14:02:31|Threshold: 85°C · Actual: 92°C'
        : status === 'High'
          ? 'Triggered at 13:48:10|Expected: 3200 RPM · Actual: 1800 RPM'
          : 'Triggered at 12:30:00|Voltage drop detected on PDU-2',
    uuid: `uuid-${status}-001`,
    status,
    ...overrides,
  },
  dot: null as ReactNode,
  children: null as ReactNode,
})

const ALARMS_CRITICAL: TimelineItemData[] = [makeAlarmItem('Critical')]

const ALARMS_MIXED: TimelineItemData[] = [
  makeAlarmItem('Critical'),
  makeAlarmItem('High'),
  makeAlarmItem('Medium'),
]

const ALARMS_HIGH_ONLY: TimelineItemData[] = [
  makeAlarmItem('High'),
  makeAlarmItem('High', {
    title: 'Cooling Pump Failure',
    subtitle: 'Container CON-ANT-01 · Slot D4',
    body: 'Triggered at 11:15:44|Pump 2 unresponsive',
    uuid: 'uuid-high-002',
  }),
]

type DemoBlockProps = {
  title: string
  description: string
  selectedContainers?: DevicesState['selectedContainers']
  isBatch?: boolean
  isCompact?: boolean
  alarmsDataItems?: TimelineItemData[]
}

const DemoBlock = ({
  title,
  description,
  selectedContainers = {},
  isBatch = true,
  isCompact,
  alarmsDataItems = [],
}: DemoBlockProps) => (
  <div className="batch-container-controls-card-demo__section">
    <h3>{title}</h3>
    <p>{description}</p>
    <div className="batch-container-controls-card-demo__card">
      <Provider store={createDemoStore(selectedContainers)}>
        <BatchContainerControlsCard
          isBatch={isBatch}
          isCompact={isCompact}
          alarmsDataItems={alarmsDataItems}
        />
      </Provider>
    </div>
  </div>
)

export const BatchContainerControlsCardDemo = (): ReactElement => {
  return (
    <div className="batch-container-controls-card-demo">
      <DemoPageHeader
        title="Container Controls Card"
        description={
          <>
            Controls card driven by Redux <code>selectedContainers</code> state — title and
            available actions adapt to the selected container types, quantity and active alarms
          </>
        }
      />

      <div className="batch-container-controls-card-demo__examples">
        <DemoBlock
          title="No Selection"
          description="No containers selected — only Power Mode selector and empty Active Alarms section."
          selectedContainers={{}}
        />

        <DemoBlock
          title="Single — Bitdeer (Running, No Alarms)"
          description="One Bitdeer container: Start, Stop, Reset Alarm, Tank toggles, Socket controls. No active alarms."
          selectedContainers={toRecord([makeBitdeerContainer()])}
          isBatch={false}
        />

        <DemoBlock
          title="Single — Bitdeer (Running, Critical Alarm)"
          description="One Bitdeer container running with one critical temperature alarm."
          selectedContainers={toRecord([makeBitdeerContainer()])}
          isBatch={false}
          alarmsDataItems={ALARMS_CRITICAL}
        />

        <DemoBlock
          title="Single — Bitdeer (Running, Mixed Alarms)"
          description="One Bitdeer container with critical, high, and medium severity alarms."
          selectedContainers={toRecord([makeBitdeerContainer()])}
          isBatch={false}
          alarmsDataItems={ALARMS_MIXED}
        />

        <DemoBlock
          title="Single — Bitdeer (Offline, Mixed Alarms)"
          description="Offline Bitdeer container — action buttons disabled. Alarms still visible."
          selectedContainers={toRecord([
            makeBitdeerContainer({
              id: 'container-bitdeer-offline',
              last: { snap: { stats: { status: 'offline' } } },
            }),
          ])}
          isBatch={false}
          alarmsDataItems={ALARMS_MIXED}
        />

        <DemoBlock
          title="Single — Antspace Hydro (No Alarms)"
          description="One Antspace Hydro container: Start / Stop Cooling and PID Mode switch."
          selectedContainers={toRecord([makeAntspaceHydroContainer()])}
          isBatch={false}
        />

        <DemoBlock
          title="Single — Antspace Hydro (High Alarms)"
          description="Antspace Hydro with two high severity pump alarms."
          selectedContainers={toRecord([makeAntspaceHydroContainer()])}
          isBatch={false}
          alarmsDataItems={ALARMS_HIGH_ONLY}
        />

        <DemoBlock
          title="Single — Antspace Immersion (No Alarms)"
          description="One Antspace Immersion: Cooling, System Status, PID + Running Mode switches."
          selectedContainers={toRecord([makeAntspaceImmersionContainer()])}
          isBatch={false}
        />

        <DemoBlock
          title="Single — Antspace Immersion (Mixed Alarms)"
          description="Antspace Immersion with critical, high and medium alarms active."
          selectedContainers={toRecord([makeAntspaceImmersionContainer()])}
          isBatch={false}
          alarmsDataItems={ALARMS_MIXED}
        />

        <DemoBlock
          title="Single — MicroBT (No Alarms)"
          description="One MicroBT container: Start / Stop Cooling and Socket controls."
          selectedContainers={toRecord([makeMicroBTContainer()])}
          isBatch={false}
        />

        <DemoBlock
          title="Single — MicroBT (Critical Alarm)"
          description="MicroBT container with one critical alarm."
          selectedContainers={toRecord([makeMicroBTContainer()])}
          isBatch={false}
          alarmsDataItems={ALARMS_CRITICAL}
        />

        <DemoBlock
          title="Batch — Multiple Bitdeer (No Alarms)"
          description="Multiple Bitdeer containers in batch: all buttons enabled, PID/Running Mode hidden."
          selectedContainers={toRecord([
            makeBitdeerContainer({ id: 'container-bitdeer-01' }),
            makeBitdeerContainer({ id: 'container-bitdeer-02', code: 'C-BTD-02' }),
            makeBitdeerContainer({ id: 'container-bitdeer-03', code: 'C-BTD-03' }),
          ])}
          isBatch
        />

        <DemoBlock
          title="Batch — Multiple Bitdeer (Mixed Alarms)"
          description="Multiple Bitdeer containers in batch with all severity alarm types active."
          selectedContainers={toRecord([
            makeBitdeerContainer({ id: 'container-bitdeer-01' }),
            makeBitdeerContainer({ id: 'container-bitdeer-02', code: 'C-BTD-02' }),
          ])}
          isBatch
          alarmsDataItems={ALARMS_MIXED}
        />

        <DemoBlock
          title="Batch — Multiple Antspace Hydro"
          description="Multiple Antspace Hydro in batch: PID Mode hidden, high severity alarms shown."
          selectedContainers={toRecord([
            makeAntspaceHydroContainer({ id: 'container-antspace-01' }),
            makeAntspaceHydroContainer({ id: 'container-antspace-02', code: 'C-ANT-02' }),
          ])}
          isBatch
          alarmsDataItems={ALARMS_HIGH_ONLY}
        />

        <DemoBlock
          title="Batch — Multiple MicroBT"
          description="Multiple MicroBT containers in batch: Cooling and Socket controls. Critical alarm shown."
          selectedContainers={toRecord([
            makeMicroBTContainer({ id: 'container-microbt-01' }),
            makeMicroBTContainer({ id: 'container-microbt-02', code: 'C-MBT-02' }),
          ])}
          isBatch
          alarmsDataItems={ALARMS_CRITICAL}
        />

        <DemoBlock
          title="Batch — Mixed Types (No Alarms)"
          description="Mixed container types: type resolves to undefined — only Power Mode and Alarms rendered."
          selectedContainers={toRecord([
            makeBitdeerContainer({ id: 'container-bitdeer-01' }),
            makeAntspaceHydroContainer({ id: 'container-antspace-01' }),
            makeMicroBTContainer({ id: 'container-microbt-01' }),
          ])}
          isBatch
        />

        <DemoBlock
          title="Batch — Mixed Types (Mixed Alarms)"
          description="Mixed container types with all alarm severities — demonstrates alarm list regardless of type."
          selectedContainers={toRecord([
            makeBitdeerContainer({ id: 'container-bitdeer-01' }),
            makeAntspaceHydroContainer({ id: 'container-antspace-01' }),
          ])}
          isBatch
          alarmsDataItems={ALARMS_MIXED}
        />
      </div>
    </div>
  )
}
