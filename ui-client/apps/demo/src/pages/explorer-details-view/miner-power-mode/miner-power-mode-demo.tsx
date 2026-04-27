import { DemoPageHeader } from '../../../components/demo-page-header'
import type { Device } from '@mdk/foundation'
import { MinerPowerModeSelectionButtons } from '@mdk/foundation'
import type { ReactElement } from 'react'

import { useDemoToast } from '../../../utils/use-demo-toast'
import './miner-power-mode-demo.scss'

/**
 * MinerPowerModeSelectionButtons & Buttons Demo
 * Interactive demonstration of selection buttons.
 */
export const MinerPowerModeDemo = (): ReactElement => {
  const { showToast, ToasterSlot } = useDemoToast()

  const singleModelDevices: Device[] = [
    {
      id: '1',
      model: 'Whatsminer M50',
      info: { pos: 'A-01', container: 'CONT-01' },
      type: 'miner-wm',
      last: { snap: { stats: { status: 'sleeping' }, config: { power_mode: 'Normal' } } },
    },
    {
      id: '2',
      model: 'Whatsminer M50',
      info: { pos: 'A-02', container: 'CONT-01' },
      type: 'miner-wm',
      last: { snap: { stats: { status: 'sleeping' }, config: { power_mode: 'Normal' } } },
    },
  ]

  const handleSetPowerMode = (devices: Device[], mode: string) => {
    showToast(`Action: Set ${mode} for ${devices.length} devices of model ${devices[0]?.model}`, {
      variant: 'info',
    })
  }

  return (
    <div className="miner-power-mode-demo">
      <DemoPageHeader
        title="Miner Power Mode"
        description="Demonstrating Selection Button components."
      />

      <div className="miner-power-mode-demo__examples">
        <div className="miner-power-mode-demo__section">
          <p className="description">
            These buttons group the selection automatically and provide dropdowns for each model.
          </p>

          <div className="demo-group">
            <h3>Single Model Group</h3>
            <MinerPowerModeSelectionButtons
              selectedDevices={singleModelDevices}
              setPowerMode={handleSetPowerMode}
              connectedMiners={singleModelDevices}
            />
          </div>

          <div className="demo-group">
            <h3>Disabled State</h3>
            <MinerPowerModeSelectionButtons
              disabled
              selectedDevices={singleModelDevices}
              setPowerMode={handleSetPowerMode}
            />
          </div>
        </div>
      </div>
      <ToasterSlot />
    </div>
  )
}
