import {
  BitMainImmersionSummaryBox,
  ContainerWidgets,
  MicroBTWidgetBox,
  SupplyLiquidBox,
  TanksBox,
} from '@tetherto/mdk-react-devkit/domain'
import type { ContainerWidgetItem, Device } from '@tetherto/mdk-react-devkit/domain'
import { UNITS } from '@tetherto/mdk-react-devkit/primitives'
import type { JSX } from 'react'

import { DemoBlock } from '../components/demo-block'
import { DemoPageHeader } from '../components/demo-page-header'

const summary = [
  { label: 'Hash Rate', value: `1.24 ${UNITS.HASHRATE_PH_S}` },
  { label: 'Max Temp', value: `72 ${UNITS.TEMPERATURE_C}` },
  { label: 'Avg Temp', value: `65 ${UNITS.TEMPERATURE_C}` },
  { label: 'Efficiency', value: `32.5 ${UNITS.EFFICIENCY_W_PER_TH_S}` },
]

// Synthetic demo data only — no real device names, sites, or telemetry. The
// vendor boxes read a `Device` (or shaped data); these fixtures mirror the
// shapes the container-widgets data hook will supply per model.
const hydroDevice = {
  last: { snap: { stats: { status: 'running', container_specific: {
    supply_liquid_temp: 38,
    supply_liquid_set_temp: 40,
    supply_liquid_pressure: 2.1,
  } } } },
} as unknown as Device

const microBtDevice = {
  last: { snap: { stats: { status: 'running', container_specific: {
    cdu: { circulation_pump_running_status: 'running', cooling_fan_control: true },
  } } } },
} as unknown as Device

const immersionDevice = {
  last: { snap: { stats: { status: 'running', container_specific: {
    primary_supply_temp: 42,
    second_supply_temp1: 39,
    second_supply_temp2: 41,
    second_pump1: true,
    second_pump2: true,
    one_pump: true,
  } } } },
} as unknown as Device

const tanksData = {
  oil_pump: [
    { cold_temp_c: 44, enabled: true },
    { cold_temp_c: 46, enabled: true },
  ],
  water_pump: [{ enabled: true }, { enabled: true }],
  pressure: [{ value: 2.4 }, { value: 2.6 }],
}

const containers: ContainerWidgetItem[] = [
  {
    id: 'container-a',
    title: 'Container A',
    power: 412_000,
    powerUnit: UNITS.POWER_KW,
    summary,
    activity: { total: 210, online: 200, offline: 8, faulted: 2 },
    vendorContent: <TanksBox data={tanksData} />,
  },
  {
    id: 'container-b',
    title: 'Container B',
    power: 388_500,
    powerUnit: UNITS.POWER_KW,
    summary,
    activity: { total: 210, online: 205, offline: 5 },
    vendorContent: <SupplyLiquidBox data={hydroDevice} />,
  },
  {
    id: 'container-c',
    title: 'Container C (critical)',
    power: 421_000,
    powerUnit: UNITS.POWER_KW,
    summary,
    activity: { total: 210, online: 190, offline: 20 },
    flash: true,
    vendorContent: <MicroBTWidgetBox data={microBtDevice} />,
  },
  {
    id: 'container-d',
    title: 'Container D',
    power: 402_100,
    powerUnit: UNITS.POWER_KW,
    summary,
    activity: { total: 210, online: 198, offline: 12 },
    vendorContent: <BitMainImmersionSummaryBox data={immersionDevice} />,
  },
  { id: 'container-e', title: 'Container E', isOffline: true, summary: [] },
]

export const ContainerWidgetsPage = (): JSX.Element => (
  <div>
    <DemoPageHeader
      title="Container Widgets"
      description="Site Overview → Container Widgets: the read-only grid of per-container summary cards. Each card renders the top row (title / alarms / power), an optional per-model vendor box, a miners summary, and an activity chart. Purely presentational — the shell page feeds it the shaped containers array from the data hook."
    />

    <DemoBlock
      title="Grid with per-model vendor boxes"
      description="One card per container. The vendor-box slot carries the model-specific box. Card C is flashing to show the critical-high alarm state."
    >
      <ContainerWidgets containers={containers} />
    </DemoBlock>

    <DemoBlock title="Loading" description="First-load spinner while the data hook resolves.">
      <ContainerWidgets containers={[]} isLoading />
    </DemoBlock>

    <DemoBlock title="Empty" description="No containers match the current filters.">
      <ContainerWidgets containers={[]} />
    </DemoBlock>

    <DemoBlock title="Error" description="The data hook failed; the grid is replaced by the message.">
      <ContainerWidgets containers={[]} errorMessage="Failed to reach the container worker." />
    </DemoBlock>
  </div>
)
