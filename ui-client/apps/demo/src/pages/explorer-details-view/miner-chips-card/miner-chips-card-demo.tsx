import { DemoPageHeader } from '../../../components/demo-page-header'
import type { ContainerStats } from '@tetherto/mdk-foundation-ui'
import { MinerChipsCard } from '@tetherto/mdk-foundation-ui'
import type { ReactElement } from 'react'
import './miner-chips-card-demo.scss'

// Demo data presets
const DEMO_PRESETS = {
  threeChips: {
    frequency_mhz: {
      chips: [
        { index: 0, current: 850 },
        { index: 1, current: 860 },
        { index: 2, current: 855 },
      ],
    },
    temperature_c: {
      chips: [
        { index: 0, avg: 65, min: 60, max: 70 },
        { index: 1, avg: 66, min: 61, max: 71 },
        { index: 2, avg: 64, min: 59, max: 69 },
      ],
    },
  },
  singleChipNormal: {
    frequency_mhz: {
      chips: [{ index: 0, current: 850 }],
    },
    temperature_c: {
      chips: [{ index: 0, avg: 65, min: 60, max: 70 }],
    },
  },
  singleChipHighTemp: {
    frequency_mhz: {
      chips: [{ index: 0, current: 920 }],
    },
    temperature_c: {
      chips: [{ index: 0, avg: 82, min: 78, max: 88 }],
    },
  },
  tenChips: {
    frequency_mhz: {
      chips: Array.from({ length: 10 }, (_, i) => ({
        index: i,
        current: 845 + Math.random() * 30,
      })),
    },
    temperature_c: {
      chips: Array.from({ length: 10 }, (_, i) => ({
        index: i,
        avg: 62 + Math.random() * 15,
        min: 58 + Math.random() * 10,
        max: 68 + Math.random() * 20,
      })),
    },
  },
  variableTemps: {
    frequency_mhz: {
      chips: [
        { index: 0, current: 850 },
        { index: 1, current: 855 },
        { index: 2, current: 860 },
        { index: 3, current: 865 },
      ],
    },
    temperature_c: {
      chips: [
        { index: 0, avg: 55, min: 50, max: 60 },
        { index: 1, avg: 70, min: 65, max: 75 },
        { index: 2, avg: 85, min: 80, max: 90 },
        { index: 3, avg: 62, min: 58, max: 66 },
      ],
    },
  },
  partialData: {
    frequency_mhz: {
      chips: [
        { index: 0, current: 850 },
        { index: 1, current: 860 },
        { index: 2, current: 855 },
      ],
    },
    temperature_c: {
      chips: [
        { index: 0, avg: 65, min: 60, max: 70 },
        { index: 2, avg: 64, min: 59, max: 69 },
      ],
    },
  },
  lowFrequency: {
    frequency_mhz: {
      chips: [
        { index: 0, current: 400 },
        { index: 1, current: 410 },
        { index: 2, current: 405 },
      ],
    },
    temperature_c: {
      chips: [
        { index: 0, avg: 45, min: 40, max: 50 },
        { index: 1, avg: 46, min: 41, max: 51 },
        { index: 2, avg: 44, min: 39, max: 49 },
      ],
    },
  },
} as const

/**
 * Miner Chips Card Demo
 *
 * Interactive demonstration of MinerChipsCard component
 */
export const MinerChipsCardDemo = (): ReactElement => {
  return (
    <div className="miner-chips-card-demo">
      <DemoPageHeader
        title="Miner Chips Card"
        description="Display individual chip frequencies and temperatures"
      />

      <div className="miner-chips-card-demo__examples">
        <div className="miner-chips-card-demo__grid">
          <div className="miner-chips-card-demo__example">
            <h4>3 Chips - Normal Operation</h4>
            <MinerChipsCard data={DEMO_PRESETS.threeChips as unknown as ContainerStats} />
          </div>

          <div className="miner-chips-card-demo__example">
            <h4>Single Chip - High Temperature</h4>
            <MinerChipsCard data={DEMO_PRESETS.singleChipHighTemp as unknown as ContainerStats} />
          </div>

          <div className="miner-chips-card-demo__example">
            <h4>Variable Temperatures</h4>
            <MinerChipsCard data={DEMO_PRESETS.variableTemps as unknown as ContainerStats} />
          </div>

          <div className="miner-chips-card-demo__example">
            <h4>Low Frequency Mode</h4>
            <MinerChipsCard data={DEMO_PRESETS.lowFrequency as unknown as ContainerStats} />
          </div>
        </div>

        <div className="miner-chips-card-demo__section">
          <div className="miner-chips-card-demo__full-width">
            <h4>10 Chips</h4>
            <MinerChipsCard data={DEMO_PRESETS.tenChips as ContainerStats} />
          </div>
        </div>
      </div>
    </div>
  )
}
