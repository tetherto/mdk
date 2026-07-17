import { MinerChipsCard } from '@tetherto/mdk-react-devkit'

const mockStats = {
  frequency_mhz: {
    chips: [
      { index: 0, current: 620 },
      { index: 1, current: 615 },
    ],
  },
  temperature_c: {
    chips: [
      { index: 0, avg: 65, min: 62, max: 68 },
      { index: 1, avg: 67, min: 64, max: 70 },
    ],
  },
}

export const MinerChipsCardExample = () => (
  <div className="mdk-example-row">
    <MinerChipsCard data={mockStats as never} />
  </div>
)
