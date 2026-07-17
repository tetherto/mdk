import { Heatmap, HeatmapLegend } from '@tetherto/mdk-react-devkit/primitives'
import type { HeatmapCell } from '@tetherto/mdk-react-devkit/primitives'
import type { JSX } from 'react'

import { DemoBlock } from '../components/demo-block'
import { DemoPageHeader } from '../components/demo-page-header'

const grid: HeatmapCell[][] = [
  [{ value: 20 }, { value: 34 }, { value: 48 }, { value: 41 }, { value: 27 }],
  [{ value: 55 }, { value: 68 }, { value: 72 }, { value: null }, { value: 60 }],
  [{ value: 44 }, { value: 81 }, { value: 66 }, { value: 52 }, { value: 30 }],
]

export const HeatmapPage = (): JSX.Element => (
  <div>
    <DemoPageHeader
      title="Heatmap"
      description="A generic grid of value-coloured cells on a low→high gradient, plus a matching HeatmapLegend. Domain-agnostic — pass a matrix of cells and an optional [min, max] range. Use renderCell to overlay domain content (e.g. PDU sockets)."
    />

    <DemoBlock title="Auto range + values" description="Range derived from the data; cell values shown.">
      <Heatmap data={grid} showValues />
    </DemoBlock>

    <DemoBlock title="Legend" description="Gradient scale matching the heatmap colours.">
      <HeatmapLegend label="Temperature" min={20} max={81} unit="°C" />
    </DemoBlock>

    <DemoBlock
      title="Fixed range + custom palette"
      description="Explicit [0, 100] range with a two-stop green→red gradient."
    >
      <Heatmap data={grid} min={0} max={100} colors={['#00a35e', '#c0392b']} showValues />
    </DemoBlock>

    <DemoBlock
      title="renderCell overlay"
      description="Custom cell content while the grid still owns the background colour."
    >
      <Heatmap
        data={grid}
        renderCell={(cell) => <span>{cell.value === null ? '—' : `${cell.value}°`}</span>}
      />
    </DemoBlock>
  </div>
)
