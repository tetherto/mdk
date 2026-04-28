import { configureStore } from '@reduxjs/toolkit'
import * as React from 'react'
import { Provider } from 'react-redux'

import { DemoPageHeader } from '../../../components/demo-page-header'
import { actionsSlice, MAINTENANCE_CONTAINER, MinerControlsCard } from '@tetherto/foundation'
import type { ReactElement } from 'react'
import './miner-controls-card-demo.scss'

/**
 * MinerControlsCard Demo
 *
 * Each scenario provides its own Redux store so selectedDevices
 * drives the correct UI branch without touching real state.
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

const createDemoStore = (selectedDevices: any[]) =>
  configureStore({
    reducer: {
      actions: actionsSlice.reducer,
      devices: () => ({
        selectedDevices,
      }),
    },
    devTools: true,
  })

const DemoBlock = ({
  title,
  description,
  devices,
  cardProps = {},
}: {
  title: string
  description: string
  devices: any[]
  cardProps?: Partial<React.ComponentProps<typeof MinerControlsCard>>
}) => (
  <div className="miner-controls-card-demo__section">
    <h3>{title}</h3>
    <p>{description}</p>
    <div className="miner-controls-card-demo__card">
      <Provider store={createDemoStore(devices)}>
        <MinerControlsCard
          buttonsStates={{ isSetUpFrequencyButtonDisabled: false }}
          isLoading={false}
          {...cardProps}
        />
      </Provider>
    </div>
  </div>
)

export const MinerControlsCardDemo = (): ReactElement => {
  return (
    <div className="miner-controls-card-demo">
      <DemoPageHeader
        title="Miner Controls Card"
        description="Action controls for selected miners across different states"
      />

      <div className="miner-controls-card-demo__examples">
        <DemoBlock
          title="Normal — Single Device"
          description="Full controls including Move to Maintenance, Change miner info and Change position"
          devices={[makeMiner()]}
        />

        <DemoBlock
          title="Normal — Multiple Devices"
          description="Single-device-only buttons are hidden when more than one miner is selected"
          devices={[makeMiner(), makeMiner({ id: 'miner-2', code: 'M-SNOW-02' })]}
        />

        <DemoBlock
          title="Loading State"
          description="Spinner shown, all action buttons disabled"
          devices={[makeMiner()]}
          cardProps={{ isLoading: true }}
        />

        <DemoBlock
          title="Maintenance Mode — With MAC"
          description="Change Miner Info, Back from Maintenance and Remove Miner shown. Back from Maintenance is enabled."
          devices={[
            makeMiner({
              info: {
                pos: 'A1',
                container: MAINTENANCE_CONTAINER,
                macAddress: 'aa:bb:cc:dd:ee:ff',
              },
            }),
          ]}
        />

        <DemoBlock
          title="Maintenance Mode — No MAC Address"
          description="Back from Maintenance is disabled with a tooltip prompting to add a MAC address"
          devices={[
            makeMiner({
              info: {
                pos: 'A1',
                container: MAINTENANCE_CONTAINER,
                macAddress: '',
              },
            }),
          ]}
        />

        <DemoBlock
          title="Frequency Button Disabled"
          description="Setup Freq. Settings dropdown is disabled via buttonsStates"
          devices={[makeMiner()]}
          cardProps={{ buttonsStates: { isSetUpFrequencyButtonDisabled: true } }}
        />

        <DemoBlock
          title="Without Power Mode Selector"
          description="Power mode buttons hidden when showPowerModeSelector is false"
          devices={[makeMiner()]}
          cardProps={{ showPowerModeSelector: false }}
        />
      </div>
    </div>
  )
}
