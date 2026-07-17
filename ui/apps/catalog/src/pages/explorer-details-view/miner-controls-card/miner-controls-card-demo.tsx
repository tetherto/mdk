import { MAINTENANCE_CONTAINER, MinerControlsCard } from '@tetherto/mdk-react-devkit/domain'
import { devicesStore } from '@tetherto/mdk-ui-foundation'
import { useEffect, useMemo, useState } from 'react'
import type { ReactElement } from 'react'

import { DemoPageHeader } from '../../../components/demo-page-header'

import './miner-controls-card-demo.scss'

/**
 * MinerControlsCard Demo
 *
 * The card reads `selectedDevices` from the shared Zustand `devicesStore`.
 * To keep scenarios isolated (and avoid render-order races between blocks
 * sharing a single store), the user picks a scenario from a selector and we
 * seed the store before mounting the card.
 */

const makeMiner = (overrides: Record<string, any> = {}) => ({
  id: 'miner-1',
  model: 'Whatsminer M50',
  type: 'miner-wm',
  rack: 'rack-001',
  code: 'M-SNOW-01',
  tags: ['Production'],
  info: {
    pos: 'A1',
    container: 'CON-BBR-01',
    macAddress: 'aa:bb:cc:dd:ee:ff',
    serialNum: 'SN-12345',
  },
  last: {
    snap: {
      config: { led_status: false, power_mode: 'Normal' },
      stats: {
        miner_specific: { upfreq_speed: 1 },
        status: 'sleeping',
      },
    },
  },
  ...overrides,
})

type Scenario = {
  id: string
  title: string
  description: string
  devices: Record<string, unknown>[]
  cardProps?: Partial<React.ComponentProps<typeof MinerControlsCard>>
}

const SCENARIOS: Scenario[] = [
  {
    id: 'normal-single',
    title: 'Normal — Single Device',
    description:
      'Full controls including Move to Maintenance, Change miner info and Change position.',
    devices: [makeMiner()],
  },
  {
    id: 'normal-multiple',
    title: 'Normal — Multiple Devices',
    description: 'Single-device-only buttons are hidden when more than one miner is selected.',
    devices: [makeMiner(), makeMiner({ id: 'miner-2', code: 'M-SNOW-02' })],
  },
  {
    id: 'loading',
    title: 'Loading State',
    description: 'Spinner shown, all action buttons disabled.',
    devices: [makeMiner()],
    cardProps: { isLoading: true },
  },
  {
    id: 'maintenance-with-mac',
    title: 'Maintenance Mode — With MAC',
    description:
      'Change Miner Info, Back from Maintenance and Remove Miner shown. Back from Maintenance is enabled.',
    devices: [
      makeMiner({
        info: {
          pos: 'A1',
          container: MAINTENANCE_CONTAINER,
          macAddress: 'aa:bb:cc:dd:ee:ff',
        },
      }),
    ],
  },
  {
    id: 'maintenance-no-mac',
    title: 'Maintenance Mode — No MAC Address',
    description: 'Back from Maintenance is disabled with a tooltip prompting to add a MAC address.',
    devices: [
      makeMiner({
        info: { pos: 'A1', container: MAINTENANCE_CONTAINER, macAddress: '' },
      }),
    ],
  },
  {
    id: 'freq-disabled',
    title: 'Frequency Button Disabled',
    description: 'Setup Freq. Settings dropdown is disabled via buttonsStates.',
    devices: [makeMiner()],
    cardProps: { buttonsStates: { isSetUpFrequencyButtonDisabled: true } },
  },
  {
    id: 'no-power-mode',
    title: 'Without Power Mode Selector',
    description: 'Power mode buttons hidden when showPowerModeSelector is false.',
    devices: [makeMiner()],
    cardProps: { showPowerModeSelector: false },
  },
]

export const MinerControlsCardDemo = (): ReactElement => {
  const [activeId, setActiveId] = useState(SCENARIOS[0]!.id)
  const active = useMemo(
    () => SCENARIOS.find((s) => s.id === activeId) ?? SCENARIOS[0]!,
    [activeId],
  )

  useEffect(() => {
    devicesStore.getState().setSelectedDevices(active.devices as never[])
    return () => {
      devicesStore.getState().setSelectedDevices([])
    }
  }, [active])

  return (
    <div className="miner-controls-card-demo">
      <DemoPageHeader
        title="Miner Controls Card"
        description="Action controls for selected miners across different states."
      />

      <div className="miner-controls-card-demo__controls">
        <label htmlFor="miner-controls-scenario">Scenario</label>
        <select
          id="miner-controls-scenario"
          value={activeId}
          onChange={(event) => setActiveId(event.target.value)}
        >
          {SCENARIOS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      </div>

      <div className="miner-controls-card-demo__examples">
        <div className="miner-controls-card-demo__section">
          <h3>{active.title}</h3>
          <p>{active.description}</p>
          <div className="miner-controls-card-demo__card">
            <MinerControlsCard
              buttonsStates={{ isSetUpFrequencyButtonDisabled: false }}
              isLoading={false}
              {...active.cardProps}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
